import {
  IsString,
  IsUUID,
  IsDateString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  Length,
  Matches,
} from 'class-validator';
import { TransactionType } from '@dividends/shared';

export class CreateSecurityTransactionDto {
  @IsDateString()
  date: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsUUID()
  securityId: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  pricePerShare: number;

  @IsNumber()
  @Min(0)
  fees: number;

  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/, {
    message: 'Currency must be a 3-letter ISO 4217 code (e.g., USD, EUR)',
  })
  currency: string;

  @IsNumber()
  @Min(0)
  exchangeRate: number;

  @IsNumber()
  @Min(0)
  totalValue: number;

  @IsOptional()
  @IsString()
  note?: string;
}
