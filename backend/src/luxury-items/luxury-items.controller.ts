import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators.js';
import { CreateLuxuryItemDto, RequestInsuranceDto, UpdateLuxuryItemDto } from './luxury-items.dto.js';
import { LuxuryItemsService } from './luxury-items.service.js';

@ApiTags('luxury-items')
@ApiBearerAuth()
@Controller('luxury-items')
export class LuxuryItemsController {
  constructor(private readonly items: LuxuryItemsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.items.list(user);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.items.get(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLuxuryItemDto) {
    return this.items.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLuxuryItemDto) {
    return this.items.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.items.remove(user, id);
  }

  /** Asks our team to insure the item; they are notified by email with all photos. */
  @Post(':id/insurance-request')
  requestInsurance(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RequestInsuranceDto) {
    return this.items.requestInsurance(user, id, dto);
  }
}
