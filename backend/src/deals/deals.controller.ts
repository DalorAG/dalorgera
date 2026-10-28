import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators.js';
import { DealsService } from './deals.service.js';

@ApiTags('deals')
@ApiBearerAuth()
@Controller('deals')
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  /** Running Aktionen of Austrian shops for the Übersicht; RLS hides expired ones. */
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.deals.list(user);
  }
}
