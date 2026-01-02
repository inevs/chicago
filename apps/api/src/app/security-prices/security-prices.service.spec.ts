import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { SecurityPricesService } from './security-prices.service';
import { PrismaService } from '../../prisma.service';

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
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityPricesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
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
        .spyOn(service as any, 'fetchHistoricalPricesWithRetry')
        .mockResolvedValue([]);

      const result = await service.syncHistoricalPrices();

      expect(result.provider).toBe('yahoo');
      expect(result.securitiesProcessed).toBe(1);
      expect(result.pricesInserted).toBe(0);
      expect(result.failures).toEqual([]);
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
        .spyOn(service as any, 'fetchHistoricalPricesWithRetry')
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
        .spyOn(service as any, 'fetchHistoricalPricesWithRetry')
        .mockResolvedValue([]);

      const result = await service.syncHistoricalPrices({ from, to });

      expect(result.from).toBe('2024-01-01');
      expect(result.to).toBe('2024-12-31');
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
        .spyOn(service as any, 'fetchHistoricalPricesWithRetry')
        .mockRejectedValueOnce(new Error('API error'));

      const result = await service.syncHistoricalPrices();

      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].symbol).toBe('AAPL');
      expect(result.failures[0].error).toBe('API error');
    });
  });
});
