import { IsDateString } from 'class-validator';
import { IsISO4217Code } from '../../currencies/validators/is-iso4217-code.validator';

export class GetExchangeRateDto {
  @IsISO4217Code()
  baseCurrency: string;

  @IsISO4217Code()
  targetCurrency: string;

  @IsDateString()
  date: string;
}
