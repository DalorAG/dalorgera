import { Module } from '@nestjs/common';

import { WarrantyRequestsModule } from '../warranty-requests/warranty-requests.module.js';
import { LuxuryItemsController } from './luxury-items.controller.js';
import { LuxuryItemsService } from './luxury-items.service.js';
import { MarketValueEstimator } from './market-value-estimator.js';

@Module({
  imports: [WarrantyRequestsModule],
  controllers: [LuxuryItemsController],
  providers: [LuxuryItemsService, MarketValueEstimator],
})
export class LuxuryItemsModule {}
