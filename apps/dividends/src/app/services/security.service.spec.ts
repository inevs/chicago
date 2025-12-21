import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import {
  SecurityService,
  CreateSecurityRequest,
} from './security.service';
import { Security, SecurityType } from '@dividends/shared';

describe('SecurityService', () => {
  let service: SecurityService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SecurityService],
    });

    service = TestBed.inject(SecurityService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('createSecurity', () => {
    it('should make POST request with correct data', () => {
      const request: CreateSecurityRequest = {
        name: 'Apple Inc.',
        symbol: 'AAPL',
        type: 'STOCK',
        exchange: 'NASDAQ',
        currency: 'USD',
      };

      const mockResponse: Security = {
        id: 'uuid-123',
        name: 'Apple Inc.',
        symbol: 'AAPL',
        isin: null,
        wkn: null,
        type: SecurityType.STOCK,
        exchange: 'NASDAQ',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.createSecurity(request).subscribe((security) => {
        expect(security).toEqual(mockResponse);
        expect(security.symbol).toBe('AAPL');
      });

      const req = httpMock.expectOne('/api/securities');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(mockResponse);
    });

    it('should create security with optional fields', () => {
      const request: CreateSecurityRequest = {
        name: 'Apple Inc.',
        symbol: 'AAPL',
        isin: 'US0378331005',
        wkn: '865985',
        type: 'STOCK',
        exchange: 'NASDAQ',
        currency: 'USD',
      };

      const mockResponse: Security = {
        id: 'uuid-123',
        ...request,
        type: SecurityType.STOCK,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.createSecurity(request).subscribe((security) => {
        expect(security.isin).toBe('US0378331005');
        expect(security.wkn).toBe('865985');
      });

      const req = httpMock.expectOne('/api/securities');
      req.flush(mockResponse);
    });

    it('should handle 409 conflict error', () => {
      const request: CreateSecurityRequest = {
        name: 'Apple Inc.',
        symbol: 'AAPL',
        type: 'STOCK',
        exchange: 'NASDAQ',
        currency: 'USD',
      };

      service.createSecurity(request).subscribe({
        next: () => fail('Should have failed with 409'),
        error: (error) => {
          expect(error.message).toContain('already exists');
        },
      });

      const req = httpMock.expectOne('/api/securities');
      req.flush(
        { message: 'Security with this symbol already exists' },
        { status: 409, statusText: 'Conflict' }
      );
    });

    it('should handle 400 validation error', () => {
      const request: CreateSecurityRequest = {
        name: 'Apple Inc.',
        symbol: 'AAPL',
        type: 'STOCK',
        exchange: 'NASDAQ',
        currency: 'US', // Invalid - too short
      };

      service.createSecurity(request).subscribe({
        next: () => fail('Should have failed with 400'),
        error: (error) => {
          expect(error.message).toContain('Invalid');
        },
      });

      const req = httpMock.expectOne('/api/securities');
      req.flush(
        { message: 'Validation failed' },
        { status: 400, statusText: 'Bad Request' }
      );
    });
  });

  describe('getSecurities', () => {
    it('should make GET request and return array of securities', () => {
      const mockSecurities: Security[] = [
        {
          id: 'uuid-1',
          name: 'Apple Inc.',
          symbol: 'AAPL',
          isin: 'US0378331005',
          wkn: null,
          type: SecurityType.STOCK,
          exchange: 'NASDAQ',
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'uuid-2',
          name: 'Microsoft Corp.',
          symbol: 'MSFT',
          isin: null,
          wkn: null,
          type: SecurityType.STOCK,
          exchange: 'NASDAQ',
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      service.getSecurities().subscribe((securities) => {
        expect(securities).toEqual(mockSecurities);
        expect(securities.length).toBe(2);
      });

      const req = httpMock.expectOne('/api/securities');
      expect(req.request.method).toBe('GET');
      req.flush(mockSecurities);
    });

    it('should return empty array when no securities exist', () => {
      service.getSecurities().subscribe((securities) => {
        expect(securities).toEqual([]);
        expect(securities.length).toBe(0);
      });

      const req = httpMock.expectOne('/api/securities');
      req.flush([]);
    });
  });

  describe('getSecurityById', () => {
    it('should make GET request with ID and return security', () => {
      const mockSecurity: Security = {
        id: 'uuid-123',
        name: 'Apple Inc.',
        symbol: 'AAPL',
        isin: 'US0378331005',
        wkn: null,
        type: SecurityType.STOCK,
        exchange: 'NASDAQ',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.getSecurityById('uuid-123').subscribe((security) => {
        expect(security).toEqual(mockSecurity);
        expect(security.id).toBe('uuid-123');
      });

      const req = httpMock.expectOne('/api/securities/uuid-123');
      expect(req.request.method).toBe('GET');
      req.flush(mockSecurity);
    });

    it('should handle 404 not found error', () => {
      service.getSecurityById('invalid-id').subscribe({
        next: () => fail('Should have failed with 404'),
        error: (error) => {
          expect(error.message).toContain('not found');
        },
      });

      const req = httpMock.expectOne('/api/securities/invalid-id');
      req.flush(
        { message: 'Security not found' },
        { status: 404, statusText: 'Not Found' }
      );
    });
  });
});
