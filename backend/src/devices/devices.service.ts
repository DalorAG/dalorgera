import { Injectable, Logger } from '@nestjs/common';

import type { AuthUser } from '../auth/auth.types.js';
import { toHttpError, unwrap } from '../common/db-error.js';
import { DOCUMENTS_BUCKET, SupabaseService } from '../supabase/supabase.service.js';
import type { TablesInsert } from '../supabase/database.types.js';
import { EXPIRING_WITHIN_DAYS, toDeviceInsert, toDeviceResponse } from './device.mapper.js';
import type { CreateDeviceDto, ListDevicesQuery, UpdateDeviceDto } from './dto/device.dto.js';

// devices and documents are linked both ways (documents.device_id, devices.source_document_id),
// so the embeds name their foreign key.
const SELECT = '*, documents!documents_device_id_user_id_fkey(count), source:documents!devices_source_document_fkey(device_id)';

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
    if (query.kind) q = q.eq('kind', query.kind);

    return unwrap(await q).map((row) => toDeviceResponse(row));
  }

  async get(user: AuthUser, id: string) {
    const row = unwrap(await this.supabase.forUser(user.accessToken).from('devices').select(SELECT).eq('id', id).single());
    return toDeviceResponse(row);
  }

  /** With quantity > 1 all devices are inserted in one statement: either all or none (plan limit). Returns the first. */
  async create(user: AuthUser, dto: CreateDeviceDto) {
    const quantity = dto.quantity ?? 1;
    const base = { ...toDeviceInsert(dto), user_id: user.id } as TablesInsert<'devices'>;
    const rows =
      quantity === 1
        ? [base]
        : Array.from({ length: quantity }, (_, i) => {
            const suffix = ` (${i + 1}/${quantity})`;
            return { ...base, name: dto.name.slice(0, 120 - suffix.length) + suffix };
          });
    const created = unwrap(
      await this.supabase.forUser(user.accessToken).from('devices').insert(rows).select(SELECT).order('name'),
    );
    const first = created.find((r) => r.name === rows[0].name) ?? created[0];
    return toDeviceResponse(first);
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
