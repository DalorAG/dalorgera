import { Injectable, Logger } from '@nestjs/common';

import type { AuthUser } from '../auth/auth.types.js';
import { toHttpError, unwrap } from '../common/db-error.js';
import { DOCUMENTS_BUCKET, SupabaseService } from '../supabase/supabase.service.js';
import type { TablesInsert } from '../supabase/database.types.js';
import { EXPIRING_WITHIN_DAYS, toDeviceInsert, toDeviceResponse } from './device.mapper.js';
import type { CreateDeviceDto, ListDevicesQuery, UpdateDeviceDto } from './dto/device.dto.js';

const SELECT = '*, documents(count)';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async list(user: AuthUser, query: ListDevicesQuery) {
    let q = this.supabase
      .forUser(user.accessToken)
      .from('devices')
      .select(SELECT)
      .order('protected_until', { ascending: true })
      .range(query.offset, query.offset + query.limit - 1);

    const today = new Date();
    const soon = new Date(today.getTime() + EXPIRING_WITHIN_DAYS * 86_400_000);
    if (query.status === 'expired') q = q.lt('protected_until', isoDate(today));
    if (query.status === 'expiring') q = q.gte('protected_until', isoDate(today)).lte('protected_until', isoDate(soon));
    if (query.status === 'active') q = q.gt('protected_until', isoDate(soon));

    return unwrap(await q).map((row) => toDeviceResponse(row));
  }

  async get(user: AuthUser, id: string) {
    const row = unwrap(await this.supabase.forUser(user.accessToken).from('devices').select(SELECT).eq('id', id).single());
    return toDeviceResponse(row);
  }

  async create(user: AuthUser, dto: CreateDeviceDto) {
    const row = unwrap(
      await this.supabase
        .forUser(user.accessToken)
        .from('devices')
        .insert({ ...toDeviceInsert(dto), user_id: user.id } as TablesInsert<'devices'>)
        .select(SELECT)
        .single(),
    );
    return toDeviceResponse(row);
  }

  async update(user: AuthUser, id: string, dto: UpdateDeviceDto) {
    const row = unwrap(
      await this.supabase
        .forUser(user.accessToken)
        .from('devices')
        .update(toDeviceInsert(dto))
        .eq('id', id)
        .select(SELECT)
        .single(),
    );
    return toDeviceResponse(row);
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    const db = this.supabase.forUser(user.accessToken);
    const docs = unwrap(await db.from('documents').select('storage_path').eq('device_id', id));
    const { data, error } = await db.from('devices').delete().eq('id', id).select('id');
    if (error) throw toHttpError(error);
    if (!data.length) throw toHttpError({ code: 'PGRST116', message: 'not found' });

    // Document rows are removed by the FK cascade; the files must be removed explicitly.
    if (docs.length) {
      const { error: storageError } = await db.storage.from(DOCUMENTS_BUCKET).remove(docs.map((d) => d.storage_path));
      if (storageError) this.logger.warn(`Orphaned files for device ${id}: ${storageError.message}`);
    }
  }
}
