import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export interface ImportRecords {
  currencies?: unknown[];
  securities?: unknown[];
  dividendPayments?: unknown[];
  securityTransactions?: unknown[];
  securityPrices?: unknown[];
  exchangeRates?: unknown[];
}

export interface ImportCounts {
  currenciesImported: number;
  securitiesImported: number;
  dividendPaymentsImported: number;
  securityTransactionsImported: number;
  securityPricesImported: number;
  exchangeRatesImported: number;
}

/** Fields of an imported security price used for its natural-key upsert. */
interface ImportedSecurityPrice {
  securityId: string;
  date: string | Date;
  open?: unknown;
  high?: unknown;
  low?: unknown;
  close?: unknown;
  volume?: unknown;
  currency?: string;
  provider?: string;
}

/** Fields of an imported exchange rate used for its natural-key upsert. */
interface ImportedExchangeRate {
  baseCurrency: string;
  targetCurrency: string;
  date: string | Date;
  rate?: unknown;
  provider?: string;
}

/**
 * Returns a copy of an imported record without the fields the database
 * generates (`id`, `createdAt`, `updatedAt`).
 */
const TECHNICAL_FIELDS = new Set(['id', 'createdAt', 'updatedAt']);

function withoutTechnicalFields(record: unknown): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record as Record<string, unknown>).filter(
      ([key]) => !TECHNICAL_FIELDS.has(key)
    )
  );
}

/**
 * Data access for the full data import. All writes run in a single database
 * transaction, so an import either succeeds completely or changes nothing.
 */
@Injectable()
export class DataImportRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upserts the given records (currencies and securities first, because the
   * other tables reference them). With `clearExisting`, all existing data
   * (except users) is deleted first.
   *
   * Currencies, security prices and exchange rates are matched by their
   * natural key (`code`, `securityId + date`, `baseCurrency + targetCurrency +
   * date`), so a record that already exists under a different id (e.g. a rate
   * synced from the ECB) is updated instead of violating the unique constraint.
   * New security prices and exchange rates are created without the imported
   * `id`, `createdAt` and `updatedAt`, so the database generates them and an
   * id that already exists for another record cannot conflict.
   * All other records are matched by id.
   */
  importAll(
    data: ImportRecords,
    options: { clearExisting?: boolean } = {}
  ): Promise<ImportCounts> {
    return this.prisma.$transaction(async (tx) => {
      if (options.clearExisting) {
        await tx.dividendPayment.deleteMany({});
        await tx.securityTransaction.deleteMany({});
        await tx.securityPrice.deleteMany({});
        await tx.exchangeRate.deleteMany({});
        await tx.security.deleteMany({});
        await tx.currency.deleteMany({});
      }

      const counts: ImportCounts = {
        currenciesImported: 0,
        securitiesImported: 0,
        dividendPaymentsImported: 0,
        securityTransactionsImported: 0,
        securityPricesImported: 0,
        exchangeRatesImported: 0,
      };

      if (Array.isArray(data.currencies)) {
        for (const currency of data.currencies) {
          const currencyData = currency as { code: string; name: string };
          await tx.currency.upsert({
            where: { code: currencyData.code },
            create: currency as never,
            update: { name: currencyData.name },
          });
          counts.currenciesImported++;
        }
      }

      if (Array.isArray(data.securities)) {
        for (const security of data.securities) {
          await tx.security.upsert({
            where: { id: (security as { id: string }).id },
            create: security as never,
            update: security as never,
          });
          counts.securitiesImported++;
        }
      }

      if (Array.isArray(data.dividendPayments)) {
        for (const payment of data.dividendPayments) {
          await tx.dividendPayment.upsert({
            where: { id: (payment as { id: string }).id },
            create: payment as never,
            update: payment as never,
          });
          counts.dividendPaymentsImported++;
        }
      }

      if (Array.isArray(data.securityTransactions)) {
        for (const transaction of data.securityTransactions) {
          await tx.securityTransaction.upsert({
            where: { id: (transaction as { id: string }).id },
            create: transaction as never,
            update: transaction as never,
          });
          counts.securityTransactionsImported++;
        }
      }

      if (Array.isArray(data.securityPrices)) {
        for (const price of data.securityPrices) {
          const priceData = price as ImportedSecurityPrice;
          await tx.securityPrice.upsert({
            where: {
              securityId_date: {
                securityId: priceData.securityId,
                date: priceData.date,
              },
            },
            create: withoutTechnicalFields(price) as never,
            update: {
              open: priceData.open,
              high: priceData.high,
              low: priceData.low,
              close: priceData.close,
              volume: priceData.volume,
              currency: priceData.currency,
              provider: priceData.provider,
            } as never,
          });
          counts.securityPricesImported++;
        }
      }

      if (Array.isArray(data.exchangeRates)) {
        for (const rate of data.exchangeRates) {
          const rateData = rate as ImportedExchangeRate;
          await tx.exchangeRate.upsert({
            where: {
              baseCurrency_targetCurrency_date: {
                baseCurrency: rateData.baseCurrency,
                targetCurrency: rateData.targetCurrency,
                date: rateData.date,
              },
            },
            create: withoutTechnicalFields(rate) as never,
            update: {
              rate: rateData.rate,
              provider: rateData.provider,
            } as never,
          });
          counts.exchangeRatesImported++;
        }
      }

      return counts;
    });
  }
}
