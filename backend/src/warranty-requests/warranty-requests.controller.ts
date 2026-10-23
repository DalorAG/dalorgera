import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators.js';
import { CreateWarrantyRequestDto } from './warranty-requests.dto.js';
import { WarrantyRequestsService } from './warranty-requests.service.js';

@ApiTags('warranty-requests')
@ApiBearerAuth()
@Controller('warranty-requests')
export class WarrantyRequestsController {
  constructor(private readonly requests: WarrantyRequestsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.requests.list(user);
  }

  /** Asks our team for an extended warranty or insurance; they are notified by email. */
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWarrantyRequestDto) {
    return this.requests.create(user, dto);
  }
}
