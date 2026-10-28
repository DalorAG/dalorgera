import { Injectable } from '@nestjs/common';

import type { AuthUser } from '../auth/auth.types.js';
import { toHttpError, unwrap } from '../common/db-error.js';
import type { Tables } from '../supabase/database.types.js';
import { SupabaseService } from '../supabase/supabase.service.js';

const COLUMNS = 'id, store, title, description, conditions, badge, url, image_url, accent, icon, category, valid_until';

type ResponseRow = Pick<
  Tables<'deals'>,
  'id' | 'store' | 'title' | 'description' | 'conditions' | 'badge' | 'url' | 'image_url' | 'accent' | 'icon' | 'category' | 'valid_until'
>;

function toResponse(row: ResponseRow, saved: boolean) {
  return {
    id: row.id,
    store: row.store,
    title: row.title,
    description: row.description,
    conditions: row.conditions,
    badge: row.badge,
    url: row.url,
    imageUrl: row.image_url,
    accent: row.accent,
    icon: row.icon,
    category: row.category,
    validUntil: row.valid_until,
    saved,
  };
}

@Injectable()
export class DealsService {
  constructor(private readonly supabase: SupabaseService) {}

  /** Running deals; RLS hides expired ones and other users' saves. */
  async list(user: AuthUser) {
    const db = this.supabase.forUser(user.accessToken);
    const [deals, saves] = await Promise.all([
      db.from('deals').select(COLUMNS).order('sort').order('created_at'),
      db.from('deal_saves').select('deal_id'),
    ]);
    const saved = new Set(unwrap(saves).map((s) => s.deal_id));
    return unwrap(deals).map((row) => toResponse(row, saved.has(row.id)));
  }

  /** Puts the deal on the user's Merkliste; saving twice is fine. */
  async save(user: AuthUser, dealId: string) {
    const { error } = await this.supabase
      .forUser(user.accessToken)
      .from('deal_saves')
      .upsert({ user_id: user.id, deal_id: dealId }, { onConflict: 'user_id,deal_id', ignoreDuplicates: true });
    if (error) throw toHttpError(error);
  }

  async unsave(user: AuthUser, dealId: string) {
    const { error } = await this.supabase.forUser(user.accessToken).from('deal_saves').delete().eq('deal_id', dealId);
    if (error) throw toHttpError(error);
  }
}
