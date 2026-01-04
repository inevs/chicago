import { IsString, IsEnum, IsOptional, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SecurityType } from '@dividends/shared';
import { Transform } from 'class-transformer';

export class CreateSecurityDto {
  @ApiProperty({
    description: 'Name of the security',
    example: 'Apple Inc.',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiProperty({
    description: 'Trading symbol (automatically converted to uppercase)',
    example: 'AAPL',
    minLength: 1,
    maxLength: 20,
  })
  @IsString()
  @Length(1, 20)
  @Transform(({ value }) => value?.toUpperCase())
  @Matches(/^[A-Z0-9.-]+$/, {
    message: 'Symbol must contain only uppercase letters, numbers, dots, and hyphens',
  })
  symbol: string;

  @ApiPropertyOptional({
    description: 'International Securities Identification Number',
    example: 'US0378331005',
    minLength: 12,
    maxLength: 12,
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  @Length(12, 12)
  @Matches(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/, {
    message: 'ISIN must be in valid format (e.g., US0378331005)',
  })
  isin?: string;

  @ApiPropertyOptional({
    description: 'Wertpapierkennnummer (German securities identification)',
    example: '865985',
    minLength: 6,
    maxLength: 6,
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  @Length(6, 6)
  wkn?: string;

  @ApiProperty({
    description: 'Type of security',
    enum: SecurityType,
    example: SecurityType.STOCK,
  })
  @IsEnum(SecurityType)
  type: SecurityType;

  @ApiProperty({
    description: 'Exchange where the security is traded',
    example: 'NASDAQ',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100)
  exchange: string;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'USD',
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/, {
    message: 'Currency must be a 3-letter ISO 4217 code (e.g., USD, EUR)',
  })
  currency: string;
}
