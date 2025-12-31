export class CurrencyResponseDto {
  code: string;
  name: string;

  constructor(code: string, name: string) {
    this.code = code;
    this.name = name;
  }

  static fromEntity(currency: { code: string; name: string }): CurrencyResponseDto {
    return new CurrencyResponseDto(currency.code, currency.name);
  }
}
