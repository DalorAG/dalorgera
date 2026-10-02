import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Env } from '../config/env.js';
import type { Database } from './database.types.js';

export type Db = SupabaseClient<Database>;

export const DOCUMENTS_BUCKET = 'documents';

const serverAuth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly url: string;
  private readonly publishableKey: string;
  private readonly adminClient: Db | null;

  constructor(config: ConfigService<Env, true>) {
    this.url = config.get('SUPABASE_URL', { infer: true });
    this.publishableKey = config.get('SUPABASE_PUBLISHABLE_KEY', { infer: true });
    const secretKey = config.get('SUPABASE_SECRET_KEY', { infer: true });
    this.adminClient = secretKey ? createClient<Database>(this.url, secretKey, { auth: serverAuth }) : null;
    if (!this.adminClient) this.logger.warn('SUPABASE_SECRET_KEY is not set, background jobs are disabled');
  }

  get projectUrl(): string {
    return this.url;
  }

  /**
   * Client that acts as the signed-in user. Row Level Security applies, so a
   * bug in the API can never leak another user's data.
   */
  forUser(accessToken: string): Db {
    return createClient<Database>(this.url, this.publishableKey, {
      auth: serverAuth,
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
  }

  /** Bypasses RLS. Only for trusted background jobs. */
  get admin(): Db | null {
    return this.adminClient;
  }
}
