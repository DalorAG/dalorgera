import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

export const REQUEST_KINDS = ['extension', 'luxury'] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

export const LUXURY_CATEGORIES = ['watch', 'jewelry', 'bag', 'other'] as const;
export type LuxuryCategory = (typeof LUXURY_CATEGORIES)[number];

export class CreateWarrantyRequestDto {
  @ApiPropertyOptional({ enum: REQUEST_KINDS, default: 'extension', description: 'Garantieverlängerung or Luxus-Versicherung' })
  @IsOptional()
  @IsIn(REQUEST_KINDS)
  kind?: RequestKind;

  @ApiPropertyOptional({ description: 'Receipt the purchase is on; store, date and price are taken from it' })
  @IsOptional()
  @IsUUID()
  documentId?: string;

  @ApiProperty({ example: 'Abendkleid', description: 'For luxury items the model, e.g. Submariner' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  productName: string;

  @ApiPropertyOptional({ example: 'Gibt es eine Versicherung gegen Flecken und Risse?' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;

  @ApiPropertyOptional({ enum: LUXURY_CATEGORIES, description: 'Required for luxury requests' })
  @ValidateIf((o: CreateWarrantyRequestDto) => o.kind === 'luxury' || o.category !== undefined)
  @IsIn(LUXURY_CATEGORIES)
  category?: LuxuryCategory;

  @ApiPropertyOptional({ example: 'Rolex' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  brand?: string;

  @ApiPropertyOptional({ example: '7K3L9P21' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  serialNumber?: string;

  @ApiPropertyOptional({ example: 1250000, description: 'Value stated by the user, in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  valueCents?: number;
}
