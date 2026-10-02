import { Module } from '@nestjs/common';

import { ExpoPushClient } from './expo-push.client.js';
import { RemindersController } from './reminders.controller.js';
import { RemindersWorker } from './reminders.worker.js';

@Module({
  controllers: [RemindersController],
  providers: [ExpoPushClient, RemindersWorker],
})
export class RemindersModule {}
