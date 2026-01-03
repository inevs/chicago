import { IsDateString, IsOptional, IsString } from 'class-validator';
import { IsISO4217Code } from '../../currencies/decorators/is-iso4217-code.decorator';

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

  @IsString()
  @IsOptional()
  baseCurrency?: string = 'EUR';
}
