import { Module } from '@nestjs/common';

import { WarrantyRequestsModule } from '../warranty-requests/warranty-requests.module.js';
import { LuxuryItemsController } from './luxury-items.controller.js';
import { LuxuryItemsService } from './luxury-items.service.js';

@Module({
  imports: [WarrantyRequestsModule],
  controllers: [LuxuryItemsController],
  providers: [LuxuryItemsService],
})
export class LuxuryItemsModule {}
