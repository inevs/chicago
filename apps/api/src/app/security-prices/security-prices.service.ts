import { Injectable, Logger, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SecurityPricesRepository } from './security-prices.repository';
import { SecuritiesRepository } from '../securities/securities.repository';
import type { SecurityPrice } from '@dividends/shared';
import type { Security } from '../../../generated/prisma/client';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import {
  PRICE_PROVIDER,
  PriceProviderRateLimitError,
  type PriceData,
  type PriceProvider,
} from './providers/price-provider';

@Injectable()
export class SecurityPricesService {
  private readonly logger = new Logger(SecurityPricesService.name);

  constructor(
    private readonly securityPricesRepository: SecurityPricesRepository,
    private readonly securitiesRepository: SecuritiesRepository,
    private readonly exchangeRatesService: ExchangeRatesService,
    @Inject(PRICE_PROVIDER)
    private readonly priceProvider: PriceProvider
  ) {}

  async getLatestPrices(): Promise<SecurityPrice[]> {
    // Single query for the latest price of each security (avoids N+1 queries)
    const latestPrices = await this.securityPricesRepository.findLatestPerSecurity();

    // Convert Decimal types to numbers for the interface
    return latestPrices.map((price) => ({
      id: price.id,
      securityId: price.securityId,
      date: price.date,
      open: typeof price.open === 'object' ? price.open.toNumber() : price.open,
      high: typeof price.high === 'object' ? price.high.toNumber() : price.high,
      low: typeof price.low === 'object' ? price.low.toNumber() : price.low,
      close: typeof price.close === 'object' ? price.close.toNumber() : price.close,
      volume:
        price.volume === null
          ? null
          : typeof price.volume === 'object'
            ? price.volume.toNumber()
            : price.volume,
      currency: price.currency,
      provider: price.provider,
      createdAt: price.createdAt,
      updatedAt: price.updatedAt,
    }));
  }

  /**
   * Get the last price update date for a specific security or the earliest
   * last update date across all securities.
   * @param securityId Optional security ID to check. If not provided, returns the
   *                   earliest last update date across all securities.
   * @returns The last update date, or null if no prices exist
   */
  async getLastPriceUpdateDate(securityId?: string): Promise<Date | null> {
    if (securityId) {
      return this.securityPricesRepository.findLatestDateBySecurityId(securityId);
    }

    // Get the earliest of the latest dates across all securities
    // This ensures we update all securities from their respective last update dates
    return this.securityPricesRepository.findEarliestLatestDate();
  }

  async syncHistoricalPrices(options: {
    securityId?: string;
    from?: Date;
    to?: Date;
  } = {}): Promise<{
    provider: string;
    from: string;
    to: string;
    securitiesProcessed: number;
    pricesInserted: number;
    failures: Array<{ symbol: string; error: string }>;
    exchangeRates: {
      synced: boolean;
      currencies?: Record<string, { synced: number; skipped: number }>;
      error?: string;
    };
  }> {
    const provider = this.priceProvider.name;
    const fromDate = options.from || this.getDefaultStartDate();
    const toDate = options.to || new Date();

    const securities = await this.securitiesRepository.findAllOrById(
      options.securityId
    );

    let totalInserted = 0;
    const failures: Array<{ symbol: string; error: string }> = [];

    for (const security of securities) {
      try {
        // Add a 1-second delay between requests to avoid rate limiting
        await this.delay(1000);

        const prices = await this.fetchHistoricalPricesWithRetry(
          security,
          fromDate,
          toDate
        );
        if (prices.length === 0) {
          continue;
        }

        const data = prices.map((price) => ({
          securityId: security.id,
          date: price.date,
          open: price.open,
          high: price.high,
          low: price.low,
          close: price.close,
          volume: price.volume,
          currency: price.currency,
          provider,
        }));

        totalInserted += await this.insertPriceBatch(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to sync prices for ${security.symbol}: ${message}`
        );
        failures.push({ symbol: security.symbol, error: message });
      }
    }

    // Auto-sync exchange rates for all currencies found in securities
    let exchangeRatesResult: {
      synced: boolean;
      currencies?: Record<string, { synced: number; skipped: number }>;
      error?: string;
    };

    try {
      this.logger.log('Auto-syncing exchange rates for security currencies...');
      const currencies =
        await this.exchangeRatesService.syncAllCurrencies(fromDate, toDate);
      this.logger.log('Exchange rates synced successfully');
      exchangeRatesResult = {
        synced: true,
        currencies,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to auto-sync exchange rates: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      exchangeRatesResult = {
        synced: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      // Don't fail the whole operation if exchange rate sync fails
    }

    return {
      provider,
      from: this.formatDate(fromDate),
      to: this.formatDate(toDate),
      securitiesProcessed: securities.length,
      pricesInserted: totalInserted,
      failures,
      exchangeRates: exchangeRatesResult,
    };
  }

  private async insertPriceBatch(
    data: Array<{
      securityId: string;
      date: Date;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number | null;
      currency: string;
      provider: string;
    }>
  ): Promise<number> {
    if (data.length === 0) {
      return 0;
    }

    const chunkSize = 500;
    let inserted = 0;

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const now = new Date();
      const payload = chunk.map((price) => ({
        ...price,
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
      }));
      inserted += await this.securityPricesRepository.createMany(payload);
    }

    return inserted;
  }

  private async fetchHistoricalPricesWithRetry(
    security: Security,
    from: Date,
    to: Date,
    maxRetries = 3
  ): Promise<PriceData[]> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.priceProvider.fetchPrices(security, from, to);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // If it's a rate limit error, use exponential backoff
        if (lastError instanceof PriceProviderRateLimitError) {
          const backoffMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          this.logger.warn(
            `Rate limited for ${security.symbol}, retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})`
          );
          await this.delay(backoffMs);
        } else {
          // For other errors, don't retry
          throw lastError;
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getDefaultStartDate(): Date {
    const raw = process.env.SECURITY_PRICE_HISTORY_START || '2017-01-01';
    const parsed = new Date(raw);

    if (Number.isNaN(parsed.getTime())) {
      return new Date('2017-01-01');
    }

    return parsed;
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
