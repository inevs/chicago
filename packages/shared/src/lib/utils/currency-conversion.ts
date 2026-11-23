import { CurrencyConverter } from '../shared';

/**
 * Converts a value into EUR.
 * @param value The value in the given currency
 * @param currency ISO 4217 code of the value's currency
 * @param exchangeRateMap Exchange rates from EUR to each currency (1 EUR = rate currency)
 * @returns The value in EUR, or null if no (non-zero) exchange rate exists for the currency
 */
export function convertToEur(
  value: number,
  currency: string,
  exchangeRateMap: Map<string, number>
): number | null {
  if (currency === 'EUR') {
    return value;
  }
  const exchangeRate = exchangeRateMap.get(currency);
  if (!exchangeRate) {
    return null;
  }
  return CurrencyConverter.convertBack(value, exchangeRate);
}
