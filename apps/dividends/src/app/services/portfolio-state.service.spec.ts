import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { PortfolioStateService } from './portfolio-state.service';
import { DividendDataService } from './dividend-data.service';
import { SecurityTransactionService } from './security-transaction.service';
import { SecurityPriceService } from './security-price.service';
import { CurrencyService } from './currency.service';
import { UiStateService } from './ui-state.service';
import { ExchangeRateService } from './exchange-rate.service';
import { SecurityPrice, SecurityTransactionWithSecurity, Currency } from '@dividends/shared';

describe('PortfolioStateService', () => {
  let service: PortfolioStateService;
  let mockDividendDataService: jest.Mocked<Partial<DividendDataService>>;
  let mockSecurityTransactionService: jest.Mocked<Partial<SecurityTransactionService>>;
  let mockSecurityPriceService: jest.Mocked<Partial<SecurityPriceService>>;
  let mockCurrencyService: jest.Mocked<Partial<CurrencyService>>;
  let mockExchangeRateService: jest.Mocked<Partial<ExchangeRateService>>;
  let mockUiStateService: jest.Mocked<Partial<UiStateService>>;

  beforeEach(() => {
    mockDividendDataService = {
      loadTransactionsFromBackend: jest.fn(),
      getFilteredTransactions: jest.fn().mockReturnValue([]),
      calculateKPIs: jest.fn().mockReturnValue({}),
    };

    mockSecurityTransactionService = {
      getSecurityTransactions: jest.fn().mockReturnValue(of([])),
    };

    mockSecurityPriceService = {
      getLatestSecurityPrices: jest.fn().mockReturnValue(of([])),
    };

    mockCurrencyService = {
      getCurrencies: jest.fn().mockReturnValue(of([])),
      getDefaultCurrency: jest.fn().mockReturnValue(of(null)),
    };

    mockExchangeRateService = {
      getLatestRates: jest.fn().mockReturnValue(of([])),
    };

    mockUiStateService = {
      selectedTimeRange: signal('ALL' as const),
      setTimeRange: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        PortfolioStateService,
        { provide: DividendDataService, useValue: mockDividendDataService },
        { provide: SecurityTransactionService, useValue: mockSecurityTransactionService },
        { provide: SecurityPriceService, useValue: mockSecurityPriceService },
        { provide: CurrencyService, useValue: mockCurrencyService },
        { provide: ExchangeRateService, useValue: mockExchangeRateService },
        { provide: UiStateService, useValue: mockUiStateService },
      ],
    });

    service = TestBed.inject(PortfolioStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with empty data state', () => {
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

      expect(mockDividendDataService.loadTransactionsFromBackend).toHaveBeenCalled();
      expect(mockSecurityTransactionService.getSecurityTransactions).toHaveBeenCalled();
      expect(mockSecurityPriceService.getLatestSecurityPrices).toHaveBeenCalled();
      expect(mockCurrencyService.getCurrencies).toHaveBeenCalled();
      expect(mockCurrencyService.getDefaultCurrency).toHaveBeenCalled();
      expect(mockExchangeRateService.getLatestRates).toHaveBeenCalled();
    });

    it('should load security transactions successfully', () => {
      const mockTransactions: SecurityTransactionWithSecurity[] = [
        {
          id: '1',
          date: '2024-01-01',
          type: 'BUY',
          securityId: 'sec1',
          quantity: 10,
          pricePerShare: 100,
          fees: 5,
          currency: 'USD',
          exchangeRate: 1.1,
          totalValue: 1005,
          note: 'Test',
          security: {
            id: 'sec1',
            name: 'Test Security',
            symbol: 'TEST',
            type: 'STOCK',
            exchange: 'NYSE',
            currency: 'USD',
            isin: null,
            wkn: null,
          },
        },
      ];

      mockSecurityTransactionService.getSecurityTransactions = jest
        .fn()
        .mockReturnValue(of(mockTransactions));

      service.loadSecurityTransactions();

      expect(service.securityTransactions()).toEqual(mockTransactions);
    });

    it('should handle error when loading security transactions', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSecurityTransactionService.getSecurityTransactions = jest
        .fn()
        .mockReturnValue(throwError(() => new Error('Load failed')));

      service.loadSecurityTransactions();

      expect(consoleSpy).toHaveBeenCalledWith('Error loading security transactions:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should load security prices successfully', () => {
      const mockPrices: SecurityPrice[] = [
        {
          id: '1',
          securityId: 'sec1',
          date: '2024-01-01',
          price: 150.5,
          currency: 'USD',
        },
      ];

      mockSecurityPriceService.getLatestSecurityPrices = jest.fn().mockReturnValue(of(mockPrices));

      service.loadSecurityPrices();

      expect(service.securityPrices()).toEqual(mockPrices);
    });

    it('should handle error when loading security prices', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSecurityPriceService.getLatestSecurityPrices = jest
        .fn()
        .mockReturnValue(throwError(() => new Error('Load failed')));

      service.loadSecurityPrices();

      expect(consoleSpy).toHaveBeenCalledWith('Error loading security prices:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should load currencies successfully', () => {
      const mockCurrencies: Currency[] = [
        {
          id: '1',
          code: 'USD',
          name: 'US Dollar',
          symbol: '$',
          isDefault: false,
        },
      ];

      const mockDefaultCurrency: Currency = {
        id: '2',
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        isDefault: true,
      };

      mockCurrencyService.getCurrencies = jest.fn().mockReturnValue(of(mockCurrencies));
      mockCurrencyService.getDefaultCurrency = jest.fn().mockReturnValue(of(mockDefaultCurrency));

      service.loadCurrencies();

      expect(service.currencies()).toEqual(mockCurrencies);
      expect(service.defaultCurrency()).toEqual(mockDefaultCurrency);
    });

    it('should handle error when loading currencies', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockCurrencyService.getCurrencies = jest
        .fn()
        .mockReturnValue(throwError(() => new Error('Load failed')));

      service.loadCurrencies();

      expect(consoleSpy).toHaveBeenCalledWith('Error loading currencies:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle error when loading default currency', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockCurrencyService.getDefaultCurrency = jest
        .fn()
        .mockReturnValue(throwError(() => new Error('Load failed')));

      service.loadCurrencies();

      expect(consoleSpy).toHaveBeenCalledWith('Error loading default currency:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Computed Values', () => {
    it('should compute filtered dividends', () => {
      const mockFiltered = [{ id: '1' }];
      mockDividendDataService.getFilteredTransactions = jest.fn().mockReturnValue(mockFiltered);

      mockUiStateService.selectedTimeRange?.set('1M');

      expect(service.filteredDividends()).toEqual(mockFiltered);
      expect(mockDividendDataService.getFilteredTransactions).toHaveBeenCalledWith('1M', '');
    });

    it('should compute KPIs', () => {
      const mockKPIs = { total: 1000, count: 5 };
      const mockFiltered = [{ id: '1' }];
      const mockTransactions: SecurityTransactionWithSecurity[] = [];

      mockDividendDataService.getFilteredTransactions = jest.fn().mockReturnValue(mockFiltered);
      mockDividendDataService.calculateKPIs = jest.fn().mockReturnValue(mockKPIs);

      service.securityTransactions.set(mockTransactions);

      expect(service.kpis()).toEqual(mockKPIs);
      expect(mockDividendDataService.calculateKPIs).toHaveBeenCalledWith(mockFiltered, mockTransactions);
    });
  });
});
