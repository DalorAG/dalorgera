import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { LUXURY_CATEGORIES, type LuxuryCategory } from '../warranty-requests/warranty-requests.dto.js';

/** Photos plus the Rechnung. */
export const MAX_LUXURY_PHOTOS = 12;

export class CreateLuxuryItemDto {
  @ApiProperty({ enum: LUXURY_CATEGORIES })
  @IsIn(LUXURY_CATEGORIES)
  category: LuxuryCategory;

  @ApiProperty({ example: 'Rolex' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  brand: string;

  @ApiProperty({ example: 'Submariner' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  model: string;

  @ApiPropertyOptional({ example: 1250000, description: 'Current value (Aktueller Wert) stated by the user, in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  valueCents?: number | null;

  @ApiPropertyOptional({ example: 980000, description: 'Kaufpreis in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  purchasePriceCents?: number | null;

  @ApiPropertyOptional({ example: '2024-05-17' })
  @IsOptional()
  @IsDateString({ strict: true })
  purchaseDate?: string | null;

  @ApiPropertyOptional({ example: 'Wempe, Hamburg' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  store?: string | null;

  @ApiPropertyOptional({ example: '126610LN', description: 'Referenz- or Artikelnummer' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  referenceNumber?: string | null;

  @ApiPropertyOptional({ description: 'Box und Papiere vorhanden' })
  @IsOptional()
  @IsBoolean()
  hasBoxPapers?: boolean;

  @ApiPropertyOptional({ example: '7K3L9P21' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  serialNumber?: string | null;

  @ApiPropertyOptional({ example: 'Box und Papiere vorhanden' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @ApiPropertyOptional({ type: [String], description: 'Uploaded documents to attach: photos and the Rechnung (kind invoice)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_LUXURY_PHOTOS)
  @IsUUID('all', { each: true })
  documentIds?: string[];
}

/** documentIds are added to the existing photos; photos are removed with DELETE /documents/:id. */
export class UpdateLuxuryItemDto extends PartialType(CreateLuxuryItemDto) {}

export class RequestInsuranceDto {
  @ApiPropertyOptional({ example: 'Bitte auch gegen Verlust auf Reisen.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}

export class EstimateMarketValueDto {
  @ApiPropertyOptional({ enum: ['de', 'en', 'ru'], default: 'de', description: 'Language of the summary' })
  @IsOptional()
  @IsIn(['de', 'en', 'ru'])
  language?: 'de' | 'en' | 'ru';
}
