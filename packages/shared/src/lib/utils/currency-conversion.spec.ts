import { convertToEur } from './currency-conversion';

describe('convertToEur', () => {
  const exchangeRateMap = new Map<string, number>([
    ['USD', 1.25],
    ['CHF', 0.5],
  ]);

  it('returns the value unchanged for EUR', () => {
    expect(convertToEur(100, 'EUR', exchangeRateMap)).toBe(100);
  });

  it('returns the value unchanged for EUR even without any exchange rates', () => {
    expect(convertToEur(100, 'EUR', new Map())).toBe(100);
  });

  it('divides by the EUR-to-currency rate for other currencies', () => {
    expect(convertToEur(125, 'USD', exchangeRateMap)).toBe(100);
    expect(convertToEur(50, 'CHF', exchangeRateMap)).toBe(100);
  });

  it('returns null if no exchange rate exists for the currency', () => {
    expect(convertToEur(100, 'GBP', exchangeRateMap)).toBeNull();
  });

  it('returns null if the exchange rate is zero', () => {
    expect(convertToEur(100, 'JPY', new Map([['JPY', 0]]))).toBeNull();
  });
});
