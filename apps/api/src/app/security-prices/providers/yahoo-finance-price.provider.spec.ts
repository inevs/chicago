import { Logger } from '@nestjs/common';
import axios, { InternalAxiosRequestConfig } from 'axios';
import { YahooFinancePriceProvider } from './yahoo-finance-price.provider';
import { PriceProviderRateLimitError } from './price-provider';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// 2024-01-02 and 2024-01-03, 14:30 UTC
const TS_1 = 1704205800;
const TS_2 = 1704292200;

function mockResponse(data: unknown, status = 200, headers: Record<string, string> = {}) {
  mockedAxios.get.mockResolvedValueOnce({
    data,
    status,
    statusText: '',
    headers,
    config: {} as InternalAxiosRequestConfig,
  });
}

function chart(
  quote: Record<string, unknown[]>,
  timestamp: unknown[] = [TS_1, TS_2],
  meta: Record<string, unknown> = { currency: 'USD' }
) {
  return { chart: { result: [{ meta, timestamp, indicators: { quote: [quote] } }] } };
}

describe('YahooFinancePriceProvider', () => {
  let provider: YahooFinancePriceProvider;
  const security = { symbol: 'AAPL', currency: 'EUR' };
  const from = new Date('2024-01-01T00:00:00Z');
  const to = new Date('2024-01-31T00:00:00Z');

  beforeEach(() => {
    provider = new YahooFinancePriceProvider();

    // Mock logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should identify itself as "yahoo"', () => {
    expect(provider.name).toBe('yahoo');
  });

  describe('Request', () => {
    it('should request daily prices for the symbol in the date range', async () => {
      mockResponse(chart({ open: [], high: [], low: [], close: [], volume: [] }, []));

      await provider.fetchPrices(security, from, to);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://query1.finance.yahoo.com/v8/finance/chart/AAPL',
        {
          params: {
            interval: '1d',
            period1: 1704067200, // from, in seconds
            period2: 1706659200 + 86400, // to, in seconds, plus one day
            events: 'div,splits',
            includeAdjustedClose: true,
          },
          timeout: 30000,
          validateStatus: expect.any(Function),
        }
      );
    });

    it('should URL-encode the symbol', async () => {
      mockResponse(chart({}, []));

      await provider.fetchPrices({ symbol: '^GDAXI', currency: 'EUR' }, from, to);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://query1.finance.yahoo.com/v8/finance/chart/%5EGDAXI',
        expect.anything()
      );
    });

    it('should only treat server errors (5xx) as request failures', async () => {
      mockResponse(chart({}, []));

      await provider.fetchPrices(security, from, to);

      const { validateStatus } = mockedAxios.get.mock.calls[0][1] as {
        validateStatus: (status: number) => boolean;
      };
      expect(validateStatus(200)).toBe(true);
      expect(validateStatus(404)).toBe(true);
      expect(validateStatus(429)).toBe(true);
      expect(validateStatus(500)).toBe(false);
    });
  });

  describe('Response Parsing', () => {
    it('should map the quotes to daily prices', async () => {
      mockResponse(
        chart({
          open: [100, 102],
          high: [105, 106],
          low: [99, 101],
          close: [103, 104],
          volume: [1000000, 2000000],
        })
      );

      const prices = await provider.fetchPrices(security, from, to);

      expect(prices).toEqual([
        {
          date: new Date(TS_1 * 1000),
          open: 100,
          high: 105,
          low: 99,
          close: 103,
          volume: 1000000,
          currency: 'USD',
        },
        {
          date: new Date(TS_2 * 1000),
          open: 102,
          high: 106,
          low: 101,
          close: 104,
          volume: 2000000,
          currency: 'USD',
        },
      ]);
    });

    it('should fall back to the security currency if Yahoo reports none', async () => {
      mockResponse(
        chart(
          { open: [100], high: [105], low: [99], close: [103], volume: [1000] },
          [TS_1],
          {}
        )
      );

      const prices = await provider.fetchPrices(security, from, to);

      expect(prices[0].currency).toBe('EUR');
    });

    it('should set the volume to null if it is missing', async () => {
      mockResponse(
        chart(
          { open: [100, 102], high: [105, 106], low: [99, 101], close: [103, 104], volume: [null] }
        )
      );

      const prices = await provider.fetchPrices(security, from, to);

      expect(prices.map((p) => p.volume)).toEqual([null, null]);
    });

    it('should skip entries with missing or invalid price values', async () => {
      mockResponse(
        chart(
          {
            open: [100, 'abc', 102],
            high: [105, 106, 107],
            low: [99, 101],
            close: [103, 104, 105],
            volume: [1000, 2000, 3000],
          },
          [TS_1, TS_2, TS_2 + 86400]
        )
      );

      const prices = await provider.fetchPrices(security, from, to);

      // Entry 2 has an invalid open, entry 3 has no low
      expect(prices).toHaveLength(1);
      expect(prices[0].date).toEqual(new Date(TS_1 * 1000));
    });

    it('should return no prices if the response contains no quotes', async () => {
      mockResponse({ chart: { result: [{ meta: { currency: 'USD' }, timestamp: [TS_1] }] } });

      const prices = await provider.fetchPrices(security, from, to);

      expect(prices).toEqual([]);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('returned no price data for AAPL')
      );
    });

    it('should return no prices if the response contains no result', async () => {
      mockResponse({ chart: { result: null } });

      const prices = await provider.fetchPrices(security, from, to);

      expect(prices).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should throw PriceProviderRateLimitError on status 429', async () => {
      mockResponse({}, 429, { 'retry-after': '60' });

      await expect(provider.fetchPrices(security, from, to)).rejects.toThrow(
        PriceProviderRateLimitError
      );
    });

    it('should return no prices and warn on other client errors', async () => {
      mockResponse({}, 404);

      const prices = await provider.fetchPrices(security, from, to);

      expect(prices).toEqual([]);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Yahoo Finance returned status 404 for AAPL'
      );
    });

    it('should pass on request failures', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Request failed with status code 500'));

      await expect(provider.fetchPrices(security, from, to)).rejects.toThrow(
        'Request failed with status code 500'
      );
    });
  });
});
