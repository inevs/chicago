import { Logger, BadRequestException } from '@nestjs/common';
import axios, { InternalAxiosRequestConfig } from 'axios';
import { EcbExchangeRateProvider } from './ecb-exchange-rate.provider';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const CSV_HEADER =
  'KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE';

function mockCsvResponse(data: unknown) {
  mockedAxios.get.mockResolvedValueOnce({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  });
}

describe('EcbExchangeRateProvider', () => {
  let provider: EcbExchangeRateProvider;
  const from = new Date('2025-01-01');
  const to = new Date('2025-01-03');

  beforeEach(() => {
    provider = new EcbExchangeRateProvider();

    // Mock logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should identify itself as "ecb" with EUR as base currency', () => {
    expect(provider.name).toBe('ecb');
    expect(provider.baseCurrency).toBe('EUR');
  });

  describe('Request', () => {
    it('should request daily EUR rates for the target currency as CSV', async () => {
      mockCsvResponse(CSV_HEADER);

      await provider.fetchRates('USD', from, to);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A',
        {
          params: {
            startPeriod: '2025-01-01',
            endPeriod: '2025-01-03',
            format: 'csvdata',
          },
          timeout: 30000,
          headers: { Accept: 'text/csv' },
        }
      );
    });
  });

  describe('CSV Parsing', () => {
    it('should parse valid ECB CSV data correctly', async () => {
      mockCsvResponse(`${CSV_HEADER}
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-01,1.0234
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-02,1.0345
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-03,1.0456`);

      const rates = await provider.fetchRates('USD', from, to);

      expect(rates).toEqual([
        { date: new Date('2025-01-01'), rate: 1.0234 },
        { date: new Date('2025-01-02'), rate: 1.0345 },
        { date: new Date('2025-01-03'), rate: 1.0456 },
      ]);
    });

    it('should handle CSV with extra whitespace', async () => {
      mockCsvResponse(`${CSV_HEADER}
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,  2025-01-01  ,  1.0234
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-02,1.0345  `);

      const rates = await provider.fetchRates('USD', from, to);

      expect(rates).toEqual([
        { date: new Date('2025-01-01'), rate: 1.0234 },
        { date: new Date('2025-01-02'), rate: 1.0345 },
      ]);
    });

    it('should skip CSV rows with invalid dates', async () => {
      mockCsvResponse(`${CSV_HEADER}
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-01,1.0234
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,invalid-date,1.0345
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-03,1.0456`);

      const rates = await provider.fetchRates('USD', from, to);

      expect(rates).toEqual([
        { date: new Date('2025-01-01'), rate: 1.0234 },
        { date: new Date('2025-01-03'), rate: 1.0456 },
      ]);
    });

    it('should skip CSV rows with invalid rate values', async () => {
      mockCsvResponse(`${CSV_HEADER}
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-01,1.0234
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-02,not-a-number
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-03,1.0456`);

      const rates = await provider.fetchRates('USD', from, to);

      expect(rates).toEqual([
        { date: new Date('2025-01-01'), rate: 1.0234 },
        { date: new Date('2025-01-03'), rate: 1.0456 },
      ]);
    });

    it('should return no rates for a CSV with only a header', async () => {
      mockCsvResponse(CSV_HEADER);

      const rates = await provider.fetchRates('USD', from, to);

      expect(rates).toEqual([]);
    });

    it('should skip CSV rows with missing columns', async () => {
      mockCsvResponse(`${CSV_HEADER}
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-01,1.0234
EXR.D.USD.EUR.SP00.A,D,USD
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-03,1.0456`);

      const rates = await provider.fetchRates('USD', from, to);

      expect(rates).toEqual([
        { date: new Date('2025-01-01'), rate: 1.0234 },
        { date: new Date('2025-01-03'), rate: 1.0456 },
      ]);
    });

    it('should handle CSV with empty lines', async () => {
      mockCsvResponse(`${CSV_HEADER}
EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-01,1.0234

EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2025-01-02,1.0345

`);

      const rates = await provider.fetchRates('USD', from, to);

      expect(rates).toEqual([
        { date: new Date('2025-01-01'), rate: 1.0234 },
        { date: new Date('2025-01-02'), rate: 1.0345 },
      ]);
    });

    it('should return no rates and warn when required columns are missing in the header', async () => {
      mockCsvResponse(`KEY,FREQ,CURRENCY,CURRENCY_DENOM
EXR.D.USD.EUR.SP00.A,D,USD,EUR`);

      const rates = await provider.fetchRates('USD', from, to);

      expect(rates).toEqual([]);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('missing required columns')
      );
    });

    it('should handle CSV with columns in different order', async () => {
      // Columns in different order: OBS_VALUE before TIME_PERIOD
      mockCsvResponse(`KEY,FREQ,CURRENCY,OBS_VALUE,TIME_PERIOD,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX
EXR.D.USD.EUR.SP00.A,D,USD,1.0234,2025-01-01,EUR,SP00,A
EXR.D.USD.EUR.SP00.A,D,USD,1.0345,2025-01-02,EUR,SP00,A`);

      const rates = await provider.fetchRates('USD', from, to);

      expect(rates).toEqual([
        { date: new Date('2025-01-01'), rate: 1.0234 },
        { date: new Date('2025-01-02'), rate: 1.0345 },
      ]);
    });

    it('should return no rates and warn for a completely empty CSV response', async () => {
      mockCsvResponse('');

      const rates = await provider.fetchRates('USD', from, to);

      expect(rates).toEqual([]);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'ECB CSV header line is empty'
      );
    });
  });

  describe('API Error Handling', () => {
    it('should return no rates and warn when the currency is unknown (404)', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 404 },
        message: 'Not Found',
      });
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      const rates = await provider.fetchRates('INVALID', from, to);

      expect(rates).toEqual([]);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Currency INVALID not found in ECB data'
      );
    });

    it('should throw BadRequestException on timeout', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        isAxiosError: true,
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
      });
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      await expect(provider.fetchRates('USD', from, to)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException on network error', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        isAxiosError: true,
        message: 'Network Error',
      });
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      await expect(provider.fetchRates('USD', from, to)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException on 500 server error', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 500 },
        message: 'Internal Server Error',
      });
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      await expect(provider.fetchRates('USD', from, to)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should mention the cause in the error message', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Currency not found'));
      mockedAxios.isAxiosError.mockReturnValueOnce(false);

      await expect(provider.fetchRates('USD', from, to)).rejects.toThrow(
        'Failed to fetch exchange rates from ECB: Currency not found'
      );
    });

    it('should throw BadRequestException for a malformed API response', async () => {
      mockCsvResponse(null);

      await expect(provider.fetchRates('USD', from, to)).rejects.toThrow(
        BadRequestException
      );
    });
  });
});
