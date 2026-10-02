import { Module } from '@nestjs/common';

import { PushTokensController } from './push-tokens.controller.js';

@Module({ controllers: [PushTokensController] })
export class PushTokensModule {}
