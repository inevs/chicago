import {
  IsString,
  IsUUID,
  IsDateString,
  IsNumber,
  IsOptional,
  Min,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDividendPaymentDto {
  @ApiProperty({
    description: 'Ex-dividend date (ISO 8601 format)',
    example: '2024-03-15',
  })
  @IsDateString()
  exDate: string;

  @ApiProperty({
    description: 'Payout date (ISO 8601 format)',
    example: '2024-04-01',
  })
  @IsDateString()
  payoutDate: string;

  @ApiProperty({
    description: 'Security UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  securityId: string;

  @ApiProperty({
    description: 'Number of shares held',
    example: 100,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  shares: number;

  @ApiProperty({
    description: 'Dividend yield per share',
    example: 0.52,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  dividendYield: number;

  @ApiProperty({
    description: 'Tax amount withheld',
    example: 7.8,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  taxAmount: number;

  @ApiProperty({
    description: 'Original currency code (ISO 4217)',
    example: 'USD',
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/, {
    message: 'Currency must be a 3-letter ISO 4217 code (e.g., USD, EUR)',
  })
  originCurrency: string;

  @ApiProperty({
    description: 'Destination currency code (ISO 4217)',
    example: 'EUR',
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/, {
    message: 'Currency must be a 3-letter ISO 4217 code (e.g., USD, EUR)',
  })
  destCurrency: string;

  @ApiProperty({
    description: 'Currency conversion rate',
    example: 0.85,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  conversionRate: number;

  @ApiProperty({
    description: 'Final payment amount after tax and conversion',
    example: 44.2,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  finalPayment: number;

  @ApiPropertyOptional({
    description: 'Optional note',
    example: 'Q1 2024 dividend',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
