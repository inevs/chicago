import { Test, TestingModule } from '@nestjs/testing';
import { DataController } from './data.controller';
import { DataService } from './data.service';

describe('DataController', () => {
  let controller: DataController;
  let service: DataService;

  const mockDataService = {
    exportAllData: jest.fn(),
    importAllData: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataController],
      providers: [
        {
          provide: DataService,
          useValue: mockDataService,
        },
      ],
    }).compile();

    controller = module.get<DataController>(DataController);
    service = module.get<DataService>(DataService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportData', () => {
    it('should export all data', async () => {
      const exportData = {
        currencies: [{ code: 'EUR', name: 'Euro' }],
        securities: [{ id: 'security-1', symbol: 'AAPL' }],
        dividendPayments: [{ id: 'payment-1', shares: 10 }],
        securityTransactions: [{ id: 'transaction-1', quantity: 5 }],
        securityPrices: [{ id: 'price-1', close: 100 }],
        exportedAt: '2024-01-01T00:00:00.000Z',
        version: '1.0',
      };

      mockDataService.exportAllData.mockResolvedValue(exportData);

      const result = await controller.exportData();

      expect(result).toEqual(exportData);
      expect(service.exportAllData).toHaveBeenCalled();
    });
  });

  describe('importData', () => {
    it('should import data without clearing existing', async () => {
      const importData = {
        securities: [{ id: 'security-1', symbol: 'AAPL' }],
      };

      const importResult = {
        currenciesImported: 0,
        securitiesImported: 1,
        dividendPaymentsImported: 0,
        securityTransactionsImported: 0,
        securityPricesImported: 0,
      };

      mockDataService.importAllData.mockResolvedValue(importResult);

      const result = await controller.importData(importData);

      expect(result.success).toBe(true);
      expect(result.securitiesImported).toBe(1);
      expect(result.dividendPaymentsImported).toBe(0);
      expect(service.importAllData).toHaveBeenCalledWith(importData, {
        clearExisting: false,
      });
    });

    it('should import data with clearExisting option', async () => {
      const importData = {
        securities: [{ id: 'security-1', symbol: 'AAPL' }],
      };

      const importResult = {
        currenciesImported: 0,
        securitiesImported: 1,
        dividendPaymentsImported: 0,
        securityTransactionsImported: 0,
        securityPricesImported: 0,
      };

      mockDataService.importAllData.mockResolvedValue(importResult);

      const result = await controller.importData(importData, 'true');

      expect(result.success).toBe(true);
      expect(service.importAllData).toHaveBeenCalledWith(importData, {
        clearExisting: true,
      });
    });

    it('should not clear existing when clearExisting is not "true"', async () => {
      const importData = {
        securities: [{ id: 'security-1', symbol: 'AAPL' }],
      };

      const importResult = {
        currenciesImported: 0,
        securitiesImported: 1,
        dividendPaymentsImported: 0,
        securityTransactionsImported: 0,
        securityPricesImported: 0,
      };

      mockDataService.importAllData.mockResolvedValue(importResult);

      await controller.importData(importData, 'false');

      expect(service.importAllData).toHaveBeenCalledWith(importData, {
        clearExisting: false,
      });
    });
  });
});
