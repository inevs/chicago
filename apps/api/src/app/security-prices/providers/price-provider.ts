/**
 * A single daily price (end of day) as delivered by an external provider.
 */
export interface PriceData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  currency: string;
}

/**
 * The security data a provider needs to look up prices.
 */
export interface PriceProviderSecurity {
  symbol: string;
  /** Fallback if the provider does not report a currency */
  currency: string;
}

/**
 * Source of historical security prices (e.g. Yahoo Finance).
 * Implementations encapsulate all provider-specific logic
 * (HTTP requests, response parsing, error mapping).
 */
export interface PriceProvider {
  /** Identifier stored in the `provider` column of each price */
  readonly name: string;

  /**
   * Fetch daily prices for the security in the given date range.
   * Returns an empty array if the provider has no data for the security.
   * Throws a PriceProviderRateLimitError if the provider rejects the
   * request because of rate limiting, so that the caller can retry.
   */
  fetchPrices(
    security: PriceProviderSecurity,
    from: Date,
    to: Date
  ): Promise<PriceData[]>;
}

/**
 * Thrown by a price provider when it rejects a request because of rate limiting.
 */
export class PriceProviderRateLimitError extends Error {
  constructor() {
    super('Rate limit exceeded');
    this.name = 'PriceProviderRateLimitError';
  }
}

/** Injection token for the active price provider */
export const PRICE_PROVIDER = Symbol('PRICE_PROVIDER');
