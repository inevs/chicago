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
  ValidateIf,
} from 'class-validator';
import { TransactionType } from '@dividends/shared';

export class UpdateSecurityTransactionDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsDateString()
  date?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  securityId?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsNumber()
  @Min(0)
  pricePerShare?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsNumber()
  @Min(0)
  fees?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/, {
    message: 'Currency must be a 3-letter ISO 4217 code (e.g., USD, EUR)',
  })
  currency?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsNumber()
  @Min(0)
  exchangeRate?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsNumber()
  @Min(0)
  totalValue?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
