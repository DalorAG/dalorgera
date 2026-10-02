import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import type { AuthUser } from './auth.types.js';
import { CurrentUser } from './decorators.js';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  @Get()
  me(@CurrentUser() user: AuthUser) {
    return { id: user.id, email: user.email, isAnonymous: user.isAnonymous };
  }
}
