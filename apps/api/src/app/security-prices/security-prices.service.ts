import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { PrismaService } from '../../prisma.service';
import type { SecurityPrice } from '@dividends/shared';
import type { Security } from '../../../generated/prisma/client';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';

interface ProviderPrice {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  currency: string;
}

@Injectable()
export class SecurityPricesService {
  private readonly logger = new Logger(SecurityPricesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ExchangeRatesService))
    private readonly exchangeRatesService: ExchangeRatesService
  ) {}

  async getLatestPrices(): Promise<SecurityPrice[]> {
    // Use a more efficient query with DISTINCT ON to avoid N+1 problem
    // This PostgreSQL-specific query gets the latest price for each security in a single query
    //
    // NOTE: Using $queryRaw is safe here because:
    // 1. The query uses a template literal (not string concatenation)
    // 2. No user input is interpolated into the query
    // 3. All column and table names are hardcoded
    // If you need to add dynamic filtering in the future, use parameterized queries
    // or Prisma's query builder to maintain type safety and prevent SQL injection
    const latestPrices = await this.prisma.$queryRaw<
      Array<{
        id: string;
        securityId: string;
        date: Date;
        open: { toNumber: () => number } | number;
        high: { toNumber: () => number } | number;
        low: { toNumber: () => number } | number;
        close: { toNumber: () => number } | number;
        volume: { toNumber: () => number } | number | null;
        currency: string;
        provider: string;
        createdAt: Date;
        updatedAt: Date;
      }>
    >`
      SELECT DISTINCT ON ("securityId")
        id,
        "securityId",
        date,
        open,
        high,
        low,
        close,
        volume,
        currency,
        provider,
        "createdAt",
        "updatedAt"
      FROM security_prices
      ORDER BY "securityId", date DESC
    `;

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
      // Get the latest price date for a specific security
      const result = await this.prisma.securityPrice.findFirst({
        where: { securityId },
        orderBy: { date: 'desc' },
        select: { date: true },
      });
      return result?.date || null;
    }

    // Get the earliest of the latest dates across all securities
    // This ensures we update all securities from their respective last update dates
    const result = await this.prisma.$queryRaw<Array<{ min_date: Date | null }>>`
      SELECT MIN(max_date) as min_date
      FROM (
        SELECT MAX(date) as max_date
        FROM security_prices
        GROUP BY "securityId"
      ) latest_dates
    `;

    return result[0]?.min_date || null;
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
    const provider = this.getProviderName();
    const fromDate = options.from || this.getDefaultStartDate();
    const toDate = options.to || new Date();
    this.ensureProviderConfigured(provider);

    const securities = await this.prisma.security.findMany({
      where: options.securityId ? { id: options.securityId } : undefined,
      orderBy: { symbol: 'asc' },
    });

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
    } = { synced: false };

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
      const result = await this.prisma.securityPrice.createMany({
        data: payload,
        skipDuplicates: true,
      });
      inserted += result.count;
    }

    return inserted;
  }

  private async fetchHistoricalPricesWithRetry(
    security: Security,
    from: Date,
    to: Date,
    maxRetries = 3
  ): Promise<ProviderPrice[]> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.fetchHistoricalPrices(security, from, to);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // If it's a rate limit error, use exponential backoff
        if (lastError.message.includes('Rate limit exceeded')) {
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

  private async fetchHistoricalPrices(
    security: Security,
    from: Date,
    to: Date
  ): Promise<ProviderPrice[]> {
    return this.fetchFromYahoo(security, from, to);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchFromYahoo(
    security: Security,
    from: Date,
    to: Date
  ): Promise<ProviderPrice[]> {
    const symbol = this.buildYahooSymbol(security);
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
      throw new Error('Rate limit exceeded');
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
    const prices: ProviderPrice[] = [];

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

  private getProviderName(): string {
    return 'yahoo';
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private ensureProviderConfigured(_provider: string): void {
    // Yahoo Finance doesn't require API key configuration
  }

  private buildYahooSymbol(security: Security): string {
    return security.symbol;
  }
}
