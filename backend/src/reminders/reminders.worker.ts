import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

import type { Env } from '../config/env.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { ExpoPushClient, type PushMessage } from './expo-push.client.js';
import { reminderMessage } from './reminder-message.js';

const BATCH_SIZE = 100;

/**
 * Sends due reminders as push notifications.
 *
 * `claim_due_reminders` locks rows with SKIP LOCKED and marks them as sent in
 * one statement, so any number of API instances can run this job in parallel
 * without sending duplicates.
 */
@Injectable()
export class RemindersWorker {
  private readonly logger = new Logger(RemindersWorker.name);
  private readonly enabled: boolean;
  private running = false;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly push: ExpoPushClient,
    config: ConfigService<Env, true>,
  ) {
    this.enabled = config.get('REMINDERS_WORKER_ENABLED', { infer: true });
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async tick(): Promise<void> {
    const db = this.supabase.admin;
    if (!this.enabled || !db || this.running) return;
    this.running = true;
    try {
      let claimed: number;
      do {
        claimed = await this.processBatch();
      } while (claimed === BATCH_SIZE);
    } catch (err) {
      this.logger.error(`Reminder run failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  private async processBatch(): Promise<number> {
    const db = this.supabase.admin!;
    const { data: due, error } = await db.rpc('claim_due_reminders', { batch_size: BATCH_SIZE });
    if (error) throw new Error(error.message);
    if (!due.length) return 0;

    const userIds = [...new Set(due.map((r) => r.user_id))];
    const { data: tokens, error: tokenError } = await db.from('push_tokens').select('token, user_id').in('user_id', userIds);
    if (tokenError) throw new Error(tokenError.message);

    const messages: PushMessage[] = due.flatMap((r) =>
      tokens
        .filter((t) => t.user_id === r.user_id)
        .map((t) => ({
          to: t.token,
          sound: 'default' as const,
          ...reminderMessage(r),
          data: { deviceId: r.device_id, kind: r.kind },
        })),
    );

    try {
      const { invalidTokens } = await this.push.send(messages);
      if (invalidTokens.length) await db.from('push_tokens').delete().in('token', invalidTokens);
    } catch (err) {
      // Release the claimed reminders so the next run retries them.
      await db.from('reminders').update({ sent_at: null }).in('id', due.map((r) => r.id));
      throw err;
    }

    this.logger.log(`Sent ${messages.length} push notifications for ${due.length} reminders`);
    return due.length;
  }
}
