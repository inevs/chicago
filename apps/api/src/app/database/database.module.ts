import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UsersRepository } from '../auth/users.repository';
import { CurrenciesRepository } from '../currencies/currencies.repository';
import { DataImportRepository } from '../data/data-import.repository';
import { DividendPaymentsRepository } from '../dividend-payments/dividend-payments.repository';
import { ExchangeRatesRepository } from '../exchange-rates/exchange-rates.repository';
import { SecuritiesRepository } from '../securities/securities.repository';
import { SecurityPricesRepository } from '../security-prices/security-prices.repository';
import { SecurityTransactionsRepository } from '../security-transactions/security-transactions.repository';

const repositories = [
  CurrenciesRepository,
  DataImportRepository,
  DividendPaymentsRepository,
  ExchangeRatesRepository,
  SecuritiesRepository,
  SecurityPricesRepository,
  SecurityTransactionsRepository,
  UsersRepository,
];

/**
 * Provides the single PrismaService instance and all repositories application-wide.
 * Services access the database only through the repositories; PrismaService is
 * exported for infrastructure concerns such as the database health check.
 */
@Global()
@Module({
  providers: [PrismaService, ...repositories],
  exports: [PrismaService, ...repositories],
})
export class DatabaseModule {}
