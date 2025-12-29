import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export interface ExportData {
  securities: unknown[];
  dividendPayments: unknown[];
  securityTransactions: unknown[];
  exportedAt: string;
  version: string;
}

export interface ImportData {
  securities?: unknown[];
  dividendPayments?: unknown[];
  securityTransactions?: unknown[];
}

@Injectable()
export class DataService {
  constructor(private readonly prisma: PrismaService) {}

  async exportAllData(): Promise<ExportData> {
    // Fetch all data from database
    const [securities, dividendPayments, securityTransactions] =
      await Promise.all([
        this.prisma.security.findMany({
          orderBy: { symbol: 'asc' },
        }),
        this.prisma.dividendPayment.findMany({
          orderBy: { exDate: 'asc' },
        }),
        this.prisma.securityTransaction.findMany({
          orderBy: { date: 'asc' },
        }),
      ]);

    return {
      securities,
      dividendPayments,
      securityTransactions,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
  }

  async importAllData(
    data: ImportData,
    options: { clearExisting?: boolean } = {}
  ): Promise<{
    securitiesImported: number;
    dividendPaymentsImported: number;
    securityTransactionsImported: number;
  }> {
    return await this.prisma.$transaction(async (tx) => {
      // Clear existing data if requested
      if (options.clearExisting) {
        await tx.dividendPayment.deleteMany({});
        await tx.securityTransaction.deleteMany({});
        await tx.security.deleteMany({});
      }

      let securitiesImported = 0;
      let dividendPaymentsImported = 0;
      let securityTransactionsImported = 0;

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

      return {
        securitiesImported,
        dividendPaymentsImported,
        securityTransactionsImported,
      };
    });
  }
}
