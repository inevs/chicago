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

export class CreateDividendPaymentDto {
  @IsDateString()
  exDate: string;

  @IsDateString()
  payoutDate: string;

  @IsUUID()
  securityId: string;

  @IsNumber()
  @Min(0)
  shares: number;

  @IsNumber()
  @Min(0)
  dividendYield: number;

  @IsNumber()
  @Min(0)
  taxAmount: number;

  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/, {
    message: 'Currency must be a 3-letter ISO 4217 code (e.g., USD, EUR)',
  })
  originCurrency: string;

  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/, {
    message: 'Currency must be a 3-letter ISO 4217 code (e.g., USD, EUR)',
  })
  destCurrency: string;

  @IsNumber()
  @Min(0)
  conversionRate: number;

  @IsNumber()
  @Min(0)
  finalPayment: number;

  @IsOptional()
  @IsString()
  note?: string;
}
