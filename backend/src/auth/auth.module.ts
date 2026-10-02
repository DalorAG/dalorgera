import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { MeController } from './me.controller.js';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';

/** Sign-up / sign-in happen in the app via Supabase Auth; the API only verifies tokens. */
@Module({
  controllers: [MeController],
  providers: [{ provide: APP_GUARD, useClass: SupabaseAuthGuard }],
})
export class AuthModule {}
