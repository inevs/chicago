import { Test, TestingModule } from '@nestjs/testing';
import { DataImportRepository } from './data-import.repository';
import { PrismaService } from '../../prisma.service';

describe('DataImportRepository', () => {
  let repository: DataImportRepository;

  const mockPrismaService = {
    $transaction: jest.fn(),
  };

  const createMockTx = () => ({
    currency: { upsert: jest.fn(), deleteMany: jest.fn() },
    security: { upsert: jest.fn(), deleteMany: jest.fn() },
    dividendPayment: { upsert: jest.fn(), deleteMany: jest.fn() },
    securityTransaction: { upsert: jest.fn(), deleteMany: jest.fn() },
    securityPrice: { upsert: jest.fn(), deleteMany: jest.fn() },
    exchangeRate: { upsert: jest.fn(), deleteMany: jest.fn() },
  });

  let mockTx: ReturnType<typeof createMockTx>;

  beforeEach(async () => {
    mockTx = createMockTx();
    mockPrismaService.$transaction.mockImplementation((callback) =>
      callback(mockTx)
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataImportRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<DataImportRepository>(DataImportRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('importAll', () => {
    it('should import data without clearing existing data', async () => {
      const importData = {
        currencies: [{ code: 'EUR', name: 'Euro', isDefault: true }],
        securities: [{ id: 'security-1', symbol: 'AAPL' }],
        dividendPayments: [{ id: 'payment-1', shares: 10 }],
        securityTransactions: [{ id: 'transaction-1', quantity: 5 }],
        securityPrices: [{ id: 'price-1', close: 100 }],
        exchangeRates: [{ id: 'rate-1', baseCurrency: 'EUR', targetCurrency: 'USD', rate: 1.1 }],
      };

      const result = await repository.importAll(importData);

      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);

      expect(result).toEqual({
        currenciesImported: 1,
        securitiesImported: 1,
        dividendPaymentsImported: 1,
        securityTransactionsImported: 1,
        securityPricesImported: 1,
        exchangeRatesImported: 1,
      });

      expect(mockTx.currency.upsert).toHaveBeenCalled();
      expect(mockTx.security.upsert).toHaveBeenCalled();
      expect(mockTx.dividendPayment.upsert).toHaveBeenCalled();
      expect(mockTx.securityTransaction.upsert).toHaveBeenCalled();
      expect(mockTx.securityPrice.upsert).toHaveBeenCalled();
      expect(mockTx.exchangeRate.upsert).toHaveBeenCalled();

      expect(mockTx.currency.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.security.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.dividendPayment.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.securityTransaction.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.securityPrice.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.exchangeRate.deleteMany).not.toHaveBeenCalled();
    });

    it('should upsert currencies by code and update only the name', async () => {
      const currency = { code: 'EUR', name: 'Euro', isDefault: true };

      await repository.importAll({ currencies: [currency] });

      expect(mockTx.currency.upsert).toHaveBeenCalledWith({
        where: { code: 'EUR' },
        create: currency,
        update: { name: 'Euro' },
      });
    });

    it('should upsert the other records by id with the full record', async () => {
      const security = { id: 'security-1', symbol: 'AAPL' };
      const payment = { id: 'payment-1', shares: 10 };
      const transaction = { id: 'transaction-1', quantity: 5 };
      const price = { id: 'price-1', close: 100 };
      const rate = { id: 'rate-1', rate: 1.1 };

      await repository.importAll({
        securities: [security],
        dividendPayments: [payment],
        securityTransactions: [transaction],
        securityPrices: [price],
        exchangeRates: [rate],
      });

      expect(mockTx.security.upsert).toHaveBeenCalledWith({
        where: { id: 'security-1' },
        create: security,
        update: security,
      });
      expect(mockTx.dividendPayment.upsert).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        create: payment,
        update: payment,
      });
      expect(mockTx.securityTransaction.upsert).toHaveBeenCalledWith({
        where: { id: 'transaction-1' },
        create: transaction,
        update: transaction,
      });
      expect(mockTx.securityPrice.upsert).toHaveBeenCalledWith({
        where: { id: 'price-1' },
        create: price,
        update: price,
      });
      expect(mockTx.exchangeRate.upsert).toHaveBeenCalledWith({
        where: { id: 'rate-1' },
        create: rate,
        update: rate,
      });
    });

    it('should import currencies and securities before the dependent records', async () => {
      await repository.importAll({
        exchangeRates: [{ id: 'rate-1' }],
        securityPrices: [{ id: 'price-1' }],
        securityTransactions: [{ id: 'transaction-1' }],
        dividendPayments: [{ id: 'payment-1' }],
        securities: [{ id: 'security-1' }],
        currencies: [{ code: 'EUR', name: 'Euro' }],
      });

      const order = (mock: jest.Mock) => mock.mock.invocationCallOrder[0];
      expect(order(mockTx.currency.upsert)).toBeLessThan(
        order(mockTx.security.upsert)
      );
      expect(order(mockTx.security.upsert)).toBeLessThan(
        order(mockTx.dividendPayment.upsert)
      );
      expect(order(mockTx.security.upsert)).toBeLessThan(
        order(mockTx.securityTransaction.upsert)
      );
      expect(order(mockTx.security.upsert)).toBeLessThan(
        order(mockTx.securityPrice.upsert)
      );
      expect(order(mockTx.currency.upsert)).toBeLessThan(
        order(mockTx.exchangeRate.upsert)
      );
    });

    it('should count multiple records per table', async () => {
      const result = await repository.importAll({
        securities: [{ id: 'security-1' }, { id: 'security-2' }, { id: 'security-3' }],
        dividendPayments: [{ id: 'payment-1' }, { id: 'payment-2' }],
      });

      expect(result.securitiesImported).toBe(3);
      expect(result.dividendPaymentsImported).toBe(2);
      expect(mockTx.security.upsert).toHaveBeenCalledTimes(3);
      expect(mockTx.dividendPayment.upsert).toHaveBeenCalledTimes(2);
    });

    it('should clear existing data when requested', async () => {
      const importData = {
        securities: [{ id: 'security-1', symbol: 'AAPL' }],
      };

      await repository.importAll(importData, { clearExisting: true });

      expect(mockTx.currency.deleteMany).toHaveBeenCalledWith({});
      expect(mockTx.dividendPayment.deleteMany).toHaveBeenCalledWith({});
      expect(mockTx.securityTransaction.deleteMany).toHaveBeenCalledWith({});
      expect(mockTx.securityPrice.deleteMany).toHaveBeenCalledWith({});
      expect(mockTx.exchangeRate.deleteMany).toHaveBeenCalledWith({});
      expect(mockTx.security.deleteMany).toHaveBeenCalledWith({});
    });

    it('should delete dependent records before securities and currencies, and before importing', async () => {
      await repository.importAll(
        { securities: [{ id: 'security-1' }] },
        { clearExisting: true }
      );

      const order = (mock: jest.Mock) => mock.mock.invocationCallOrder[0];
      const securityDelete = order(mockTx.security.deleteMany);
      const currencyDelete = order(mockTx.currency.deleteMany);

      for (const dependent of [
        mockTx.dividendPayment.deleteMany,
        mockTx.securityTransaction.deleteMany,
        mockTx.securityPrice.deleteMany,
        mockTx.exchangeRate.deleteMany,
      ]) {
        expect(order(dependent)).toBeLessThan(securityDelete);
      }
      expect(securityDelete).toBeLessThan(currencyDelete);
      expect(currencyDelete).toBeLessThan(order(mockTx.security.upsert));
    });

    it('should handle empty import data', async () => {
      const result = await repository.importAll({});

      expect(result).toEqual({
        currenciesImported: 0,
        securitiesImported: 0,
        dividendPaymentsImported: 0,
        securityTransactionsImported: 0,
        securityPricesImported: 0,
        exchangeRatesImported: 0,
      });

      expect(mockTx.currency.upsert).not.toHaveBeenCalled();
      expect(mockTx.security.upsert).not.toHaveBeenCalled();
      expect(mockTx.dividendPayment.upsert).not.toHaveBeenCalled();
      expect(mockTx.securityTransaction.upsert).not.toHaveBeenCalled();
      expect(mockTx.securityPrice.upsert).not.toHaveBeenCalled();
      expect(mockTx.exchangeRate.upsert).not.toHaveBeenCalled();
    });

    it('should ignore fields that are not arrays', async () => {
      const result = await repository.importAll({
        securities: 'not-an-array' as unknown as unknown[],
      });

      expect(result.securitiesImported).toBe(0);
      expect(mockTx.security.upsert).not.toHaveBeenCalled();
    });

    it('should propagate errors so that the transaction is rolled back', async () => {
      mockTx.security.upsert.mockRejectedValueOnce(
        new Error('Foreign key constraint failed')
      );

      await expect(
        repository.importAll({
          securities: [{ id: 'security-1' }],
          dividendPayments: [{ id: 'payment-1' }],
        })
      ).rejects.toThrow('Foreign key constraint failed');
      expect(mockTx.dividendPayment.upsert).not.toHaveBeenCalled();
    });
  });
});
