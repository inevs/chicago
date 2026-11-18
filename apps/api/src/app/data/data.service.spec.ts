import { Test, TestingModule } from '@nestjs/testing';
import { DataService } from './data.service';
import { DataImportRepository } from './data-import.repository';
import { CurrenciesRepository } from '../currencies/currencies.repository';
import { SecuritiesRepository } from '../securities/securities.repository';
import { DividendPaymentsRepository } from '../dividend-payments/dividend-payments.repository';
import { SecurityTransactionsRepository } from '../security-transactions/security-transactions.repository';
import { SecurityPricesRepository } from '../security-prices/security-prices.repository';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';

describe('DataService', () => {
  let service: DataService;

  const mockCurrenciesRepository = {
    findAll: jest.fn(),
  };

  const mockSecuritiesRepository = {
    findAll: jest.fn(),
  };

  const mockDividendPaymentsRepository = {
    findAllForExport: jest.fn(),
  };

  const mockSecurityTransactionsRepository = {
    findAllForExport: jest.fn(),
  };

  const mockSecurityPricesRepository = {
    findAllForExport: jest.fn(),
  };

  const mockDataImportRepository = {
    importAll: jest.fn(),
  };

  const mockExchangeRatesService = {
    getAllExchangeRates: jest.fn().mockResolvedValue([]),
  };

  const emptyCounts = {
    currenciesImported: 0,
    securitiesImported: 0,
    dividendPaymentsImported: 0,
    securityTransactionsImported: 0,
    securityPricesImported: 0,
    exchangeRatesImported: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataService,
        { provide: CurrenciesRepository, useValue: mockCurrenciesRepository },
        { provide: SecuritiesRepository, useValue: mockSecuritiesRepository },
        {
          provide: DividendPaymentsRepository,
          useValue: mockDividendPaymentsRepository,
        },
        {
          provide: SecurityTransactionsRepository,
          useValue: mockSecurityTransactionsRepository,
        },
        {
          provide: SecurityPricesRepository,
          useValue: mockSecurityPricesRepository,
        },
        { provide: DataImportRepository, useValue: mockDataImportRepository },
        {
          provide: ExchangeRatesService,
          useValue: mockExchangeRatesService,
        },
      ],
    }).compile();

    service = module.get<DataService>(DataService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportAllData', () => {
    it('should export all data from database', async () => {
      const mockCurrencies = [{ code: 'EUR', name: 'Euro', isDefault: true }];
      const mockSecurities = [{ id: 'security-1', symbol: 'AAPL' }];
      const mockDividendPayments = [{ id: 'payment-1', shares: 10 }];
      const mockSecurityTransactions = [{ id: 'transaction-1', quantity: 5 }];
      const mockSecurityPrices = [{ id: 'price-1', close: 100 }];
      const mockExchangeRates = [{ id: 'rate-1', baseCurrency: 'EUR', targetCurrency: 'USD', rate: 1.1 }];

      mockCurrenciesRepository.findAll.mockResolvedValue(mockCurrencies);
      mockSecuritiesRepository.findAll.mockResolvedValue(mockSecurities);
      mockDividendPaymentsRepository.findAllForExport.mockResolvedValue(
        mockDividendPayments
      );
      mockSecurityTransactionsRepository.findAllForExport.mockResolvedValue(
        mockSecurityTransactions
      );
      mockSecurityPricesRepository.findAllForExport.mockResolvedValue(
        mockSecurityPrices
      );
      mockExchangeRatesService.getAllExchangeRates.mockResolvedValue(
        mockExchangeRates
      );

      const result = await service.exportAllData();

      expect(result.currencies).toEqual(mockCurrencies);
      expect(result.securities).toEqual(mockSecurities);
      expect(result.dividendPayments).toEqual(mockDividendPayments);
      expect(result.securityTransactions).toEqual(mockSecurityTransactions);
      expect(result.securityPrices).toEqual(mockSecurityPrices);
      expect(result.exchangeRates).toEqual(mockExchangeRates);
      expect(result.version).toBe('1.0');
      expect(result.exportedAt).toBeDefined();
      expect(typeof result.exportedAt).toBe('string');

      expect(mockCurrenciesRepository.findAll).toHaveBeenCalledTimes(1);
      expect(mockSecuritiesRepository.findAll).toHaveBeenCalledTimes(1);
      expect(
        mockDividendPaymentsRepository.findAllForExport
      ).toHaveBeenCalledTimes(1);
      expect(
        mockSecurityTransactionsRepository.findAllForExport
      ).toHaveBeenCalledTimes(1);
      expect(
        mockSecurityPricesRepository.findAllForExport
      ).toHaveBeenCalledTimes(1);
      expect(mockExchangeRatesService.getAllExchangeRates).toHaveBeenCalledTimes(1);
    });
  });

  describe('importAllData', () => {
    it('should import data without clearing existing data', async () => {
      const importData = {
        currencies: [{ code: 'EUR', name: 'Euro', isDefault: true }],
        securities: [{ id: 'security-1', symbol: 'AAPL' }],
        dividendPayments: [{ id: 'payment-1', shares: 10 }],
        securityTransactions: [{ id: 'transaction-1', quantity: 5 }],
        securityPrices: [{ id: 'price-1', close: 100 }],
        exchangeRates: [{ id: 'rate-1', baseCurrency: 'EUR', targetCurrency: 'USD', rate: 1.1 }],
      };
      const counts = {
        currenciesImported: 1,
        securitiesImported: 1,
        dividendPaymentsImported: 1,
        securityTransactionsImported: 1,
        securityPricesImported: 1,
        exchangeRatesImported: 1,
      };
      mockDataImportRepository.importAll.mockResolvedValueOnce(counts);

      const result = await service.importAllData(importData);

      expect(result).toEqual(counts);
      expect(mockDataImportRepository.importAll).toHaveBeenCalledWith(
        importData,
        {}
      );
    });

    it('should clear existing data when requested', async () => {
      const importData = {
        securities: [{ id: 'security-1', symbol: 'AAPL' }],
      };
      mockDataImportRepository.importAll.mockResolvedValueOnce({
        ...emptyCounts,
        securitiesImported: 1,
      });

      await service.importAllData(importData, { clearExisting: true });

      expect(mockDataImportRepository.importAll).toHaveBeenCalledWith(
        importData,
        { clearExisting: true }
      );
    });

    it('should handle empty import data', async () => {
      mockDataImportRepository.importAll.mockResolvedValueOnce(emptyCounts);

      const result = await service.importAllData({});

      expect(result).toEqual(emptyCounts);
      expect(mockDataImportRepository.importAll).toHaveBeenCalledWith({}, {});
    });

    it('should propagate errors from the import (transaction rolled back)', async () => {
      mockDataImportRepository.importAll.mockRejectedValueOnce(
        new Error('Foreign key constraint failed')
      );

      await expect(
        service.importAllData({ securities: [{ id: 'security-1' }] })
      ).rejects.toThrow('Foreign key constraint failed');
    });
  });
});
