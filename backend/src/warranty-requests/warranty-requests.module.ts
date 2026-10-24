import { Module } from '@nestjs/common';

import { WarrantyRequestMailer } from './warranty-request.mailer.js';
import { WarrantyRequestsController } from './warranty-requests.controller.js';
import { WarrantyRequestsService } from './warranty-requests.service.js';

@Module({
  controllers: [WarrantyRequestsController],
  providers: [WarrantyRequestsService, WarrantyRequestMailer],
  exports: [WarrantyRequestMailer],
})
export class WarrantyRequestsModule {}
