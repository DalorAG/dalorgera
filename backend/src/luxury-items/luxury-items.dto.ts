import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

import { LUXURY_CATEGORIES, type LuxuryCategory } from '../warranty-requests/warranty-requests.dto.js';

export const MAX_LUXURY_PHOTOS = 10;

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

  @ApiPropertyOptional({ example: 1250000, description: 'Value stated by the user, in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  valueCents?: number | null;

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

  @ApiPropertyOptional({ type: [String], description: 'Uploaded documents to attach as photos' })
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
