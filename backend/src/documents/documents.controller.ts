import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators.js';
import { DocumentsService } from './documents.service.js';
import { CreateDocumentDto, CreateUploadUrlDto, ListDocumentsQuery, UpdateDocumentDto } from './dto/document.dto.js';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Step 1: get a signed URL and upload the photo directly to Storage' })
  createUploadUrl(@CurrentUser() user: AuthUser, @Body() dto: CreateUploadUrlDto) {
    return this.documents.createUploadUrl(user, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Step 2: register the uploaded photo (receipt, warranty card, ...)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDocumentDto) {
    return this.documents.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListDocumentsQuery) {
    return this.documents.list(user, query);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDocumentDto) {
    return this.documents.update(user, id, dto);
  }

  @Post(':id/recognize')
  @ApiOperation({ summary: 'Read merchant, date, products and prices from the photo (OpenAI)' })
  recognize(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.documents.recognize(user, id);
  }

  @Get(':id/url')
  downloadUrl(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.documents.downloadUrl(user, id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.documents.remove(user, id);
  }
}
