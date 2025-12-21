import { IsString, IsEnum, IsOptional, Length, Matches } from 'class-validator';
import { SecurityType } from '@dividends/shared';
import { Transform } from 'class-transformer';

export class CreateSecurityDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsString()
  @Length(1, 20)
  @Transform(({ value }) => value?.toUpperCase())
  @Matches(/^[A-Z0-9.-]+$/, {
    message: 'Symbol must contain only uppercase letters, numbers, dots, and hyphens',
  })
  symbol: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  @Length(12, 12)
  @Matches(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/, {
    message: 'ISIN must be in valid format (e.g., US0378331005)',
  })
  isin?: string;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  @Length(6, 6)
  wkn?: string;

  @IsEnum(SecurityType)
  type: SecurityType;

  @IsString()
  @Length(1, 100)
  exchange: string;

  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/, {
    message: 'Currency must be a 3-letter ISO 4217 code (e.g., USD, EUR)',
  })
  currency: string;
}
