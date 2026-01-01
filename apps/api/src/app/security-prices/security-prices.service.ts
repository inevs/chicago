import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../prisma.service';
import type { SecurityPrice } from '@dividends/shared';
import type { Security } from '../../../generated/prisma/client';

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

  constructor(private readonly prisma: PrismaService) {}

  async getLatestPrices(): Promise<SecurityPrice[]> {
    const latestDates = await this.prisma.securityPrice.groupBy({
      by: ['securityId'],
      _max: { date: true },
    });

    const filters = latestDates
      .filter((entry) => entry._max.date)
      .map((entry) => ({
        securityId: entry.securityId,
        date: entry._max.date as Date,
      }));

    if (filters.length === 0) {
      return [];
    }

    const latestPrices = await this.prisma.securityPrice.findMany({
      where: {
        OR: filters,
      },
    });

    return latestPrices as unknown as SecurityPrice[];
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

    for (const security of securities) {
      try {
        const prices = await this.fetchHistoricalPrices(security, fromDate, toDate);
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
      }
    }

    return {
      provider,
      from: this.formatDate(fromDate),
      to: this.formatDate(toDate),
      securitiesProcessed: securities.length,
      pricesInserted: totalInserted,
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
      const result = await this.prisma.securityPrice.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      inserted += result.count;
    }

    return inserted;
  }

  private async fetchHistoricalPrices(
    security: Security,
    from: Date,
    to: Date
  ): Promise<ProviderPrice[]> {
    const provider = this.getProviderName();

    if (provider === 'twelvedata') {
      return this.fetchFromTwelveData(security, from, to);
    }

    if (provider === 'yahoo') {
      return this.fetchFromYahoo(security, from, to);
    }

    throw new Error(`Unsupported market data provider: ${provider}`);
  }

  private async fetchFromTwelveData(
    security: Security,
    from: Date,
    to: Date
  ): Promise<ProviderPrice[]> {
    const apiKey = process.env.TWELVEDATA_API_KEY;
    if (!apiKey) {
      throw new Error('TWELVEDATA_API_KEY is not configured');
    }

    const params: Record<string, string> = {
      symbol: security.symbol,
      interval: '1day',
      outputsize: '5000',
      start_date: this.formatDate(from),
      end_date: this.formatDate(to),
      apikey: apiKey,
      format: 'JSON',
    };

    if (security.exchange) {
      params.exchange = security.exchange;
    }

    const response = await axios.get('https://api.twelvedata.com/time_series', {
      params,
    });

    if (response.data?.status === 'error') {
      const message = response.data?.message || 'Unknown provider error';
      this.logger.warn(
        `Twelve Data error for ${security.symbol}: ${message}`
      );
      return [];
    }

    const values = response.data?.values;
    if (!Array.isArray(values)) {
      return [];
    }

    const currency = response.data?.meta?.currency || security.currency;

    return values
      .map((value: Record<string, string>) => ({
        date: this.parseDate(value.datetime),
        open: Number(value.open),
        high: Number(value.high),
        low: Number(value.low),
        close: Number(value.close),
        volume: value.volume ? Number(value.volume) : null,
        currency,
      }))
      .filter((price) =>
        Number.isFinite(price.open) &&
        Number.isFinite(price.high) &&
        Number.isFinite(price.low) &&
        Number.isFinite(price.close) &&
        !Number.isNaN(price.date.getTime())
      );
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
      }
    );

    const result = response.data?.chart?.result?.[0];
    const timestamps: number[] = result?.timestamp || [];
    const quote = result?.indicators?.quote?.[0];

    if (!Array.isArray(timestamps) || !quote) {
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
    return (process.env.MARKET_DATA_PROVIDER || 'yahoo').toLowerCase();
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

  private parseDate(value: string): Date {
    const datePart = value.includes(' ') ? value.split(' ')[0] : value;
    return new Date(`${datePart}T00:00:00.000Z`);
  }

  private ensureProviderConfigured(provider: string): void {
    if (provider === 'twelvedata' && !process.env.TWELVEDATA_API_KEY) {
      throw new Error('TWELVEDATA_API_KEY is not configured');
    }
  }

  private buildYahooSymbol(security: Security): string {
    return security.symbol;
  }
}
