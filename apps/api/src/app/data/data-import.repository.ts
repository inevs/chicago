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
          await tx.securityPrice.upsert({
            where: { id: (price as { id: string }).id },
            create: price as never,
            update: price as never,
          });
          counts.securityPricesImported++;
        }
      }

      if (Array.isArray(data.exchangeRates)) {
        for (const rate of data.exchangeRates) {
          await tx.exchangeRate.upsert({
            where: { id: (rate as { id: string }).id },
            create: rate as never,
            update: rate as never,
          });
          counts.exchangeRatesImported++;
        }
      }

      return counts;
    });
  }
}
