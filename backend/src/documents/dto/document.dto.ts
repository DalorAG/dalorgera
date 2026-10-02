import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

import { PaginationQuery } from '../../common/pagination.dto.js';
import { Constants, type Enums } from '../../supabase/database.types.js';

export const DOCUMENT_KINDS = Constants.public.Enums.document_kind;
export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

/** Allowed upload types and their file extensions (must match the bucket config). */
export const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
} as const;
export type DocumentMimeType = keyof typeof MIME_EXTENSIONS;
const MIME_TYPES = Object.keys(MIME_EXTENSIONS) as DocumentMimeType[];

export class CreateUploadUrlDto {
  @ApiProperty({ enum: MIME_TYPES, example: 'image/jpeg' })
  @IsIn(MIME_TYPES)
  mimeType: DocumentMimeType;
}

export class CreateDocumentDto {
  @ApiProperty({ description: 'Path returned by POST /documents/upload-url' })
  @IsString()
  storagePath: string;

  @ApiProperty({ enum: DOCUMENT_KINDS, example: 'receipt' })
  @IsIn(DOCUMENT_KINDS)
  kind: Enums<'document_kind'>;

  @ApiProperty({ enum: MIME_TYPES })
  @IsIn(MIME_TYPES)
  mimeType: DocumentMimeType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_DOCUMENT_BYTES)
  sizeBytes?: number;

  @ApiPropertyOptional({ description: 'Attach to a device right away' })
  @IsOptional()
  @IsUUID()
  deviceId?: string;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional({ enum: DOCUMENT_KINDS })
  @IsOptional()
  @IsIn(DOCUMENT_KINDS)
  kind?: Enums<'document_kind'>;

  @ApiPropertyOptional({ nullable: true, description: 'Device id, or null to detach' })
  @IsOptional()
  @IsUUID()
  deviceId?: string | null;
}

export class ListDocumentsQuery extends PaginationQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional({ enum: DOCUMENT_KINDS })
  @IsOptional()
  @IsIn(DOCUMENT_KINDS)
  kind?: Enums<'document_kind'>;
}
