import { Test, TestingModule } from '@nestjs/testing';
import { DataService } from './data.service';
import { PrismaService } from '../../prisma.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';

describe('DataService', () => {
  let service: DataService;
  let prisma: PrismaService;

  const mockPrismaService = {
    currency: {
      findMany: jest.fn(),
    },
    security: {
      findMany: jest.fn(),
    },
    dividendPayment: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    },
    securityTransaction: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    },
    securityPrice: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    },
    exchangeRate: {
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockExchangeRatesService = {
    getAllExchangeRates: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ExchangeRatesService,
          useValue: mockExchangeRatesService,
        },
      ],
    }).compile();

    service = module.get<DataService>(DataService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportAllData', () => {
    it('should export all data from database', async () => {
      const mockCurrencies = [{ code: 'EUR', name: 'Euro' }];
      const mockSecurities = [{ id: 'security-1', symbol: 'AAPL' }];
      const mockDividendPayments = [{ id: 'payment-1', shares: 10 }];
      const mockSecurityTransactions = [{ id: 'transaction-1', quantity: 5 }];
      const mockSecurityPrices = [{ id: 'price-1', close: 100 }];
      const mockExchangeRates = [{ id: 'rate-1', baseCurrency: 'EUR', targetCurrency: 'USD', rate: 1.1 }];

      mockPrismaService.currency.findMany.mockResolvedValue(mockCurrencies);
      mockPrismaService.security.findMany.mockResolvedValue(mockSecurities);
      mockPrismaService.dividendPayment.findMany.mockResolvedValue(
        mockDividendPayments
      );
      mockPrismaService.securityTransaction.findMany.mockResolvedValue(
        mockSecurityTransactions
      );
      mockPrismaService.securityPrice.findMany.mockResolvedValue(
        mockSecurityPrices
      );
      mockExchangeRatesService.getAllExchangeRates.mockResolvedValue(
        mockExchangeRates
      );

      const result = await service.exportAllData();

      expect(result.currencies).toEqual(mockCurrencies);
      expect(result.securities).toEqual(mockSecurities);
      expect(result.dividendPayments).toEqual(mockDividendPayments);
      expect(result.securityTransactions).toEqual(mockSecurityTransactions);
      expect(result.securityPrices).toEqual(mockSecurityPrices);
      expect(result.exchangeRates).toEqual(mockExchangeRates);
      expect(result.version).toBe('1.0');
      expect(result.exportedAt).toBeDefined();
      expect(typeof result.exportedAt).toBe('string');

      expect(prisma.currency.findMany).toHaveBeenCalledWith({
        orderBy: { code: 'asc' },
      });
      expect(prisma.security.findMany).toHaveBeenCalledWith({
        orderBy: { symbol: 'asc' },
      });
      expect(prisma.dividendPayment.findMany).toHaveBeenCalledWith({
        orderBy: { exDate: 'asc' },
      });
      expect(prisma.securityTransaction.findMany).toHaveBeenCalledWith({
        orderBy: { date: 'asc' },
      });
      expect(prisma.securityPrice.findMany).toHaveBeenCalledWith({
        orderBy: { date: 'asc' },
      });
    });
  });

  describe('importAllData', () => {
    it('should import data without clearing existing data', async () => {
      const importData = {
        currencies: [{ code: 'EUR', name: 'Euro' }],
        securities: [{ id: 'security-1', symbol: 'AAPL' }],
        dividendPayments: [{ id: 'payment-1', shares: 10 }],
        securityTransactions: [{ id: 'transaction-1', quantity: 5 }],
        securityPrices: [{ id: 'price-1', close: 100 }],
        exchangeRates: [{ id: 'rate-1', baseCurrency: 'EUR', targetCurrency: 'USD', rate: 1.1 }],
      };

      const mockTx = {
        currency: { upsert: jest.fn(), deleteMany: jest.fn() },
        security: { upsert: jest.fn() },
        dividendPayment: { upsert: jest.fn(), deleteMany: jest.fn() },
        securityTransaction: { upsert: jest.fn(), deleteMany: jest.fn() },
        securityPrice: { upsert: jest.fn(), deleteMany: jest.fn() },
        exchangeRate: { upsert: jest.fn(), deleteMany: jest.fn() },
      };

      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(mockTx)
      );

      const result = await service.importAllData(importData);

      expect(result.currenciesImported).toBe(1);
      expect(result.securitiesImported).toBe(1);
      expect(result.dividendPaymentsImported).toBe(1);
      expect(result.securityTransactionsImported).toBe(1);
      expect(result.securityPricesImported).toBe(1);
      expect(result.exchangeRatesImported).toBe(1);

      expect(mockTx.currency.upsert).toHaveBeenCalled();
      expect(mockTx.security.upsert).toHaveBeenCalled();
      expect(mockTx.dividendPayment.upsert).toHaveBeenCalled();
      expect(mockTx.securityTransaction.upsert).toHaveBeenCalled();
      expect(mockTx.securityPrice.upsert).toHaveBeenCalled();
      expect(mockTx.exchangeRate.upsert).toHaveBeenCalled();

      expect(mockTx.currency.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.dividendPayment.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.securityTransaction.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.securityPrice.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.exchangeRate.deleteMany).not.toHaveBeenCalled();
    });

    it('should clear existing data when requested', async () => {
      const importData = {
        securities: [{ id: 'security-1', symbol: 'AAPL' }],
      };

      const mockTx = {
        security: { upsert: jest.fn(), deleteMany: jest.fn() },
        dividendPayment: { upsert: jest.fn(), deleteMany: jest.fn() },
        securityTransaction: { upsert: jest.fn(), deleteMany: jest.fn() },
        securityPrice: { upsert: jest.fn(), deleteMany: jest.fn() },
        exchangeRate: { upsert: jest.fn(), deleteMany: jest.fn() },
        currency: { upsert: jest.fn(), deleteMany: jest.fn() },
      };

      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(mockTx)
      );

      await service.importAllData(importData, { clearExisting: true });

      expect(mockTx.currency.deleteMany).toHaveBeenCalled();
      expect(mockTx.dividendPayment.deleteMany).toHaveBeenCalled();
      expect(mockTx.securityTransaction.deleteMany).toHaveBeenCalled();
      expect(mockTx.securityPrice.deleteMany).toHaveBeenCalled();
      expect(mockTx.exchangeRate.deleteMany).toHaveBeenCalled();
      expect(mockTx.security.deleteMany).toHaveBeenCalled();
    });

    it('should handle empty import data', async () => {
      const importData = {};

      const mockTx = {
        security: { upsert: jest.fn() },
        dividendPayment: { upsert: jest.fn(), deleteMany: jest.fn() },
        securityTransaction: { upsert: jest.fn(), deleteMany: jest.fn() },
        securityPrice: { upsert: jest.fn(), deleteMany: jest.fn() },
        exchangeRate: { upsert: jest.fn(), deleteMany: jest.fn() },
        currency: { upsert: jest.fn(), deleteMany: jest.fn() },
      };

      mockPrismaService.$transaction.mockImplementation((callback) =>
        callback(mockTx)
      );

      const result = await service.importAllData(importData);

      expect(result.currenciesImported).toBe(0);
      expect(result.securitiesImported).toBe(0);
      expect(result.dividendPaymentsImported).toBe(0);
      expect(result.securityTransactionsImported).toBe(0);
      expect(result.securityPricesImported).toBe(0);
      expect(result.exchangeRatesImported).toBe(0);

      expect(mockTx.currency.upsert).not.toHaveBeenCalled();
      expect(mockTx.security.upsert).not.toHaveBeenCalled();
      expect(mockTx.dividendPayment.upsert).not.toHaveBeenCalled();
      expect(mockTx.securityTransaction.upsert).not.toHaveBeenCalled();
      expect(mockTx.securityPrice.upsert).not.toHaveBeenCalled();
      expect(mockTx.exchangeRate.upsert).not.toHaveBeenCalled();
    });
  });
});
