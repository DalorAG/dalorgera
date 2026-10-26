import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators.js';
import { toHttpError, unwrap } from '../common/db-error.js';
import { PaginationQuery } from '../common/pagination.dto.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import {
  DEFAULT_REMINDER_SETTINGS,
  ReminderSettingsDto,
} from './reminder-settings.dto.js';

@ApiTags('reminders')
@ApiBearerAuth()
@Controller('reminders')
export class RemindersController {
  constructor(private readonly supabase: SupabaseService) {}

  /** Upcoming reminders, e.g. for a "Demnächst" list in the app. */
  @Get()
  async upcoming(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQuery,
  ) {
    const rows = unwrap(
      await this.supabase
        .forUser(user.accessToken)
        .from('reminders')
        .select(
          'id, device_id, kind, days_before, due_date, remind_at, devices(name)',
        )
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

  /** When reminders go out; the defaults until the user changed them. */
  @Get('settings')
  async settings(@CurrentUser() user: AuthUser): Promise<ReminderSettingsDto> {
    const { data: row, error } = await this.supabase
      .forUser(user.accessToken)
      .from('reminder_settings')
      .select('days_before, hour')
      .maybeSingle();
    if (error) throw toHttpError(error);
    return row
      ? { daysBefore: row.days_before, hour: row.hour }
      : DEFAULT_REMINDER_SETTINGS;
  }

  /** Saving rebuilds the pending reminders of every device (database trigger). */
  @Put('settings')
  async updateSettings(
    @CurrentUser() user: AuthUser,
    @Body() dto: ReminderSettingsDto,
  ): Promise<ReminderSettingsDto> {
    const daysBefore = [...dto.daysBefore].sort((a, b) => b - a);
    unwrap(
      await this.supabase
        .forUser(user.accessToken)
        .from('reminder_settings')
        .upsert({
          user_id: user.id,
          days_before: daysBefore,
          hour: dto.hour,
          updated_at: new Date().toISOString(),
        })
        .select('user_id')
        .single(),
    );
    return { daysBefore, hour: dto.hour };
  }
}
