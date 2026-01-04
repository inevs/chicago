import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';

export interface ExportData {
  currencies: unknown[];
  securities: unknown[];
  dividendPayments: unknown[];
  securityTransactions: unknown[];
  securityPrices: unknown[];
  exchangeRates: unknown[];
  exportedAt: string;
  version: string;
}

export interface ImportData {
  currencies?: unknown[];
  securities?: unknown[];
  dividendPayments?: unknown[];
  securityTransactions?: unknown[];
  securityPrices?: unknown[];
  exchangeRates?: unknown[];
}

@Injectable()
export class DataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRatesService: ExchangeRatesService
  ) {}

  async exportAllData(): Promise<ExportData> {
    // Fetch all data from database
    const [
      currencies,
      securities,
      dividendPayments,
      securityTransactions,
      securityPrices,
      exchangeRates,
    ] = await Promise.all([
      this.prisma.currency.findMany({
        orderBy: { code: 'asc' },
      }),
      this.prisma.security.findMany({
        orderBy: { symbol: 'asc' },
      }),
      this.prisma.dividendPayment.findMany({
        orderBy: { exDate: 'asc' },
      }),
      this.prisma.securityTransaction.findMany({
        orderBy: { date: 'asc' },
      }),
      this.prisma.securityPrice.findMany({
        orderBy: { date: 'asc' },
      }),
      this.exchangeRatesService.getAllExchangeRates(),
    ]);

    return {
      currencies,
      securities,
      dividendPayments,
      securityTransactions,
      securityPrices,
      exchangeRates,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
  }

  async importAllData(
    data: ImportData,
    options: { clearExisting?: boolean } = {}
  ): Promise<{
    currenciesImported: number;
    securitiesImported: number;
    dividendPaymentsImported: number;
    securityTransactionsImported: number;
    securityPricesImported: number;
    exchangeRatesImported: number;
  }> {
    return await this.prisma.$transaction(async (tx) => {
      // Clear existing data if requested
      if (options.clearExisting) {
        await tx.dividendPayment.deleteMany({});
        await tx.securityTransaction.deleteMany({});
        await tx.securityPrice.deleteMany({});
        await tx.exchangeRate.deleteMany({});
        await tx.security.deleteMany({});
        await tx.currency.deleteMany({});
      }

      let currenciesImported = 0;
      let securitiesImported = 0;
      let dividendPaymentsImported = 0;
      let securityTransactionsImported = 0;
      let securityPricesImported = 0;
      let exchangeRatesImported = 0;

      // Import currencies first (they are referenced by other tables)
      if (data.currencies && Array.isArray(data.currencies)) {
        for (const currency of data.currencies) {
          const currencyData = currency as { code: string; name: string };
          await tx.currency.upsert({
            where: { code: currencyData.code },
            create: currency as never,
            update: { name: currencyData.name },
          });
          currenciesImported++;
        }
      }

      // Import securities first (they are referenced by other tables)
      if (data.securities && Array.isArray(data.securities)) {
        for (const security of data.securities) {
          await tx.security.upsert({
            where: { id: (security as { id: string }).id },
            create: security as never,
            update: security as never,
          });
          securitiesImported++;
        }
      }

      // Import dividend payments
      if (data.dividendPayments && Array.isArray(data.dividendPayments)) {
        for (const payment of data.dividendPayments) {
          await tx.dividendPayment.upsert({
            where: { id: (payment as { id: string }).id },
            create: payment as never,
            update: payment as never,
          });
          dividendPaymentsImported++;
        }
      }

      // Import security transactions
      if (
        data.securityTransactions &&
        Array.isArray(data.securityTransactions)
      ) {
        for (const transaction of data.securityTransactions) {
          await tx.securityTransaction.upsert({
            where: { id: (transaction as { id: string }).id },
            create: transaction as never,
            update: transaction as never,
          });
          securityTransactionsImported++;
        }
      }

      // Import security prices
      if (data.securityPrices && Array.isArray(data.securityPrices)) {
        for (const price of data.securityPrices) {
          await tx.securityPrice.upsert({
            where: { id: (price as { id: string }).id },
            create: price as never,
            update: price as never,
          });
          securityPricesImported++;
        }
      }

      // Import exchange rates
      if (data.exchangeRates && Array.isArray(data.exchangeRates)) {
        for (const rate of data.exchangeRates) {
          await tx.exchangeRate.upsert({
            where: { id: (rate as { id: string }).id },
            create: rate as never,
            update: rate as never,
          });
          exchangeRatesImported++;
        }
      }

      return {
        currenciesImported,
        securitiesImported,
        dividendPaymentsImported,
        securityTransactionsImported,
        securityPricesImported,
        exchangeRatesImported,
      };
    });
  }
}
