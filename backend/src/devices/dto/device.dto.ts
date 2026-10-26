import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  MinLength,
  Min,
  ValidateIf,
} from 'class-validator';

import { PaginationQuery } from '../../common/pagination.dto.js';
import { Constants, type Enums } from '../../supabase/database.types.js';

export const DEVICE_KINDS = Constants.public.Enums.device_kind;
export type DeviceKind = Enums<'device_kind'>;

/** Identical devices created from one Beleg line at once. */
export const MAX_QUANTITY = 100;

export class CreateDeviceDto {
  @ApiPropertyOptional({
    enum: DEVICE_KINDS,
    default: 'warranty',
    description:
      'statutory = Gewährleistung only, warranty = Garantie, maintenance = recurring Wartung, vignette = Autobahnvignette',
  })
  @IsOptional()
  @IsIn(DEVICE_KINDS)
  kind?: DeviceKind;

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

  @ApiProperty({ example: '2023-09-12', description: 'Date of purchase, last service (maintenance) or first valid day (vignette), YYYY-MM-DD' })
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

  @ApiPropertyOptional({ example: 12, description: 'Wartung interval, required for kind = maintenance' })
  @ValidateIf((o: CreateDeviceDto) => o.kind === 'maintenance' || o.maintenanceIntervalMonths !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  maintenanceIntervalMonths?: number;

  @ApiPropertyOptional({ example: '2027-01-31', description: 'Last valid day, required for kind = vignette' })
  @ValidateIf((o: CreateDeviceDto) => o.kind === 'vignette' || o.validUntil !== undefined)
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  validUntil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ example: 'C02XK1JHJG5J', description: 'Seriennummer, null clears it' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  serialNumber?: string | null;

  @ApiPropertyOptional({ example: '356938035643809', description: '15 digits, null clears it' })
  @IsOptional()
  @Matches(/^\d{15}$/)
  imei?: string | null;

  @ApiPropertyOptional({ example: '4006381333931', description: 'EAN/GTIN, 8 to 14 digits, null clears it' })
  @IsOptional()
  @Matches(/^\d{8,14}$/)
  ean?: string | null;

  @ApiPropertyOptional({ description: 'The Beleg this device was bought with; may be shared by several devices' })
  @IsOptional()
  @IsUUID()
  sourceDocumentId?: string;

  @ApiPropertyOptional({
    example: 20,
    default: 1,
    description: 'Several identical items on one Beleg (e.g. 20 laptops): one device each, named "Laptop (1/20)" ...',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_QUANTITY)
  quantity?: number;
}

export class UpdateDeviceDto extends PartialType(OmitType(CreateDeviceDto, ['quantity', 'sourceDocumentId'] as const)) {}

export const DEVICE_STATUSES = ['active', 'expiring', 'expired'] as const;
export type DeviceStatus = (typeof DEVICE_STATUSES)[number];

export class ListDevicesQuery extends PaginationQuery {
  @ApiPropertyOptional({ enum: DEVICE_STATUSES })
  @IsOptional()
  @IsIn(DEVICE_STATUSES)
  status?: DeviceStatus;

  @ApiPropertyOptional({ enum: DEVICE_KINDS })
  @IsOptional()
  @IsIn(DEVICE_KINDS)
  kind?: DeviceKind;
}
