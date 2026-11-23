/**
 * A single exchange rate as delivered by an external provider:
 * 1 unit of the provider's base currency = `rate` units of the target currency.
 */
export interface ExchangeRateData {
  date: Date;
  rate: number;
}

/**
 * Source of historical exchange rates (e.g. the ECB).
 * Implementations encapsulate all provider-specific logic
 * (HTTP requests, response parsing, error mapping).
 */
export interface ExchangeRateProvider {
  /** Identifier stored in the `provider` column of each exchange rate */
  readonly name: string;

  /** The only base currency the provider delivers rates for */
  readonly baseCurrency: string;

  /**
   * Fetch daily rates from the base currency to the target currency.
   * Returns an empty array if the provider does not know the currency.
   */
  fetchRates(
    targetCurrency: string,
    from: Date,
    to: Date
  ): Promise<ExchangeRateData[]>;
}

/** Injection token for the active exchange rate provider */
export const EXCHANGE_RATE_PROVIDER = Symbol('EXCHANGE_RATE_PROVIDER');
