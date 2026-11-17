import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import {
  ExchangeRateService,
  LatestExchangeRate,
} from './exchange-rate.service';

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ExchangeRateService],
    });

    service = TestBed.inject(ExchangeRateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getExchangeRate', () => {
    it('should make GET request with correct params', () => {
      const baseCurrency = 'EUR';
      const targetCurrency = 'USD';
      const date = '2025-01-03';

      const mockResponse = {
        baseCurrency: 'EUR',
        targetCurrency: 'USD',
        date: new Date('2025-01-03'),
        rate: 1.0845,
      };

      service
        .getExchangeRate(baseCurrency, targetCurrency, date)
        .subscribe((response) => {
          expect(response).toEqual(mockResponse);
          expect(response.rate).toBe(1.0845);
        });

      const req = httpMock.expectOne(
        (request) =>
          request.url === '/api/exchange-rates/rate' &&
          request.params.get('baseCurrency') === baseCurrency &&
          request.params.get('targetCurrency') === targetCurrency &&
          request.params.get('date') === date
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle different currency pairs', () => {
      const baseCurrency = 'EUR';
      const targetCurrency = 'GBP';
      const date = '2025-01-03';

      const mockResponse = {
        baseCurrency: 'EUR',
        targetCurrency: 'GBP',
        date: new Date('2025-01-03'),
        rate: 0.8567,
      };

      service
        .getExchangeRate(baseCurrency, targetCurrency, date)
        .subscribe((response) => {
          expect(response.targetCurrency).toBe('GBP');
          expect(response.rate).toBe(0.8567);
        });

      const req = httpMock.expectOne(
        (request) =>
          request.url === '/api/exchange-rates/rate' &&
          request.params.get('baseCurrency') === baseCurrency &&
          request.params.get('targetCurrency') === targetCurrency &&
          request.params.get('date') === date
      );
      req.flush(mockResponse);
    });

    it('should handle 404 not found error', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      service.getExchangeRate('EUR', 'INVALID', '2025-01-03').subscribe({
        next: () => expect.unreachable('Should have failed with 404'),
        error: (error) => {
          expect(error.message).toBe('Exchange rate not found');
        },
      });

      const req = httpMock.expectOne(
        (request) => request.url === '/api/exchange-rates/rate'
      );
      req.flush(
        { message: 'Exchange rate not found' },
        { status: 404, statusText: 'Not Found' }
      );

      consoleSpy.mockRestore();
    });

    it('should handle server error', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      service.getExchangeRate('EUR', 'USD', '2025-01-03').subscribe({
        next: () => expect.unreachable('Should have failed with 500'),
        error: (error) => {
          expect(error.message).toContain('Server error');
        },
      });

      const req = httpMock.expectOne(
        (request) => request.url === '/api/exchange-rates/rate'
      );
      req.flush(
        { message: 'Internal server error' },
        { status: 500, statusText: 'Internal Server Error' }
      );

      consoleSpy.mockRestore();
    });

    it('should handle client-side error', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      service.getExchangeRate('EUR', 'USD', '2025-01-03').subscribe({
        next: () => expect.unreachable('Should have failed with network error'),
        error: (error) => {
          expect(error.message).toBe('Error: Connection failed');
        },
      });

      const req = httpMock.expectOne(
        (request) => request.url === '/api/exchange-rates/rate'
      );
      req.error(
        new ErrorEvent('Network error', {
          message: 'Connection failed',
        }) as unknown as ProgressEvent
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getLatestRates', () => {
    it('should make GET request and return array of latest rates', () => {
      const mockRates: LatestExchangeRate[] = [
        {
          currency: 'USD',
          rate: 1.0845,
          date: new Date('2025-01-03'),
        },
        {
          currency: 'GBP',
          rate: 0.8567,
          date: new Date('2025-01-03'),
        },
        {
          currency: 'JPY',
          rate: 156.78,
          date: new Date('2025-01-03'),
        },
      ];

      service.getLatestRates().subscribe((rates) => {
        expect(rates).toEqual(mockRates);
        expect(rates.length).toBe(3);
        expect(rates[0].currency).toBe('USD');
        expect(rates[0].rate).toBe(1.0845);
      });

      const req = httpMock.expectOne('/api/exchange-rates/latest');
      expect(req.request.method).toBe('GET');
      req.flush(mockRates);
    });

    it('should return empty array when no rates exist', () => {
      service.getLatestRates().subscribe((rates) => {
        expect(rates).toEqual([]);
        expect(rates.length).toBe(0);
      });

      const req = httpMock.expectOne('/api/exchange-rates/latest');
      req.flush([]);
    });

    it('should handle rates with different dates', () => {
      const mockRates: LatestExchangeRate[] = [
        {
          currency: 'USD',
          rate: 1.0845,
          date: new Date('2025-01-03'),
        },
        {
          currency: 'GBP',
          rate: 0.8567,
          date: new Date('2025-01-02'), // Different date
        },
      ];

      service.getLatestRates().subscribe((rates) => {
        expect(rates.length).toBe(2);
        expect(rates[0].date).toEqual(new Date('2025-01-03'));
        expect(rates[1].date).toEqual(new Date('2025-01-02'));
      });

      const req = httpMock.expectOne('/api/exchange-rates/latest');
      req.flush(mockRates);
    });

    it('should handle 404 not found error', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      service.getLatestRates().subscribe({
        next: () => expect.unreachable('Should have failed with 404'),
        error: (error) => {
          expect(error.message).toBe('Exchange rate not found');
        },
      });

      const req = httpMock.expectOne('/api/exchange-rates/latest');
      req.flush(
        { message: 'No exchange rates found' },
        { status: 404, statusText: 'Not Found' }
      );

      consoleSpy.mockRestore();
    });

    it('should handle server error', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      service.getLatestRates().subscribe({
        next: () => expect.unreachable('Should have failed with 500'),
        error: (error) => {
          expect(error.message).toContain('Server error');
        },
      });

      const req = httpMock.expectOne('/api/exchange-rates/latest');
      req.flush(
        { message: 'Database error' },
        { status: 500, statusText: 'Internal Server Error' }
      );

      consoleSpy.mockRestore();
    });

    it('should handle network error', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      service.getLatestRates().subscribe({
        next: () => expect.unreachable('Should have failed with network error'),
        error: (error) => {
          expect(error.message).toBe('Error: Connection failed');
        },
      });

      const req = httpMock.expectOne('/api/exchange-rates/latest');
      req.error(
        new ErrorEvent('Network error', {
          message: 'Connection failed',
        }) as unknown as ProgressEvent
      );

      consoleSpy.mockRestore();
    });

    it('should handle single currency rate', () => {
      const mockRates: LatestExchangeRate[] = [
        {
          currency: 'USD',
          rate: 1.0845,
          date: new Date('2025-01-03'),
        },
      ];

      service.getLatestRates().subscribe((rates) => {
        expect(rates.length).toBe(1);
        expect(rates[0].currency).toBe('USD');
      });

      const req = httpMock.expectOne('/api/exchange-rates/latest');
      req.flush(mockRates);
    });

    it('should correctly map response structure', () => {
      const mockRates: LatestExchangeRate[] = [
        {
          currency: 'CHF',
          rate: 0.9334,
          date: new Date('2025-01-03'),
        },
      ];

      service.getLatestRates().subscribe((rates) => {
        const rate = rates[0];
        expect(rate).toHaveProperty('currency');
        expect(rate).toHaveProperty('rate');
        expect(rate).toHaveProperty('date');
        expect(typeof rate.currency).toBe('string');
        expect(typeof rate.rate).toBe('number');
        expect(rate.date).toBeInstanceOf(Date);
      });

      const req = httpMock.expectOne('/api/exchange-rates/latest');
      req.flush(mockRates);
    });
  });
});
