import { Injectable } from '@nestjs/common';

import type { AuthUser } from '../auth/auth.types.js';
import { unwrap } from '../common/db-error.js';
import type { Tables } from '../supabase/database.types.js';
import { SupabaseService } from '../supabase/supabase.service.js';

const COLUMNS = 'id, store, title, description, badge, url, image_url, accent, icon, valid_until';

type ResponseRow = Pick<
  Tables<'deals'>,
  'id' | 'store' | 'title' | 'description' | 'badge' | 'url' | 'image_url' | 'accent' | 'icon' | 'valid_until'
>;

function toResponse(row: ResponseRow) {
  return {
    id: row.id,
    store: row.store,
    title: row.title,
    description: row.description,
    badge: row.badge,
    url: row.url,
    imageUrl: row.image_url,
    accent: row.accent,
    icon: row.icon,
    validUntil: row.valid_until,
  };
}

@Injectable()
export class DealsService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(user: AuthUser) {
    const rows = unwrap(
      await this.supabase
        .forUser(user.accessToken)
        .from('deals')
        .select(COLUMNS)
        .order('sort')
        .order('created_at'),
    );
    return rows.map(toResponse);
  }
}
