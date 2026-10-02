import { BadRequestException, Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';

import { toHttpError } from '../common/db-error.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { AuthUser } from './auth.types.js';
import { CurrentUser } from './decorators.js';
import { CURRENT_TERMS_VERSION } from './terms.js';

export class AcceptTermsDto {
  @ApiProperty({ example: CURRENT_TERMS_VERSION, description: 'The version the user has read' })
  @IsString()
  version: string;
}

@ApiTags('auth')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  async me(@CurrentUser() user: AuthUser) {
    const { data, error } = await this.supabase
      .forUser(user.accessToken)
      .from('terms_acceptances')
      .select('accepted_at')
      .eq('version', CURRENT_TERMS_VERSION)
      .maybeSingle();
    if (error) throw toHttpError(error);

    return {
      id: user.id,
      email: user.email,
      isAnonymous: user.isAnonymous,
      terms: { currentVersion: CURRENT_TERMS_VERSION, accepted: !!data, acceptedAt: data?.accepted_at ?? null },
    };
  }

  /** Records consent to the current terms. Idempotent. */
  @Post('terms')
  @HttpCode(204)
  async acceptTerms(@CurrentUser() user: AuthUser, @Body() dto: AcceptTermsDto): Promise<void> {
    if (dto.version !== CURRENT_TERMS_VERSION) throw new BadRequestException('Outdated terms version');
    const { error } = await this.supabase
      .forUser(user.accessToken)
      .from('terms_acceptances')
      .upsert({ user_id: user.id, version: dto.version }, { onConflict: 'user_id,version', ignoreDuplicates: true });
    if (error) throw toHttpError(error);
  }
}
