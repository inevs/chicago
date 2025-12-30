import { IsString, Length, Matches, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsISO4217Code } from '../validators/is-iso4217-code.validator';

export class CreateCurrencyDto {
  @IsString()
  @Length(3, 3, {
    message: 'Currency code must be exactly 3 characters long',
  })
  @Matches(/^[A-Za-z]{3}$/, {
    message: 'Currency code must contain only letters',
  })
  @Transform(({ value }) => value?.toUpperCase().trim())
  @IsISO4217Code({
    message: 'Currency code must be a valid ISO 4217 code (e.g., USD, EUR, CHF)',
  })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'Currency name is required' })
  @Transform(({ value }) => value?.trim())
  name: string;
}
