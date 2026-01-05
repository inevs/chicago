import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { SecurityPricesService } from './security-prices.service';
import { PrismaService } from '../../prisma.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';

// Helper type to access private methods for testing
type SecurityPricesServiceWithPrivates = SecurityPricesService & {
  fetchHistoricalPricesWithRetry: (symbol: string, from: Date, to: Date) => Promise<unknown[]>;
};

describe('SecurityPricesService', () => {
  let service: SecurityPricesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
    security: {
      findMany: jest.fn(),
    },
    securityPrice: {
      createMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockExchangeRatesService = {
    syncAllCurrencies: jest.fn().mockResolvedValue({
      USD: { synced: 10, skipped: 0 },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityPricesService,
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

    service = module.get<SecurityPricesService>(SecurityPricesService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLatestPrices', () => {
    it('should return latest prices for all securities', async () => {
      const mockRawPrices = [
        {
          id: 'price-1',
          securityId: 'security-1',
          date: new Date('2024-01-01'),
          open: 100.5,
          high: 105.2,
          low: 99.8,
          close: 103.5,
          volume: 1000000,
          currency: 'USD',
          provider: 'yahoo',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawPrices);

      const result = await service.getLatestPrices();

      expect(result).toEqual(mockRawPrices);
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('should handle Decimal types from database', async () => {
      const mockRawPrices = [
        {
          id: 'price-1',
          securityId: 'security-1',
          date: new Date('2024-01-01'),
          open: { toNumber: () => 100.5 },
          high: { toNumber: () => 105.2 },
          low: { toNumber: () => 99.8 },
          close: { toNumber: () => 103.5 },
          volume: { toNumber: () => 1000000 },
          currency: 'USD',
          provider: 'yahoo',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawPrices);

      const result = await service.getLatestPrices();

      expect(result[0].open).toBe(100.5);
      expect(result[0].high).toBe(105.2);
      expect(result[0].low).toBe(99.8);
      expect(result[0].close).toBe(103.5);
      expect(result[0].volume).toBe(1000000);
    });

    it('should handle null volume', async () => {
      const mockRawPrices = [
        {
          id: 'price-1',
          securityId: 'security-1',
          date: new Date('2024-01-01'),
          open: 100.5,
          high: 105.2,
          low: 99.8,
          close: 103.5,
          volume: null,
          currency: 'USD',
          provider: 'yahoo',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockRawPrices);

      const result = await service.getLatestPrices();

      expect(result[0].volume).toBeNull();
    });
  });

  describe('syncHistoricalPrices', () => {
    it('should sync prices for all securities when no options provided', async () => {
      const mockSecurities = [
        {
          id: 'security-1',
          symbol: 'AAPL',
          currency: 'USD',
        },
      ];

      mockPrismaService.security.findMany.mockResolvedValue(mockSecurities);
      mockPrismaService.securityPrice.createMany.mockResolvedValue({
        count: 0,
      });

      // Mock the private fetchHistoricalPricesWithRetry to return empty
      jest
        .spyOn(service as SecurityPricesServiceWithPrivates, 'fetchHistoricalPricesWithRetry')
        .mockResolvedValue([]);

      const result = await service.syncHistoricalPrices();

      expect(result.provider).toBe('yahoo');
      expect(result.securitiesProcessed).toBe(1);
      expect(result.pricesInserted).toBe(0);
      expect(result.failures).toEqual([]);
      expect(result.exchangeRates.synced).toBe(true);
      expect(result.exchangeRates.currencies).toEqual({
        USD: { synced: 10, skipped: 0 },
      });
      expect(prisma.security.findMany).toHaveBeenCalled();
    });

    it('should filter by security ID when provided', async () => {
      const mockSecurities = [
        {
          id: 'security-1',
          symbol: 'AAPL',
          currency: 'USD',
        },
      ];

      mockPrismaService.security.findMany.mockResolvedValue(mockSecurities);
      mockPrismaService.securityPrice.createMany.mockResolvedValue({
        count: 0,
      });

      jest
        .spyOn(service as SecurityPricesServiceWithPrivates, 'fetchHistoricalPricesWithRetry')
        .mockResolvedValue([]);

      await service.syncHistoricalPrices({ securityId: 'security-1' });

      expect(prisma.security.findMany).toHaveBeenCalledWith({
        where: { id: 'security-1' },
        orderBy: { symbol: 'asc' },
      });
    });

    it('should handle date range options', async () => {
      const mockSecurities = [
        {
          id: 'security-1',
          symbol: 'AAPL',
          currency: 'USD',
        },
      ];
      const from = new Date('2024-01-01');
      const to = new Date('2024-12-31');

      mockPrismaService.security.findMany.mockResolvedValue(mockSecurities);
      mockPrismaService.securityPrice.createMany.mockResolvedValue({
        count: 0,
      });

      jest
        .spyOn(service as SecurityPricesServiceWithPrivates, 'fetchHistoricalPricesWithRetry')
        .mockResolvedValue([]);

      const result = await service.syncHistoricalPrices({ from, to });

      expect(result.from).toBe('2024-01-01');
      expect(result.to).toBe('2024-12-31');
      expect(result.exchangeRates.synced).toBe(true);
    });

    it('should track failures when fetching prices fails', async () => {
      const mockSecurities = [
        {
          id: 'security-1',
          symbol: 'AAPL',
          currency: 'USD',
        },
      ];

      mockPrismaService.security.findMany.mockResolvedValue(mockSecurities);

      jest
        .spyOn(service as SecurityPricesServiceWithPrivates, 'fetchHistoricalPricesWithRetry')
        .mockRejectedValueOnce(new Error('API error'));

      const result = await service.syncHistoricalPrices();

      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].symbol).toBe('AAPL');
      expect(result.failures[0].error).toBe('API error');
      expect(result.exchangeRates.synced).toBe(true);
    });

    it('should handle exchange rate sync failures gracefully', async () => {
      const mockSecurities = [
        {
          id: 'security-1',
          symbol: 'AAPL',
          currency: 'USD',
        },
      ];

      mockPrismaService.security.findMany.mockResolvedValue(mockSecurities);
      mockPrismaService.securityPrice.createMany.mockResolvedValue({
        count: 5,
      });

      jest
        .spyOn(service as SecurityPricesServiceWithPrivates, 'fetchHistoricalPricesWithRetry')
        .mockResolvedValue([
          {
            date: new Date('2024-01-01'),
            open: 100,
            high: 105,
            low: 99,
            close: 102,
            volume: 1000000,
            currency: 'USD',
          },
        ]);

      // Mock exchange rate sync to fail
      mockExchangeRatesService.syncAllCurrencies.mockRejectedValueOnce(
        new Error('Exchange rate API error')
      );

      const result = await service.syncHistoricalPrices();

      // Price sync should succeed
      expect(result.pricesInserted).toBe(5);
      expect(result.failures).toEqual([]);

      // Exchange rate sync should be marked as failed with error message
      expect(result.exchangeRates.synced).toBe(false);
      expect(result.exchangeRates.error).toBe('Exchange rate API error');
      expect(result.exchangeRates.currencies).toBeUndefined();
    });
  });

  describe('getLastPriceUpdateDate', () => {
    it('should return the latest price date for a specific security', async () => {
      const mockDate = new Date('2024-12-31');
      mockPrismaService.securityPrice.findFirst.mockResolvedValue({
        date: mockDate,
      });

      const result = await service.getLastPriceUpdateDate('security-1');

      expect(result).toEqual(mockDate);
      expect(prisma.securityPrice.findFirst).toHaveBeenCalledWith({
        where: { securityId: 'security-1' },
        orderBy: { date: 'desc' },
        select: { date: true },
      });
    });

    it('should return null when no prices exist for a specific security', async () => {
      mockPrismaService.securityPrice.findFirst.mockResolvedValue(null);

      const result = await service.getLastPriceUpdateDate('security-1');

      expect(result).toBeNull();
    });

    it('should return the earliest last update date across all securities', async () => {
      const mockDate = new Date('2024-11-01');
      mockPrismaService.$queryRaw.mockResolvedValue([
        { min_date: mockDate },
      ]);

      const result = await service.getLastPriceUpdateDate();

      expect(result).toEqual(mockDate);
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('should return null when no prices exist for any security', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([
        { min_date: null },
      ]);

      const result = await service.getLastPriceUpdateDate();

      expect(result).toBeNull();
    });
  });
});
