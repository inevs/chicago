import { IsDateString, IsOptional } from 'class-validator';
import { IsISO4217Code } from '../../currencies/validators/is-iso4217-code.validator';

export class SyncExchangeRatesDto {
  @IsISO4217Code()
  @IsOptional()
  targetCurrency?: string;

  @IsDateString()
  @IsOptional()
  from?: string;

  @IsDateString()
  @IsOptional()
  to?: string;

  @IsISO4217Code()
  @IsOptional()
  baseCurrency?: string = 'EUR';
}
