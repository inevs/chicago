import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  PriceProviderRateLimitError,
  type PriceData,
  type PriceProvider,
  type PriceProviderSecurity,
} from './price-provider';

/**
 * End-of-day prices from the Yahoo Finance chart API.
 * Does not require an API key.
 */
@Injectable()
export class YahooFinancePriceProvider implements PriceProvider {
  readonly name = 'yahoo';

  private readonly logger = new Logger(YahooFinancePriceProvider.name);

  async fetchPrices(
    security: PriceProviderSecurity,
    from: Date,
    to: Date
  ): Promise<PriceData[]> {
    const symbol = security.symbol;
    const period1 = Math.floor(from.getTime() / 1000);
    const period2 = Math.floor(to.getTime() / 1000) + 86400;

    const response = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`,
      {
        params: {
          interval: '1d',
          period1,
          period2,
          events: 'div,splits',
          includeAdjustedClose: true,
        },
        timeout: 30000, // 30 second timeout
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      }
    );

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers['retry-after'] || 'unknown';
      this.logger.warn(`Rate limited by Yahoo Finance, retry after ${retryAfter}s`);
      throw new PriceProviderRateLimitError();
    }

    // Handle other client errors
    if (response.status >= 400) {
      this.logger.warn(`Yahoo Finance returned status ${response.status} for ${symbol}`);
      return [];
    }

    const result = response.data?.chart?.result?.[0];
    const timestamps: number[] = result?.timestamp || [];
    const quote = result?.indicators?.quote?.[0];

    if (!Array.isArray(timestamps) || !quote) {
      this.logger.warn(
        `Yahoo Finance returned no price data for ${symbol} (response valid but empty)`
      );
      return [];
    }

    const currency = result?.meta?.currency || security.currency;
    const prices: PriceData[] = [];

    for (let i = 0; i < timestamps.length; i += 1) {
      const date = new Date(timestamps[i] * 1000);
      const open = Number(quote.open?.[i]);
      const high = Number(quote.high?.[i]);
      const low = Number(quote.low?.[i]);
      const close = Number(quote.close?.[i]);
      const volumeValue = quote.volume?.[i];
      const volume = volumeValue === null || volumeValue === undefined ? null : Number(volumeValue);

      if (
        Number.isNaN(date.getTime()) ||
        !Number.isFinite(open) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close)
      ) {
        continue;
      }

      prices.push({
        date,
        open,
        high,
        low,
        close,
        volume: Number.isFinite(volume) ? volume : null,
        currency,
      });
    }

    return prices;
  }
}
