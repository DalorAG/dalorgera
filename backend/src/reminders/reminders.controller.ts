import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators.js';
import { unwrap } from '../common/db-error.js';
import { PaginationQuery } from '../common/pagination.dto.js';
import { SupabaseService } from '../supabase/supabase.service.js';

@ApiTags('reminders')
@ApiBearerAuth()
@Controller('reminders')
export class RemindersController {
  constructor(private readonly supabase: SupabaseService) {}

  /** Upcoming reminders, e.g. for a "Demnächst" list in the app. */
  @Get()
  async upcoming(@CurrentUser() user: AuthUser, @Query() query: PaginationQuery) {
    const rows = unwrap(
      await this.supabase
        .forUser(user.accessToken)
        .from('reminders')
        .select('id, device_id, kind, days_before, due_date, remind_at, devices(name)')
        .is('sent_at', null)
        .order('remind_at', { ascending: true })
        .range(query.offset, query.offset + query.limit - 1),
    );
    return rows.map((r) => ({
      id: r.id,
      deviceId: r.device_id,
      deviceName: r.devices?.name ?? null,
      kind: r.kind,
      daysBefore: r.days_before,
      dueDate: r.due_date,
      remindAt: r.remind_at,
    }));
  }
}
