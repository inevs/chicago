import { Test, TestingModule } from '@nestjs/testing';
import { Logger, BadRequestException } from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { ExchangeRatesRepository } from './exchange-rates.repository';
import { CurrenciesRepository } from '../currencies/currencies.repository';
import { EXCHANGE_RATE_PROVIDER } from './providers/exchange-rate-provider';

type MockExchangeRate = {
  id: string;
  baseCurrency: string;
  targetCurrency: string;
  date: Date;
  rate: number;
  provider: string;
};

describe('ExchangeRatesService', () => {
  let service: ExchangeRatesService;

  const mockExchangeRatesRepository = {
    upsert: jest.fn(),
    findByPairAndDate: jest.fn(),
    findLatestOnOrBefore: jest.fn(),
    findAll: jest.fn(),
    findLatestPerTargetCurrency: jest.fn(),
  };

  const mockCurrenciesRepository = {
    findCodesExcept: jest.fn(),
  };

  const mockExchangeRateProvider = {
    name: 'ecb',
    baseCurrency: 'EUR',
    fetchRates: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRatesService,
        {
          provide: ExchangeRatesRepository,
          useValue: mockExchangeRatesRepository,
        },
        {
          provide: CurrenciesRepository,
          useValue: mockCurrenciesRepository,
        },
        {
          provide: EXCHANGE_RATE_PROVIDER,
          useValue: mockExchangeRateProvider,
        },
      ],
    }).compile();

    service = module.get<ExchangeRatesService>(ExchangeRatesService);

    // Mock logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncExchangeRates', () => {
    it('should fetch rates from the provider and store them', async () => {
      const from = new Date('2025-01-01');
      const to = new Date('2025-01-03');
      mockExchangeRateProvider.fetchRates.mockResolvedValueOnce([
        { date: new Date('2025-01-01'), rate: 1.0234 },
        { date: new Date('2025-01-02'), rate: 1.0345 },
        { date: new Date('2025-01-03'), rate: 1.0456 },
      ]);
      mockExchangeRatesRepository.upsert.mockResolvedValue({} as MockExchangeRate);

      const result = await service.syncExchangeRates('USD', from, to);

      expect(mockExchangeRateProvider.fetchRates).toHaveBeenCalledWith('USD', from, to);
      expect(result).toEqual({ synced: 3, skipped: 0 });
      expect(mockExchangeRatesRepository.upsert).toHaveBeenCalledTimes(3);
      expect(mockExchangeRatesRepository.upsert).toHaveBeenCalledWith({
        baseCurrency: 'EUR',
        targetCurrency: 'USD',
        date: new Date('2025-01-01'),
        rate: 1.0234,
        provider: 'ecb',
      });
    });

    it('should return zero counts when the provider returns no rates', async () => {
      mockExchangeRateProvider.fetchRates.mockResolvedValueOnce([]);

      const result = await service.syncExchangeRates(
        'INVALID',
        new Date('2025-01-01'),
        new Date('2025-01-03')
      );

      expect(result).toEqual({ synced: 0, skipped: 0 });
      expect(mockExchangeRatesRepository.upsert).not.toHaveBeenCalled();
    });

    it('should pass on errors from the provider', async () => {
      mockExchangeRateProvider.fetchRates.mockRejectedValueOnce(
        new BadRequestException('Failed to fetch exchange rates from ECB: Network Error')
      );

      await expect(
        service.syncExchangeRates(
          'USD',
          new Date('2025-01-01'),
          new Date('2025-01-03')
        )
      ).rejects.toThrow('Failed to fetch exchange rates from ECB: Network Error');
    });

    it('should throw BadRequestException for non-EUR base currency', async () => {
      await expect(
        service.syncExchangeRates(
          'USD',
          new Date('2025-01-01'),
          new Date('2025-01-03'),
          'GBP'
        )
      ).rejects.toThrow('ECB API only supports EUR as base currency');
      expect(mockExchangeRateProvider.fetchRates).not.toHaveBeenCalled();
    });
  });

  describe('Date Validation', () => {
    it('should use default start date from environment variable', async () => {
      process.env.SECURITY_PRICE_HISTORY_START = '2020-01-01';
      const to = new Date('2020-01-02');
      mockExchangeRateProvider.fetchRates.mockResolvedValueOnce([]);

      await service.syncExchangeRates('USD', undefined, to);

      expect(mockExchangeRateProvider.fetchRates).toHaveBeenCalledWith(
        'USD',
        new Date('2020-01-01'),
        to
      );

      delete process.env.SECURITY_PRICE_HISTORY_START;
    });

    it('should fall back to 2017-01-01 if environment variable is invalid', async () => {
      process.env.SECURITY_PRICE_HISTORY_START = 'invalid-date';
      const to = new Date('2017-01-02');
      mockExchangeRateProvider.fetchRates.mockResolvedValueOnce([]);

      await service.syncExchangeRates('USD', undefined, to);

      expect(mockExchangeRateProvider.fetchRates).toHaveBeenCalledWith(
        'USD',
        new Date('2017-01-01'),
        to
      );

      delete process.env.SECURITY_PRICE_HISTORY_START;
    });

    it('should throw error for date range larger than 10 years', async () => {
      const startDate = new Date('2010-01-01');
      const endDate = new Date('2025-01-01'); // More than 10 years

      await expect(
        service.syncExchangeRates('USD', startDate, endDate)
      ).rejects.toThrow('Date range too large. Maximum 3650 days allowed.');
      expect(mockExchangeRateProvider.fetchRates).not.toHaveBeenCalled();
    });

    it('should accept valid date range within limit', async () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2025-01-01'); // 5 years, well under the limit
      mockExchangeRateProvider.fetchRates.mockResolvedValueOnce([
        { date: new Date('2020-01-01'), rate: 1.0234 },
      ]);
      mockExchangeRatesRepository.upsert.mockResolvedValue({} as MockExchangeRate);

      const result = await service.syncExchangeRates('USD', startDate, endDate);

      expect(result.synced).toBe(1);
    });

    it('should handle leap year dates correctly', async () => {
      mockExchangeRateProvider.fetchRates.mockResolvedValueOnce([
        { date: new Date('2024-02-29'), rate: 1.0234 },
      ]);
      mockExchangeRatesRepository.upsert.mockResolvedValue({} as MockExchangeRate);

      const result = await service.syncExchangeRates(
        'USD',
        new Date('2024-02-29'),
        new Date('2024-03-01')
      );

      expect(result.synced).toBe(1);
    });
  });

  describe('getExchangeRate - Fallback Logic', () => {
    it('should return 1 for same currency conversion', async () => {
      const rate = await service.getExchangeRate('EUR', 'EUR', new Date());

      expect(rate).toBe(1);
      expect(mockExchangeRatesRepository.findByPairAndDate).not.toHaveBeenCalled();
    });

    it('should return exact match when rate exists for the date', async () => {
      const testDate = new Date('2025-01-03');
      const mockRate = {
        id: 'test-id',
        baseCurrency: 'EUR',
        targetCurrency: 'USD',
        date: testDate,
        rate: 1.0234,
        provider: 'ecb',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockExchangeRatesRepository.findByPairAndDate.mockResolvedValueOnce(
        mockRate
      );

      const result = await service.getExchangeRate('EUR', 'USD', testDate);

      expect(result).toBe(1.0234);
      expect(mockExchangeRatesRepository.findByPairAndDate).toHaveBeenCalledWith(
        'EUR',
        'USD',
        testDate
      );
      expect(mockExchangeRatesRepository.findLatestOnOrBefore).not.toHaveBeenCalled();
    });

    it('should fall back to closest previous date when exact match not found', async () => {
      const requestedDate = new Date('2025-01-06'); // Weekend
      const closestDate = new Date('2025-01-03'); // Friday

      mockExchangeRatesRepository.findByPairAndDate.mockResolvedValueOnce(null);

      const mockRate = {
        id: 'test-id',
        baseCurrency: 'EUR',
        targetCurrency: 'USD',
        date: closestDate,
        rate: 1.0456,
        provider: 'ecb',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockExchangeRatesRepository.findLatestOnOrBefore.mockResolvedValueOnce(mockRate);

      const result = await service.getExchangeRate(
        'EUR',
        'USD',
        requestedDate
      );

      expect(result).toBe(1.0456);
      expect(mockExchangeRatesRepository.findLatestOnOrBefore).toHaveBeenCalledWith(
        'EUR',
        'USD',
        requestedDate
      );
    });

    it('should return null when no rate exists at all', async () => {
      mockExchangeRatesRepository.findByPairAndDate.mockResolvedValueOnce(null);
      mockExchangeRatesRepository.findLatestOnOrBefore.mockResolvedValueOnce(null);

      const result = await service.getExchangeRate(
        'EUR',
        'USD',
        new Date('2025-01-03')
      );

      expect(result).toBeNull();
    });

    it('should convert numeric rate correctly', async () => {
      const testDate = new Date('2025-01-03');
      const mockRate = {
        id: 'test-id',
        baseCurrency: 'EUR',
        targetCurrency: 'USD',
        date: testDate,
        rate: 1.0234, // Already a number
        provider: 'ecb',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockExchangeRatesRepository.findByPairAndDate.mockResolvedValueOnce(
        mockRate
      );

      const result = await service.getExchangeRate('EUR', 'USD', testDate);

      expect(result).toBe(1.0234);
      expect(typeof result).toBe('number');
    });
  });

  describe('syncAllCurrencies', () => {
    it('should sync all non-EUR currencies', async () => {
      mockCurrenciesRepository.findCodesExcept.mockResolvedValueOnce([
        'USD',
        'GBP',
        'JPY',
      ]);
      mockExchangeRateProvider.fetchRates.mockResolvedValue([
        { date: new Date('2025-01-01'), rate: 1.0234 },
      ]);
      mockExchangeRatesRepository.upsert.mockResolvedValue({} as MockExchangeRate);

      // Mock the delay
      jest.useFakeTimers();

      const promise = service.syncAllCurrencies(
        new Date('2025-01-01'),
        new Date('2025-01-02')
      );

      // Fast-forward through all delays
      for (let i = 0; i < 3; i++) {
        await jest.advanceTimersByTimeAsync(1000);
      }

      const results = await promise;

      jest.useRealTimers();

      expect(results).toEqual({
        USD: { synced: 1, skipped: 0 },
        GBP: { synced: 1, skipped: 0 },
        JPY: { synced: 1, skipped: 0 },
      });
      expect(mockCurrenciesRepository.findCodesExcept).toHaveBeenCalledWith('EUR');
    });

    it('should handle errors for individual currencies gracefully', async () => {
      mockCurrenciesRepository.findCodesExcept.mockResolvedValueOnce([
        'USD',
        'INVALID',
      ]);
      mockExchangeRateProvider.fetchRates
        .mockResolvedValueOnce([{ date: new Date('2025-01-01'), rate: 1.0234 }])
        .mockRejectedValueOnce(new BadRequestException('Currency not found'));
      mockExchangeRatesRepository.upsert.mockResolvedValue({} as MockExchangeRate);

      jest.useFakeTimers();

      const promise = service.syncAllCurrencies(
        new Date('2025-01-01'),
        new Date('2025-01-02')
      );

      for (let i = 0; i < 2; i++) {
        await jest.advanceTimersByTimeAsync(1000);
      }

      const results = await promise;

      jest.useRealTimers();

      expect(results.USD.synced).toBe(1);
      expect(results.INVALID).toEqual({ synced: 0, skipped: 0 });
    });
  });

  describe('getAllExchangeRates', () => {
    it('should return all exchange rates sorted correctly', async () => {
      const mockRates = [
        {
          id: '1',
          baseCurrency: 'EUR',
          targetCurrency: 'GBP',
          date: new Date('2025-01-01'),
          rate: 0.85,
          provider: 'ecb',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          baseCurrency: 'EUR',
          targetCurrency: 'USD',
          date: new Date('2025-01-01'),
          rate: 1.08,
          provider: 'ecb',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockExchangeRatesRepository.findAll.mockResolvedValueOnce(mockRates);

      const result = await service.getAllExchangeRates();

      expect(result).toEqual(mockRates);
      expect(mockExchangeRatesRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('Database Upsert Failures', () => {
    it('should count skipped rates when database upsert fails', async () => {
      mockExchangeRateProvider.fetchRates.mockResolvedValueOnce([
        { date: new Date('2025-01-01'), rate: 1.0234 },
        { date: new Date('2025-01-02'), rate: 1.0345 },
      ]);

      // First upsert succeeds, second fails
      mockExchangeRatesRepository.upsert
        .mockResolvedValueOnce({} as MockExchangeRate)
        .mockRejectedValueOnce(new Error('Database constraint violation'));

      const result = await service.syncExchangeRates(
        'USD',
        new Date('2025-01-01'),
        new Date('2025-01-02')
      );

      expect(result.synced).toBe(1);
      expect(result.skipped).toBe(1);
    });
  });

  describe('getLatestRatesToEur', () => {
    it('should return latest rates for all currencies using optimized query', async () => {
      const mockQueryResult = [
        {
          targetCurrency: 'USD',
          rate: 1.0845,
          date: new Date('2025-01-03'),
        },
        {
          targetCurrency: 'GBP',
          rate: 0.8567,
          date: new Date('2025-01-03'),
        },
        {
          targetCurrency: 'JPY',
          rate: 156.78,
          date: new Date('2025-01-03'),
        },
      ];

      mockExchangeRatesRepository.findLatestPerTargetCurrency.mockResolvedValueOnce(mockQueryResult);

      const result = await service.getLatestRatesToEur();

      expect(result).toEqual([
        { currency: 'USD', rate: 1.0845, date: new Date('2025-01-03') },
        { currency: 'GBP', rate: 0.8567, date: new Date('2025-01-03') },
        { currency: 'JPY', rate: 156.78, date: new Date('2025-01-03') },
      ]);
      expect(mockExchangeRatesRepository.findLatestPerTargetCurrency).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no rates exist', async () => {
      mockExchangeRatesRepository.findLatestPerTargetCurrency.mockResolvedValueOnce([]);

      const result = await service.getLatestRatesToEur();

      expect(result).toEqual([]);
      expect(mockExchangeRatesRepository.findLatestPerTargetCurrency).toHaveBeenCalledWith('EUR');
    });

    it('should handle rates with different dates per currency', async () => {
      const mockQueryResult = [
        {
          targetCurrency: 'USD',
          rate: 1.0845,
          date: new Date('2025-01-03'),
        },
        {
          targetCurrency: 'GBP',
          rate: 0.8567,
          date: new Date('2025-01-02'), // Different date
        },
      ];

      mockExchangeRatesRepository.findLatestPerTargetCurrency.mockResolvedValueOnce(mockQueryResult);

      const result = await service.getLatestRatesToEur();

      expect(result).toHaveLength(2);
      expect(result[0].currency).toBe('USD');
      expect(result[0].date).toEqual(new Date('2025-01-03'));
      expect(result[1].currency).toBe('GBP');
      expect(result[1].date).toEqual(new Date('2025-01-02'));
    });

    it('should correctly convert rate to number', async () => {
      // The repository might return Decimal or string from database
      const mockQueryResult = [
        {
          targetCurrency: 'USD',
          rate: '1.0845', // String representation
          date: new Date('2025-01-03'),
        },
      ];

      mockExchangeRatesRepository.findLatestPerTargetCurrency.mockResolvedValueOnce(mockQueryResult);

      const result = await service.getLatestRatesToEur();

      expect(result[0].rate).toBe(1.0845);
      expect(typeof result[0].rate).toBe('number');
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection lost');
      mockExchangeRatesRepository.findLatestPerTargetCurrency.mockRejectedValueOnce(dbError);

      await expect(service.getLatestRatesToEur()).rejects.toThrow('Database connection lost');
      expect(mockExchangeRatesRepository.findLatestPerTargetCurrency).toHaveBeenCalledTimes(1);
    });

    it('should only return one rate per currency (most recent)', async () => {
      // DISTINCT ON ensures only the latest rate per currency
      const mockQueryResult = [
        { targetCurrency: 'USD', rate: 1.0845, date: new Date('2025-01-03') },
        { targetCurrency: 'GBP', rate: 0.8567, date: new Date('2025-01-03') },
        { targetCurrency: 'JPY', rate: 156.78, date: new Date('2025-01-03') },
      ];

      mockExchangeRatesRepository.findLatestPerTargetCurrency.mockResolvedValueOnce(mockQueryResult);

      const result = await service.getLatestRatesToEur();

      // Verify no duplicates
      const currencies = result.map(r => r.currency);
      const uniqueCurrencies = [...new Set(currencies)];
      expect(currencies.length).toBe(uniqueCurrencies.length);
    });
  });
});
