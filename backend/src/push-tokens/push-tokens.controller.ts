import { Body, Controller, Delete, HttpCode, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsIn, IsString, Matches, MaxLength } from 'class-validator';

import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators.js';
import { toHttpError } from '../common/db-error.js';
import { SupabaseService } from '../supabase/supabase.service.js';

const PLATFORMS = ['ios', 'android', 'web'] as const;

export class RegisterPushTokenDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @IsString()
  @MaxLength(255)
  @Matches(/^Expo(nent)?PushToken\[.+\]$/)
  token: string;

  @ApiProperty({ enum: PLATFORMS })
  @IsIn(PLATFORMS)
  platform: (typeof PLATFORMS)[number];
}

@ApiTags('push-tokens')
@ApiBearerAuth()
@Controller('push-tokens')
export class PushTokensController {
  constructor(private readonly supabase: SupabaseService) {}

  /** Called by the app after it obtained an Expo push token. Idempotent. */
  @Put()
  @HttpCode(204)
  async register(@CurrentUser() user: AuthUser, @Body() dto: RegisterPushTokenDto): Promise<void> {
    const { error } = await this.supabase
      .forUser(user.accessToken)
      .from('push_tokens')
      .upsert({ token: dto.token, platform: dto.platform, user_id: user.id }, { onConflict: 'token' });
    if (error) throw toHttpError(error);
  }

  /** Called on sign-out. */
  @Delete(':token')
  @HttpCode(204)
  async unregister(@CurrentUser() user: AuthUser, @Param('token') token: string): Promise<void> {
    const { error } = await this.supabase.forUser(user.accessToken).from('push_tokens').delete().eq('token', token);
    if (error) throw toHttpError(error);
  }
}
