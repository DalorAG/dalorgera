import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators.js';
import { DealsService } from './deals.service.js';

@ApiTags('deals')
@ApiBearerAuth()
@Controller('deals')
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  /** Running Aktionen of Austrian shops for the Übersicht, with the user's Merkliste flag; RLS hides expired ones. */
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.deals.list(user);
  }

  @Put(':id/save')
  @HttpCode(204)
  save(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.deals.save(user, id);
  }

  @Delete(':id/save')
  @HttpCode(204)
  unsave(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.deals.unsave(user, id);
  }
}
