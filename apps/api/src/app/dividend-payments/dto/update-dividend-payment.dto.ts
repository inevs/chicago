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

export class UpdateDividendPaymentDto {
  @IsOptional()
  @IsDateString()
  exDate?: string;

  @IsOptional()
  @IsDateString()
  payoutDate?: string;

  @IsOptional()
  @IsUUID()
  securityId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shares?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dividendYield?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/, {
    message: 'Currency must be a 3-letter ISO 4217 code (e.g., USD, EUR)',
  })
  originCurrency?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/, {
    message: 'Currency must be a 3-letter ISO 4217 code (e.g., USD, EUR)',
  })
  destCurrency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  conversionRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  finalPayment?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
