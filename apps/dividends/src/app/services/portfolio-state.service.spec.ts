import type { Mocked } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { PortfolioStateService } from './portfolio-state.service';
import { DividendDataService } from './dividend-data.service';
import { SecurityTransactionService } from './security-transaction.service';
import { SecurityPriceService } from './security-price.service';
import { CurrencyService } from './currency.service';
import { SecurityService } from './security.service';
import { UiStateService } from './ui-state.service';
import { ExchangeRateService } from './exchange-rate.service';
import { AuthService } from './auth.service';
import {
  SecurityPrice,
  SecurityTransactionWithSecurity,
  Currency,
  SecurityType,
  TransactionType,
} from '@dividends/shared';

const timestamps = {
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

describe('PortfolioStateService', () => {
  let service: PortfolioStateService;
  let mockDividendDataService: Mocked<Partial<DividendDataService>>;
  let mockSecurityTransactionService: Mocked<
    Partial<SecurityTransactionService>
  >;
  let mockSecurityPriceService: Mocked<Partial<SecurityPriceService>>;
  let mockCurrencyService: Mocked<Partial<CurrencyService>>;
  let mockSecurityService: Mocked<Partial<SecurityService>>;
  let mockExchangeRateService: Mocked<Partial<ExchangeRateService>>;
  let mockUiStateService: Mocked<Partial<UiStateService>>;
  let mockAuthService: Mocked<Partial<AuthService>>;

  beforeEach(() => {
    mockDividendDataService = {
      loadTransactionsFromBackend: vi.fn(),
      getFilteredTransactions: vi.fn().mockReturnValue([]),
      calculateKPIs: vi.fn().mockReturnValue({}),
    };

    mockSecurityTransactionService = {
      getSecurityTransactions: vi.fn().mockReturnValue(of([])),
    };

    mockSecurityPriceService = {
      getLatestSecurityPrices: vi.fn().mockReturnValue(of([])),
    };

    mockCurrencyService = {
      getCurrencies: vi.fn().mockReturnValue(of([])),
      getDefaultCurrency: vi.fn().mockReturnValue(of(null)),
    };

    mockSecurityService = {
      getSecurities: vi.fn().mockReturnValue(of([])),
    };

    mockExchangeRateService = {
      getLatestRates: vi.fn().mockReturnValue(of([])),
    };

    mockUiStateService = {
      selectedTimeRange: signal('ALL' as const),
      setTimeRange: vi.fn(),
    };

    mockAuthService = {
      isTokenValid: vi.fn().mockReturnValue(true), // Default to valid token
    };

    TestBed.configureTestingModule({
      providers: [
        PortfolioStateService,
        { provide: DividendDataService, useValue: mockDividendDataService },
        {
          provide: SecurityTransactionService,
          useValue: mockSecurityTransactionService,
        },
        { provide: SecurityPriceService, useValue: mockSecurityPriceService },
        { provide: CurrencyService, useValue: mockCurrencyService },
        { provide: SecurityService, useValue: mockSecurityService },
        { provide: ExchangeRateService, useValue: mockExchangeRateService },
        { provide: UiStateService, useValue: mockUiStateService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(PortfolioStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with empty data state', () => {
      expect(service.securities()).toEqual([]);
      expect(service.securityTransactions()).toEqual([]);
      expect(service.securityPrices()).toEqual([]);
      expect(service.currencies()).toEqual([]);
      expect(service.defaultCurrency()).toBeNull();
      expect(service.exchangeRates()).toEqual([]);
    });
  });

  describe('Data Loading', () => {
    it('should load all data', () => {
      service.loadAllData();

      expect(mockSecurityService.getSecurities).toHaveBeenCalled();
      expect(
        mockDividendDataService.loadTransactionsFromBackend
      ).toHaveBeenCalled();
      expect(
        mockSecurityTransactionService.getSecurityTransactions
      ).toHaveBeenCalled();
      expect(
        mockSecurityPriceService.getLatestSecurityPrices
      ).toHaveBeenCalled();
      expect(mockCurrencyService.getCurrencies).toHaveBeenCalled();
      expect(mockCurrencyService.getDefaultCurrency).toHaveBeenCalled();
      expect(mockExchangeRateService.getLatestRates).toHaveBeenCalled();
    });

    it('should load security transactions successfully', () => {
      const mockTransactions: SecurityTransactionWithSecurity[] = [
        {
          id: '1',
          date: new Date('2024-01-01'),
          type: TransactionType.BUY,
          securityId: 'sec1',
          quantity: 10,
          pricePerShare: 100,
          fees: 5,
          currency: 'USD',
          exchangeRate: 1.1,
          totalValue: 1005,
          note: 'Test',
          ...timestamps,
          security: {
            id: 'sec1',
            name: 'Test Security',
            symbol: 'TEST',
            type: SecurityType.STOCK,
            exchange: 'NYSE',
            currency: 'USD',
            isin: null,
            wkn: null,
            ...timestamps,
          },
        },
      ];

      mockSecurityTransactionService.getSecurityTransactions = vi
        .fn()
        .mockReturnValue(of(mockTransactions));

      service.loadSecurityTransactions();

      expect(service.securityTransactions()).toEqual(mockTransactions);
    });

    it('should handle error when loading security transactions', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      mockSecurityTransactionService.getSecurityTransactions = vi
        .fn()
        .mockReturnValue(throwError(() => new Error('Load failed')));

      service.loadSecurityTransactions();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error loading security transactions:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should load security prices successfully', () => {
      const mockPrices: SecurityPrice[] = [
        {
          id: '1',
          securityId: 'sec1',
          date: new Date('2024-01-01'),
          open: 150,
          high: 151,
          low: 149,
          close: 150.5,
          volume: null,
          currency: 'USD',
          provider: 'test',
          ...timestamps,
        },
      ];

      mockSecurityPriceService.getLatestSecurityPrices = vi
        .fn()
        .mockReturnValue(of(mockPrices));

      service.loadSecurityPrices();

      expect(service.securityPrices()).toEqual(mockPrices);
    });

    it('should handle error when loading security prices', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      mockSecurityPriceService.getLatestSecurityPrices = vi
        .fn()
        .mockReturnValue(throwError(() => new Error('Load failed')));

      service.loadSecurityPrices();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error loading security prices:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should load currencies successfully', () => {
      const mockCurrencies: Currency[] = [
        {
          code: 'USD',
          name: 'US Dollar',
        },
      ];

      const mockDefaultCurrency: Currency = {
        code: 'EUR',
        name: 'Euro',
      };

      mockCurrencyService.getCurrencies = vi
        .fn()
        .mockReturnValue(of(mockCurrencies));
      mockCurrencyService.getDefaultCurrency = vi
        .fn()
        .mockReturnValue(of(mockDefaultCurrency));

      service.loadCurrencies();

      expect(service.currencies()).toEqual(mockCurrencies);
      expect(service.defaultCurrency()).toEqual(mockDefaultCurrency);
    });

    it('should handle error when loading currencies', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      mockCurrencyService.getCurrencies = vi
        .fn()
        .mockReturnValue(throwError(() => new Error('Load failed')));

      service.loadCurrencies();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error loading currencies:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should handle error when loading default currency', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      mockCurrencyService.getDefaultCurrency = vi
        .fn()
        .mockReturnValue(throwError(() => new Error('Load failed')));

      service.loadCurrencies();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error loading default currency:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Computed Values', () => {
    it('should compute filtered dividends', () => {
      const mockFiltered = [{ id: '1' }];
      mockDividendDataService.getFilteredTransactions = vi
        .fn()
        .mockReturnValue(mockFiltered);

      mockUiStateService.selectedTimeRange?.set('M');

      expect(service.filteredDividends()).toEqual(mockFiltered);
      expect(
        mockDividendDataService.getFilteredTransactions
      ).toHaveBeenCalledWith('M', '');
    });

    it('should compute KPIs', () => {
      const mockKPIs = { total: 1000, count: 5 };
      const mockFiltered = [{ id: '1' }];
      const mockTransactions: SecurityTransactionWithSecurity[] = [];

      mockDividendDataService.getFilteredTransactions = vi
        .fn()
        .mockReturnValue(mockFiltered);
      mockDividendDataService.calculateKPIs = vi.fn().mockReturnValue(mockKPIs);

      service.securityTransactions.set(mockTransactions);

      expect(service.kpis()).toEqual(mockKPIs);
      expect(mockDividendDataService.calculateKPIs).toHaveBeenCalledWith(
        mockFiltered,
        mockTransactions
      );
    });
  });

  describe('getSharesAtDate', () => {
    it('should return 0 when no transactions exist', () => {
      service.securityTransactions.set([]);

      const shares = service.getSharesAtDate('sec1', '2024-01-15');

      expect(shares).toBe(0);
    });

    it('should include transactions before the ex-date', () => {
      const mockTransactions: SecurityTransactionWithSecurity[] = [
        {
          id: '1',
          date: new Date('2024-01-10'),
          type: TransactionType.BUY,
          securityId: 'sec1',
          quantity: 100,
          pricePerShare: 50,
          fees: 5,
          currency: 'USD',
          exchangeRate: 1,
          totalValue: 5005,
          note: null,
          ...timestamps,
          security: {
            id: 'sec1',
            name: 'Test Security',
            symbol: 'TEST',
            type: SecurityType.STOCK,
            exchange: 'NYSE',
            currency: 'USD',
            isin: null,
            wkn: null,
            ...timestamps,
          },
        },
      ];

      service.securityTransactions.set(mockTransactions);

      const shares = service.getSharesAtDate('sec1', '2024-01-15');

      expect(shares).toBe(100);
    });

    it('should exclude transactions on the ex-date', () => {
      const mockTransactions: SecurityTransactionWithSecurity[] = [
        {
          id: '1',
          date: new Date('2024-01-10'),
          type: TransactionType.BUY,
          securityId: 'sec1',
          quantity: 100,
          pricePerShare: 50,
          fees: 5,
          currency: 'USD',
          exchangeRate: 1,
          totalValue: 5005,
          note: null,
          ...timestamps,
          security: {
            id: 'sec1',
            name: 'Test Security',
            symbol: 'TEST',
            type: SecurityType.STOCK,
            exchange: 'NYSE',
            currency: 'USD',
            isin: null,
            wkn: null,
            ...timestamps,
          },
        },
        {
          id: '2',
          date: new Date('2024-01-15'),
          type: TransactionType.BUY,
          securityId: 'sec1',
          quantity: 50,
          pricePerShare: 50,
          fees: 5,
          currency: 'USD',
          exchangeRate: 1,
          totalValue: 2505,
          note: null,
          ...timestamps,
          security: {
            id: 'sec1',
            name: 'Test Security',
            symbol: 'TEST',
            type: SecurityType.STOCK,
            exchange: 'NYSE',
            currency: 'USD',
            isin: null,
            wkn: null,
            ...timestamps,
          },
        },
      ];

      service.securityTransactions.set(mockTransactions);

      const shares = service.getSharesAtDate('sec1', '2024-01-15');

      expect(shares).toBe(100); // Should only include the transaction from 2024-01-10, not 2024-01-15
    });

    it('should exclude transactions after the ex-date', () => {
      const mockTransactions: SecurityTransactionWithSecurity[] = [
        {
          id: '1',
          date: new Date('2024-01-10'),
          type: TransactionType.BUY,
          securityId: 'sec1',
          quantity: 100,
          pricePerShare: 50,
          fees: 5,
          currency: 'USD',
          exchangeRate: 1,
          totalValue: 5005,
          note: null,
          ...timestamps,
          security: {
            id: 'sec1',
            name: 'Test Security',
            symbol: 'TEST',
            type: SecurityType.STOCK,
            exchange: 'NYSE',
            currency: 'USD',
            isin: null,
            wkn: null,
            ...timestamps,
          },
        },
        {
          id: '2',
          date: new Date('2024-01-20'),
          type: TransactionType.BUY,
          securityId: 'sec1',
          quantity: 50,
          pricePerShare: 50,
          fees: 5,
          currency: 'USD',
          exchangeRate: 1,
          totalValue: 2505,
          note: null,
          ...timestamps,
          security: {
            id: 'sec1',
            name: 'Test Security',
            symbol: 'TEST',
            type: SecurityType.STOCK,
            exchange: 'NYSE',
            currency: 'USD',
            isin: null,
            wkn: null,
            ...timestamps,
          },
        },
      ];

      service.securityTransactions.set(mockTransactions);

      const shares = service.getSharesAtDate('sec1', '2024-01-15');

      expect(shares).toBe(100); // Should only include the transaction from 2024-01-10
    });

    it('should handle BUY and SELL transactions correctly', () => {
      const mockTransactions: SecurityTransactionWithSecurity[] = [
        {
          id: '1',
          date: new Date('2024-01-05'),
          type: TransactionType.BUY,
          securityId: 'sec1',
          quantity: 100,
          pricePerShare: 50,
          fees: 5,
          currency: 'USD',
          exchangeRate: 1,
          totalValue: 5005,
          note: null,
          ...timestamps,
          security: {
            id: 'sec1',
            name: 'Test Security',
            symbol: 'TEST',
            type: SecurityType.STOCK,
            exchange: 'NYSE',
            currency: 'USD',
            isin: null,
            wkn: null,
            ...timestamps,
          },
        },
        {
          id: '2',
          date: new Date('2024-01-10'),
          type: TransactionType.SELL,
          securityId: 'sec1',
          quantity: 30,
          pricePerShare: 55,
          fees: 5,
          currency: 'USD',
          exchangeRate: 1,
          totalValue: 1645,
          note: null,
          ...timestamps,
          security: {
            id: 'sec1',
            name: 'Test Security',
            symbol: 'TEST',
            type: SecurityType.STOCK,
            exchange: 'NYSE',
            currency: 'USD',
            isin: null,
            wkn: null,
            ...timestamps,
          },
        },
      ];

      service.securityTransactions.set(mockTransactions);

      const shares = service.getSharesAtDate('sec1', '2024-01-15');

      expect(shares).toBe(70); // 100 bought - 30 sold
    });

    it('should only count transactions for the specified security', () => {
      const mockTransactions: SecurityTransactionWithSecurity[] = [
        {
          id: '1',
          date: new Date('2024-01-10'),
          type: TransactionType.BUY,
          securityId: 'sec1',
          quantity: 100,
          pricePerShare: 50,
          fees: 5,
          currency: 'USD',
          exchangeRate: 1,
          totalValue: 5005,
          note: null,
          ...timestamps,
          security: {
            id: 'sec1',
            name: 'Test Security',
            symbol: 'TEST',
            type: SecurityType.STOCK,
            exchange: 'NYSE',
            currency: 'USD',
            isin: null,
            wkn: null,
            ...timestamps,
          },
        },
        {
          id: '2',
          date: new Date('2024-01-10'),
          type: TransactionType.BUY,
          securityId: 'sec2',
          quantity: 50,
          pricePerShare: 50,
          fees: 5,
          currency: 'USD',
          exchangeRate: 1,
          totalValue: 2505,
          note: null,
          ...timestamps,
          security: {
            id: 'sec2',
            name: 'Other Security',
            symbol: 'OTHER',
            type: SecurityType.STOCK,
            exchange: 'NYSE',
            currency: 'USD',
            isin: null,
            wkn: null,
            ...timestamps,
          },
        },
      ];

      service.securityTransactions.set(mockTransactions);

      const shares = service.getSharesAtDate('sec1', '2024-01-15');

      expect(shares).toBe(100); // Should only include sec1 transactions
    });
  });
});
