import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const MAX_BATCH = 100;

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
};

type PushTicket = { status: 'ok'; id: string } | { status: 'error'; message: string; details?: { error?: string } };

/** Minimal client for the Expo push service (batches of max. 100 messages). */
@Injectable()
export class ExpoPushClient {
  private readonly logger = new Logger(ExpoPushClient.name);
  private readonly accessToken?: string;

  constructor(config: ConfigService<Env, true>) {
    this.accessToken = config.get('EXPO_ACCESS_TOKEN', { infer: true });
  }

  /** Sends messages and returns tokens Expo reported as no longer registered. Throws on transport errors. */
  async send(messages: PushMessage[]): Promise<{ invalidTokens: string[] }> {
    const invalidTokens: string[] = [];
    for (let i = 0; i < messages.length; i += MAX_BATCH) {
      const batch = messages.slice(i, i + MAX_BATCH);
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...(this.accessToken ? { authorization: `Bearer ${this.accessToken}` } : {}),
        },
        body: JSON.stringify(batch),
      });
      if (!res.ok) throw new Error(`Expo push failed with HTTP ${res.status}`);

      const { data } = (await res.json()) as { data: PushTicket[] };
      data.forEach((ticket, idx) => {
        if (ticket.status === 'ok') return;
        if (ticket.details?.error === 'DeviceNotRegistered') invalidTokens.push(batch[idx].to);
        else this.logger.warn(`Push to ${batch[idx].to} failed: ${ticket.message}`);
      });
    }
    return { invalidTokens };
  }
}
