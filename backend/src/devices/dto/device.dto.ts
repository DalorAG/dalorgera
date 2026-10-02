import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { PaginationQuery } from '../../common/pagination.dto.js';

export class CreateDeviceDto {
  @ApiProperty({ example: 'iPhone 15' })
  @IsString()
  @Length(1, 120)
  name: string;

  @ApiPropertyOptional({ example: 'Smartphone' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @ApiPropertyOptional({ example: 'Apple' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  brand?: string;

  @ApiPropertyOptional({ example: 'TechnikMarkt' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  store?: string;

  @ApiProperty({ example: '2023-09-12', description: 'Date of purchase (YYYY-MM-DD)' })
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  purchaseDate: string;

  @ApiPropertyOptional({ example: 94900, description: 'Price in cents' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceCents?: number;

  @ApiPropertyOptional({ example: 'EUR', default: 'EUR' })
  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @ApiPropertyOptional({ example: 24, default: 24, description: 'Manufacturer warranty (Garantie), 0 = none' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(240)
  warrantyMonths?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateDeviceDto extends PartialType(CreateDeviceDto) {}

export const DEVICE_STATUSES = ['active', 'expiring', 'expired'] as const;
export type DeviceStatus = (typeof DEVICE_STATUSES)[number];

export class ListDevicesQuery extends PaginationQuery {
  @ApiPropertyOptional({ enum: DEVICE_STATUSES })
  @IsOptional()
  @IsIn(DEVICE_STATUSES)
  status?: DeviceStatus;
}
