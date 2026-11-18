import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from './database.module';
import { PrismaService } from '../../prisma.service';
import { UsersRepository } from '../auth/users.repository';
import { CurrenciesRepository } from '../currencies/currencies.repository';
import { DataImportRepository } from '../data/data-import.repository';
import { DividendPaymentsRepository } from '../dividend-payments/dividend-payments.repository';
import { ExchangeRatesRepository } from '../exchange-rates/exchange-rates.repository';
import { SecuritiesRepository } from '../securities/securities.repository';
import { SecurityPricesRepository } from '../security-prices/security-prices.repository';
import { SecurityTransactionsRepository } from '../security-transactions/security-transactions.repository';

describe('DatabaseModule', () => {
  let module: TestingModule;

  const mockPrismaService = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should provide PrismaService', () => {
    expect(module.get(PrismaService)).toBe(mockPrismaService);
  });

  it.each([
    CurrenciesRepository,
    DataImportRepository,
    DividendPaymentsRepository,
    ExchangeRatesRepository,
    SecuritiesRepository,
    SecurityPricesRepository,
    SecurityTransactionsRepository,
    UsersRepository,
  ])('should provide %p', (repository) => {
    expect(module.get(repository)).toBeInstanceOf(repository);
  });
});
