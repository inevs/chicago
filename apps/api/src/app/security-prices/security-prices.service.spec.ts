import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { SecurityPricesService } from './security-prices.service';
import { SecurityPricesRepository } from './security-prices.repository';
import { SecuritiesRepository } from '../securities/securities.repository';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { PRICE_PROVIDER, PriceProviderRateLimitError } from './providers/price-provider';

describe('SecurityPricesService', () => {
  let service: SecurityPricesService;

  const mockSecurityPricesRepository = {
    findLatestPerSecurity: jest.fn(),
    findLatestDateBySecurityId: jest.fn(),
    findEarliestLatestDate: jest.fn(),
    createMany: jest.fn(),
  };

  const mockSecuritiesRepository = {
    findAllOrById: jest.fn(),
  };

  const mockExchangeRatesService = {
    syncAllCurrencies: jest.fn().mockResolvedValue({
      USD: { synced: 10, skipped: 0 },
    }),
  };

  const mockPriceProvider = {
    name: 'yahoo',
    fetchPrices: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityPricesService,
        {
          provide: SecurityPricesRepository,
          useValue: mockSecurityPricesRepository,
        },
        {
          provide: SecuritiesRepository,
          useValue: mockSecuritiesRepository,
        },
        {
          provide: ExchangeRatesService,
          useValue: mockExchangeRatesService,
        },
        {
          provide: PRICE_PROVIDER,
          useValue: mockPriceProvider,
        },
      ],
    }).compile();

    service = module.get<SecurityPricesService>(SecurityPricesService);

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

      mockSecurityPricesRepository.findLatestPerSecurity.mockResolvedValue(mockRawPrices);

      const result = await service.getLatestPrices();

      expect(result).toEqual(mockRawPrices);
      expect(mockSecurityPricesRepository.findLatestPerSecurity).toHaveBeenCalled();
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

      mockSecurityPricesRepository.findLatestPerSecurity.mockResolvedValue(mockRawPrices);

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

      mockSecurityPricesRepository.findLatestPerSecurity.mockResolvedValue(mockRawPrices);

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

      mockSecuritiesRepository.findAllOrById.mockResolvedValue(mockSecurities);
      mockSecurityPricesRepository.createMany.mockResolvedValue(0);

      mockPriceProvider.fetchPrices.mockResolvedValue([]);

      const result = await service.syncHistoricalPrices();

      expect(result.provider).toBe('yahoo');
      expect(result.securitiesProcessed).toBe(1);
      expect(result.pricesInserted).toBe(0);
      expect(result.failures).toEqual([]);
      expect(result.exchangeRates.synced).toBe(true);
      expect(result.exchangeRates.currencies).toEqual({
        USD: { synced: 10, skipped: 0 },
      });
      expect(mockSecuritiesRepository.findAllOrById).toHaveBeenCalledWith(undefined);
    });

    it('should filter by security ID when provided', async () => {
      const mockSecurities = [
        {
          id: 'security-1',
          symbol: 'AAPL',
          currency: 'USD',
        },
      ];

      mockSecuritiesRepository.findAllOrById.mockResolvedValue(mockSecurities);
      mockSecurityPricesRepository.createMany.mockResolvedValue(0);

      mockPriceProvider.fetchPrices.mockResolvedValue([]);

      await service.syncHistoricalPrices({ securityId: 'security-1' });

      expect(mockSecuritiesRepository.findAllOrById).toHaveBeenCalledWith(
        'security-1'
      );
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

      mockSecuritiesRepository.findAllOrById.mockResolvedValue(mockSecurities);
      mockSecurityPricesRepository.createMany.mockResolvedValue(0);

      mockPriceProvider.fetchPrices.mockResolvedValue([]);

      const result = await service.syncHistoricalPrices({ from, to });

      expect(result.from).toBe('2024-01-01');
      expect(result.to).toBe('2024-12-31');
      expect(result.exchangeRates.synced).toBe(true);
      expect(mockPriceProvider.fetchPrices).toHaveBeenCalledWith(
        mockSecurities[0],
        from,
        to
      );
    });

    it('should track failures when fetching prices fails', async () => {
      const mockSecurities = [
        {
          id: 'security-1',
          symbol: 'AAPL',
          currency: 'USD',
        },
      ];

      mockSecuritiesRepository.findAllOrById.mockResolvedValue(mockSecurities);

      mockPriceProvider.fetchPrices.mockRejectedValueOnce(new Error('API error'));

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

      mockSecuritiesRepository.findAllOrById.mockResolvedValue(mockSecurities);
      mockSecurityPricesRepository.createMany.mockResolvedValue(5);

      mockPriceProvider.fetchPrices.mockResolvedValue([
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
      expect(mockSecurityPricesRepository.createMany).toHaveBeenCalledWith([
        {
          id: expect.any(String),
          securityId: 'security-1',
          date: new Date('2024-01-01'),
          open: 100,
          high: 105,
          low: 99,
          close: 102,
          volume: 1000000,
          currency: 'USD',
          provider: 'yahoo',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      ]);

      // Exchange rate sync should be marked as failed with error message
      expect(result.exchangeRates.synced).toBe(false);
      expect(result.exchangeRates.error).toBe('Exchange rate API error');
      expect(result.exchangeRates.currencies).toBeUndefined();
    });
  });

  describe('syncHistoricalPrices - rate limiting', () => {
    const mockSecurities = [{ id: 'security-1', symbol: 'AAPL', currency: 'USD' }];

    beforeEach(() => {
      jest.useFakeTimers();
      mockSecuritiesRepository.findAllOrById.mockResolvedValue(mockSecurities);
      mockSecurityPricesRepository.createMany.mockResolvedValue(0);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should retry with backoff when the provider signals rate limiting', async () => {
      mockPriceProvider.fetchPrices
        .mockRejectedValueOnce(new PriceProviderRateLimitError())
        .mockResolvedValueOnce([]);

      const promise = service.syncHistoricalPrices();
      // 1 s delay before the request, 1 s backoff before the retry
      await jest.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(mockPriceProvider.fetchPrices).toHaveBeenCalledTimes(2);
      expect(result.failures).toEqual([]);
    });

    it('should report a failure after three rate-limited attempts', async () => {
      mockPriceProvider.fetchPrices.mockRejectedValue(new PriceProviderRateLimitError());

      const promise = service.syncHistoricalPrices();
      // 1 s delay before the request, backoff of 1 s, 2 s and 4 s
      await jest.advanceTimersByTimeAsync(8000);
      const result = await promise;

      expect(mockPriceProvider.fetchPrices).toHaveBeenCalledTimes(3);
      expect(result.failures).toEqual([
        { symbol: 'AAPL', error: 'Rate limit exceeded' },
      ]);
    });

    it('should not retry other provider errors', async () => {
      mockPriceProvider.fetchPrices.mockRejectedValue(new Error('API error'));

      const promise = service.syncHistoricalPrices();
      await jest.advanceTimersByTimeAsync(1000);
      const result = await promise;

      expect(mockPriceProvider.fetchPrices).toHaveBeenCalledTimes(1);
      expect(result.failures).toEqual([{ symbol: 'AAPL', error: 'API error' }]);
    });
  });

  describe('getLastPriceUpdateDate', () => {
    it('should return the latest price date for a specific security', async () => {
      const mockDate = new Date('2024-12-31');
      mockSecurityPricesRepository.findLatestDateBySecurityId.mockResolvedValue(
        mockDate
      );

      const result = await service.getLastPriceUpdateDate('security-1');

      expect(result).toEqual(mockDate);
      expect(
        mockSecurityPricesRepository.findLatestDateBySecurityId
      ).toHaveBeenCalledWith('security-1');
      expect(
        mockSecurityPricesRepository.findEarliestLatestDate
      ).not.toHaveBeenCalled();
    });

    it('should return null when no prices exist for a specific security', async () => {
      mockSecurityPricesRepository.findLatestDateBySecurityId.mockResolvedValue(
        null
      );

      const result = await service.getLastPriceUpdateDate('security-1');

      expect(result).toBeNull();
    });

    it('should return the earliest last update date across all securities', async () => {
      const mockDate = new Date('2024-11-01');
      mockSecurityPricesRepository.findEarliestLatestDate.mockResolvedValue(
        mockDate
      );

      const result = await service.getLastPriceUpdateDate();

      expect(result).toEqual(mockDate);
      expect(
        mockSecurityPricesRepository.findEarliestLatestDate
      ).toHaveBeenCalled();
      expect(
        mockSecurityPricesRepository.findLatestDateBySecurityId
      ).not.toHaveBeenCalled();
    });

    it('should return null when no prices exist for any security', async () => {
      mockSecurityPricesRepository.findEarliestLatestDate.mockResolvedValue(
        null
      );

      const result = await service.getLastPriceUpdateDate();

      expect(result).toBeNull();
    });
  });
});
