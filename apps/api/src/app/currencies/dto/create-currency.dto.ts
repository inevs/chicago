import { IsString, Length, Matches, IsNotEmpty } from 'class-validator';

export class CreateCurrencyDto {
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/, {
    message: 'Currency code must be a 3-letter ISO 4217 code (e.g., USD, EUR, CHF)',
  })
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}
