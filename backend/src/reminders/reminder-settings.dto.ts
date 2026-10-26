import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  Max,
  Min,
} from 'class-validator';

/** Days before a deadline the app offers; the database checks the same list. */
export const REMINDER_DAYS = [90, 60, 30, 14, 7, 3, 1] as const;
export const DEFAULT_REMINDER_SETTINGS = { daysBefore: [30, 7], hour: 9 };

export class ReminderSettingsDto {
  @ApiProperty({ example: [30, 7], enum: REMINDER_DAYS, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(REMINDER_DAYS.length)
  @ArrayUnique()
  @IsIn(REMINDER_DAYS, { each: true })
  daysBefore: number[];

  @ApiProperty({ example: 9, description: 'Hour of day, Europe/Berlin' })
  @IsInt()
  @Min(6)
  @Max(22)
  hour: number;
}
