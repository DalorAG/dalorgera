import { HttpException, HttpStatus } from '@nestjs/common';

import type { Db } from '../supabase/supabase.service.js';
import { toHttpError } from './db-error.js';

export type AiCallKind = 'recognize' | 'identify' | 'market_value';

/**
 * Counts one paid OpenAI call against the user's daily quota (database function consume_ai_quota)
 * and refuses with 429 once it is used up, so a script cannot run up the bill.
 */
export async function consumeAiQuota(db: Db, kind: AiCallKind): Promise<void> {
  const { data, error } = await db.rpc('consume_ai_quota', { call_kind: kind });
  if (error) throw toHttpError(error);
  if (!data) {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: 'AI_QUOTA_EXCEEDED',
        message: 'Daily limit for this feature reached',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
