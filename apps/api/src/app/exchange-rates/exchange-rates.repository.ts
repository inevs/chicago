import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import type { ExchangeRate } from '../../../generated/prisma/client';

export interface UpsertExchangeRateData {
  baseCurrency: string;
  targetCurrency: string;
  date: Date;
  rate: number;
  provider: string;
}

/** Raw row of the latest-rate query; `rate` may be a Prisma Decimal. */
export interface LatestExchangeRateRow {
  targetCurrency: string;
  rate: unknown;
  date: Date;
}

/**
 * Data access for exchange rates. Encapsulates all Prisma queries on the
 * `exchange_rates` table so that services do not depend on the ORM directly.
 */
@Injectable()
export class ExchangeRatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** All rates ordered by base currency, target currency and date. */
  findAll(): Promise<ExchangeRate[]> {
    return this.prisma.exchangeRate.findMany({
      orderBy: [{ baseCurrency: 'asc' }, { targetCurrency: 'asc' }, { date: 'asc' }],
    });
  }

  findByPairAndDate(
    baseCurrency: string,
    targetCurrency: string,
    date: Date
  ): Promise<ExchangeRate | null> {
    return this.prisma.exchangeRate.findUnique({
      where: {
        baseCurrency_targetCurrency_date: {
          baseCurrency,
          targetCurrency,
          date,
        },
      },
    });
  }

  /** The most recent rate of the currency pair on or before the given date. */
  findLatestOnOrBefore(
    baseCurrency: string,
    targetCurrency: string,
    date: Date
  ): Promise<ExchangeRate | null> {
    return this.prisma.exchangeRate.findFirst({
      where: {
        baseCurrency,
        targetCurrency,
        date: {
          lte: date,
        },
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  /**
   * The latest rate for every target currency of the given base currency.
   * Uses PostgreSQL `DISTINCT ON` to avoid one query per currency; the base
   * currency is passed as a query parameter.
   */
  findLatestPerTargetCurrency(baseCurrency: string): Promise<LatestExchangeRateRow[]> {
    return this.prisma.$queryRaw<LatestExchangeRateRow[]>`
      SELECT DISTINCT ON ("targetCurrency")
        "targetCurrency",
        rate,
        date
      FROM "exchange_rates"
      WHERE "baseCurrency" = ${baseCurrency}
      ORDER BY "targetCurrency", date DESC
    `;
  }

  /** Creates the rate or updates rate and provider of the existing one (same pair and date). */
  async upsert(data: UpsertExchangeRateData): Promise<void> {
    const { baseCurrency, targetCurrency, date, rate, provider } = data;
    await this.prisma.exchangeRate.upsert({
      where: {
        baseCurrency_targetCurrency_date: {
          baseCurrency,
          targetCurrency,
          date,
        },
      },
      update: {
        rate,
        provider,
      },
      create: {
        baseCurrency,
        targetCurrency,
        date,
        rate,
        provider,
      },
    });
  }
}
