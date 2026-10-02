import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './auth/auth.module.js';
import { validateEnv } from './config/env.js';
import { DevicesModule } from './devices/devices.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { HealthController } from './health/health.controller.js';
import { PushTokensModule } from './push-tokens/push-tokens.module.js';
import { RemindersModule } from './reminders/reminders.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    SupabaseModule,
    AuthModule,
    DevicesModule,
    DocumentsModule,
    RemindersModule,
    PushTokensModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
