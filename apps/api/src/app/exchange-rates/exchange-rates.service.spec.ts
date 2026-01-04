import { Test, TestingModule } from '@nestjs/testing';
import { Logger, BadRequestException } from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { PrismaService } from '../../prisma.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ExchangeRatesService', () => {
  let service: ExchangeRatesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    exchangeRate: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    currency: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRatesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ExchangeRatesService>(ExchangeRatesService);
    prisma = module.get<PrismaService>(PrismaService);

    // Mock logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CSV Parsing', () => {
    it('should parse valid ECB CSV data correctly', async () => {
      const validCsv = `KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-01,1.0234
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-02,1.0345
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-03,1.0456`;

      mockedAxios.get.mockResolvedValueOnce({
        data: validCsv,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      mockPrismaService.exchangeRate.upsert.mockResolvedValue({
        id: 'test-id',
        baseCurrency: 'EUR',
        targetCurrency: 'USD',
        date: new Date('2025-01-01'),
        rate: 1.0234,
        provider: 'ecb',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.syncExchangeRates(
        'USD',
        new Date('2025-01-01'),
        new Date('2025-01-03')
      );

      expect(result.synced).toBe(3);
      expect(result.skipped).toBe(0);
      expect(mockPrismaService.exchangeRate.upsert).toHaveBeenCalledTimes(3);
    });

    it('should handle CSV with extra whitespace', async () => {
      const csvWithWhitespace = `KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,  2025-01-01  ,  1.0234
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-02,1.0345  `;

      mockedAxios.get.mockResolvedValueOnce({
        data: csvWithWhitespace,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      mockPrismaService.exchangeRate.upsert.mockResolvedValue({} as any);

      const result = await service.syncExchangeRates(
        'USD',
        new Date('2025-01-01'),
        new Date('2025-01-02')
      );

      expect(result.synced).toBe(2);
    });

    it('should skip CSV rows with invalid dates', async () => {
      const csvWithInvalidDates = `KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-01,1.0234
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,invalid-date,1.0345
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-03,1.0456`;

      mockedAxios.get.mockResolvedValueOnce({
        data: csvWithInvalidDates,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      mockPrismaService.exchangeRate.upsert.mockResolvedValue({} as any);

      const result = await service.syncExchangeRates(
        'USD',
        new Date('2025-01-01'),
        new Date('2025-01-03')
      );

      // Should only sync 2 valid rows
      expect(result.synced).toBe(2);
    });

    it('should skip CSV rows with invalid rate values', async () => {
      const csvWithInvalidRates = `KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-01,1.0234
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-02,not-a-number
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-03,1.0456`;

      mockedAxios.get.mockResolvedValueOnce({
        data: csvWithInvalidRates,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      mockPrismaService.exchangeRate.upsert.mockResolvedValue({} as any);

      const result = await service.syncExchangeRates(
        'USD',
        new Date('2025-01-01'),
        new Date('2025-01-03')
      );

      expect(result.synced).toBe(2);
    });

    it('should handle empty CSV', async () => {
      const emptyCsv = `KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE`;

      mockedAxios.get.mockResolvedValueOnce({
        data: emptyCsv,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await service.syncExchangeRates(
        'USD',
        new Date('2025-01-01'),
        new Date('2025-01-03')
      );

      expect(result.synced).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('should skip CSV rows with missing columns', async () => {
      const csvWithMissingColumns = `KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-01,1.0234
EXR.D.USD.EUR.SP00.A,D,USD
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-03,1.0456`;

      mockedAxios.get.mockResolvedValueOnce({
        data: csvWithMissingColumns,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      mockPrismaService.exchangeRate.upsert.mockResolvedValue({} as any);

      const result = await service.syncExchangeRates(
        'USD',
        new Date('2025-01-01'),
        new Date('2025-01-03')
      );

      expect(result.synced).toBe(2);
    });

    it('should handle CSV with empty lines', async () => {
      const csvWithEmptyLines = `KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-01,1.0234

EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-02,1.0345

`;

      mockedAxios.get.mockResolvedValueOnce({
        data: csvWithEmptyLines,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      mockPrismaService.exchangeRate.upsert.mockResolvedValue({} as any);

      const result = await service.syncExchangeRates(
        'USD',
        new Date('2025-01-01'),
        new Date('2025-01-02')
      );

      expect(result.synced).toBe(2);
    });

    it('should handle CSV with missing required columns in header', async () => {
      const csvMissingColumns = `KEY,FREQ,CURRENCY,CURRENCY_DENOM
EXR.D.USD.EUR.SP00.A,D,USD,EUR`;

      const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn');

      mockedAxios.get.mockResolvedValueOnce({
        data: csvMissingColumns,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await service.syncExchangeRates(
        'USD',
        new Date('2025-01-01'),
        new Date('2025-01-03')
      );

      expect(result.synced).toBe(0);
      expect(result.skipped).toBe(0);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing required columns')
      );
    });

    it('should handle CSV with columns in different order', async () => {
      // Columns in different order: OBS_VALUE before TIME_PERIOD
      const csvDifferentOrder = `KEY,FREQ,CURRENCY,OBS_VALUE,TIME_PERIOD,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX
EXR.D.USD.EUR.SP00.A,D,USD,1.0234,2025-01-01,EUR,SP00,A
EXR.D.USD.EUR.SP00.A,D,USD,1.0345,2025-01-02,EUR,SP00,A`;

      mockedAxios.get.mockResolvedValueOnce({
        data: csvDifferentOrder,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      mockPrismaService.exchangeRate.upsert.mockResolvedValue({} as any);

      const result = await service.syncExchangeRates(
        'USD',
        new Date('2025-01-01'),
        new Date('2025-01-02')
      );

      expect(result.synced).toBe(2);
      expect(mockPrismaService.exchangeRate.upsert).toHaveBeenCalledTimes(2);
    });

    it('should handle completely empty CSV response', async () => {
      const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn');

      mockedAxios.get.mockResolvedValueOnce({
        data: '',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await service.syncExchangeRates(
        'USD',
        new Date('2025-01-01'),
        new Date('2025-01-03')
      );

      expect(result.synced).toBe(0);
      expect(result.skipped).toBe(0);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'ECB CSV header line is empty'
      );
    });
  });

  describe('API Error Handling', () => {
    it('should handle 404 errors and return empty result', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 404 },
        message: 'Not Found',
      };

      mockedAxios.get.mockRejectedValueOnce(error);
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      const result = await service.syncExchangeRates(
        'INVALID',
        new Date('2025-01-01'),
        new Date('2025-01-03')
      );

      expect(result.synced).toBe(0);
      expect(result.skipped).toBe(0);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Currency INVALID not found in ECB data'
      );
    });

    it('should throw BadRequestException on timeout', async () => {
      const error = {
        isAxiosError: true,
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
      };

      mockedAxios.get.mockRejectedValueOnce(error);
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      await expect(
        service.syncExchangeRates(
          'USD',
          new Date('2025-01-01'),
          new Date('2025-01-03')
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on network error', async () => {
      const error = {
        isAxiosError: true,
        message: 'Network Error',
      };

      mockedAxios.get.mockRejectedValueOnce(error);
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      await expect(
        service.syncExchangeRates(
          'USD',
          new Date('2025-01-01'),
          new Date('2025-01-03')
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on 500 server error', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 500 },
        message: 'Internal Server Error',
      };

      mockedAxios.get.mockRejectedValueOnce(error);
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      await expect(
        service.syncExchangeRates(
          'USD',
          new Date('2025-01-01'),
          new Date('2025-01-03')
        )
      ).rejects.toThrow(BadRequestException);
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
    });

    it('should handle malformed API response gracefully', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: null,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      await expect(
        service.syncExchangeRates(
          'USD',
          new Date('2025-01-01'),
          new Date('2025-01-03')
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Date Validation', () => {
    it('should use default start date from environment variable', async () => {
      process.env.SECURITY_PRICE_HISTORY_START = '2020-01-01';

      const validCsv = `KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2020-01-01,1.0234`;

      mockedAxios.get.mockResolvedValueOnce({
        data: validCsv,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      mockPrismaService.exchangeRate.upsert.mockResolvedValue({} as any);

      await service.syncExchangeRates('USD', undefined, new Date('2020-01-02'));

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            startPeriod: '2020-01-01',
          }),
        })
      );

      delete process.env.SECURITY_PRICE_HISTORY_START;
    });

    it('should fall back to 2017-01-01 if environment variable is invalid', async () => {
      process.env.SECURITY_PRICE_HISTORY_START = 'invalid-date';

      const validCsv = `KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2017-01-01,1.0234`;

      mockedAxios.get.mockResolvedValueOnce({
        data: validCsv,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      mockPrismaService.exchangeRate.upsert.mockResolvedValue({} as any);

      await service.syncExchangeRates('USD', undefined, new Date('2017-01-02'));

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            startPeriod: '2017-01-01',
          }),
        })
      );

      delete process.env.SECURITY_PRICE_HISTORY_START;
    });

    it('should throw error for date range larger than 10 years', async () => {
      const startDate = new Date('2010-01-01');
      const endDate = new Date('2025-01-01'); // More than 10 years

      await expect(
        service.syncExchangeRates('USD', startDate, endDate)
      ).rejects.toThrow('Date range too large. Maximum 3650 days allowed.');
    });

    it('should accept valid date range within limit', async () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2025-01-01'); // 5 years, well under the limit

      const validCsv = `KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2020-01-01,1.0234`;

      mockedAxios.get.mockResolvedValueOnce({
        data: validCsv,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      mockPrismaService.exchangeRate.upsert.mockResolvedValue({} as any);

      const result = await service.syncExchangeRates('USD', startDate, endDate);
      expect(result).toBeDefined();
      expect(result.synced).toBe(1);
    });

    it('should handle leap year dates correctly', async () => {
      const validCsv = `KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2024-02-29,1.0234`;

      mockedAxios.get.mockResolvedValueOnce({
        data: validCsv,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      mockPrismaService.exchangeRate.upsert.mockResolvedValue({} as any);

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
      expect(mockPrismaService.exchangeRate.findUnique).not.toHaveBeenCalled();
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

      mockPrismaService.exchangeRate.findUnique.mockResolvedValueOnce(
        mockRate
      );

      const result = await service.getExchangeRate('EUR', 'USD', testDate);

      expect(result).toBe(1.0234);
      expect(mockPrismaService.exchangeRate.findUnique).toHaveBeenCalledWith({
        where: {
          baseCurrency_targetCurrency_date: {
            baseCurrency: 'EUR',
            targetCurrency: 'USD',
            date: testDate,
          },
        },
      });
    });

    it('should fall back to closest previous date when exact match not found', async () => {
      const requestedDate = new Date('2025-01-06'); // Weekend
      const closestDate = new Date('2025-01-03'); // Friday

      mockPrismaService.exchangeRate.findUnique.mockResolvedValueOnce(null);

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

      mockPrismaService.exchangeRate.findFirst.mockResolvedValueOnce(mockRate);

      const result = await service.getExchangeRate(
        'EUR',
        'USD',
        requestedDate
      );

      expect(result).toBe(1.0456);
      expect(mockPrismaService.exchangeRate.findFirst).toHaveBeenCalledWith({
        where: {
          baseCurrency: 'EUR',
          targetCurrency: 'USD',
          date: {
            lte: requestedDate,
          },
        },
        orderBy: {
          date: 'desc',
        },
      });
    });

    it('should return null when no rate exists at all', async () => {
      mockPrismaService.exchangeRate.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.exchangeRate.findFirst.mockResolvedValueOnce(null);

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

      mockPrismaService.exchangeRate.findUnique.mockResolvedValueOnce(
        mockRate
      );

      const result = await service.getExchangeRate('EUR', 'USD', testDate);

      expect(result).toBe(1.0234);
      expect(typeof result).toBe('number');
    });
  });

  describe('syncAllCurrencies', () => {
    it('should sync all non-EUR currencies', async () => {
      mockPrismaService.currency.findMany.mockResolvedValueOnce([
        { code: 'USD' },
        { code: 'GBP' },
        { code: 'JPY' },
      ]);

      const validCsv = `KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-01,1.0234`;

      mockedAxios.get.mockResolvedValue({
        data: validCsv,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      mockPrismaService.exchangeRate.upsert.mockResolvedValue({} as any);

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

      expect(results).toHaveProperty('USD');
      expect(results).toHaveProperty('GBP');
      expect(results).toHaveProperty('JPY');
      expect(results.USD.synced).toBeGreaterThan(0);
    });

    it('should handle errors for individual currencies gracefully', async () => {
      mockPrismaService.currency.findMany.mockResolvedValueOnce([
        { code: 'USD' },
        { code: 'INVALID' },
      ]);

      const validCsv = `KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-01,1.0234`;

      mockedAxios.get
        .mockResolvedValueOnce({
          data: validCsv,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        })
        .mockRejectedValueOnce(new Error('Currency not found'));

      mockPrismaService.exchangeRate.upsert.mockResolvedValue({} as any);
      mockedAxios.isAxiosError.mockReturnValue(false);

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

      expect(results.USD.synced).toBeGreaterThan(0);
      expect(results.INVALID.synced).toBe(0);
      expect(results.INVALID.skipped).toBe(0);
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

      mockPrismaService.exchangeRate.findMany.mockResolvedValueOnce(mockRates);

      const result = await service.getAllExchangeRates();

      expect(result).toEqual(mockRates);
      expect(mockPrismaService.exchangeRate.findMany).toHaveBeenCalledWith({
        orderBy: [
          { baseCurrency: 'asc' },
          { targetCurrency: 'asc' },
          { date: 'asc' },
        ],
      });
    });
  });

  describe('Database Upsert Failures', () => {
    it('should count skipped rates when database upsert fails', async () => {
      const validCsv = `KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-01,1.0234
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-02,1.0345`;

      mockedAxios.get.mockResolvedValueOnce({
        data: validCsv,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      // First upsert succeeds, second fails
      mockPrismaService.exchangeRate.upsert
        .mockResolvedValueOnce({} as any)
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
});
