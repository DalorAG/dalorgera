import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';

import { toHttpError } from '../common/db-error.js';
import { DOCUMENTS_BUCKET, SupabaseService } from '../supabase/supabase.service.js';
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
  private readonly logger = new Logger(MeController.name);

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

  /**
   * Deletes the account (DSGVO Art. 17). Files are removed first; all table rows
   * go with the auth user through ON DELETE CASCADE.
   * The app must sign out afterwards: existing access tokens stay valid until they expire.
   */
  @Delete()
  @HttpCode(204)
  async deleteAccount(@CurrentUser() user: AuthUser): Promise<void> {
    const admin = this.supabase.admin;
    if (!admin) throw new ServiceUnavailableException('Account deletion is not configured');

    // Remove every file in the user's folder, including uploads never registered as documents.
    const bucket = admin.storage.from(DOCUMENTS_BUCKET);
    for (;;) {
      const { data: files, error } = await bucket.list(user.id, { limit: 100 });
      if (error) throw toHttpError({ message: error.message });
      if (!files.length) break;
      const { error: removeError } = await bucket.remove(files.map((f) => `${user.id}/${f.name}`));
      if (removeError) throw toHttpError({ message: removeError.message });
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw toHttpError({ message: deleteError.message });
    this.logger.log(`Deleted account ${user.id}`);
  }
}
