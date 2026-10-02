import { Module } from '@nestjs/common';

import { OpenAiRecognizer } from '../recognition/openai-recognizer.js';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, OpenAiRecognizer],
})
export class DocumentsModule {}
