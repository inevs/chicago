import { Test, TestingModule } from '@nestjs/testing';
import { ExchangeRatesController } from './exchange-rates.controller';
import { ExchangeRatesService } from './exchange-rates.service';

describe('ExchangeRatesController', () => {
  let controller: ExchangeRatesController;
  let service: ExchangeRatesService;

  const mockExchangeRatesService = {
    syncExchangeRates: jest.fn(),
    syncAllCurrencies: jest.fn(),
    getExchangeRate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExchangeRatesController],
      providers: [
        {
          provide: ExchangeRatesService,
          useValue: mockExchangeRatesService,
        },
      ],
    }).compile();

    controller = module.get<ExchangeRatesController>(ExchangeRatesController);
    service = module.get<ExchangeRatesService>(ExchangeRatesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncExchangeRates', () => {
    it('should sync exchange rates for a specific currency', async () => {
      const dto = {
        targetCurrency: 'EUR',
        baseCurrency: 'USD',
        from: '2024-01-01',
        to: '2024-01-31',
      };

      const mockResult = {
        count: 31,
        currency: 'EUR',
      };

      mockExchangeRatesService.syncExchangeRates.mockResolvedValue(mockResult);

      const result = await controller.syncExchangeRates(dto);

      expect(result).toEqual(mockResult);
      expect(service.syncExchangeRates).toHaveBeenCalledWith(
        'EUR',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        'USD'
      );
    });

    it('should sync exchange rates without date range', async () => {
      const dto = {
        targetCurrency: 'EUR',
        baseCurrency: 'USD',
      };

      const mockResult = {
        count: 1,
        currency: 'EUR',
      };

      mockExchangeRatesService.syncExchangeRates.mockResolvedValue(mockResult);

      const result = await controller.syncExchangeRates(dto);

      expect(result).toEqual(mockResult);
      expect(service.syncExchangeRates).toHaveBeenCalledWith(
        'EUR',
        undefined,
        undefined,
        'USD'
      );
    });

    it('should sync all currencies when targetCurrency is not provided', async () => {
      const dto = {
        from: '2024-01-01',
        to: '2024-01-31',
      };

      const mockResult = {
        count: 93,
        currencies: ['EUR', 'GBP', 'JPY'],
      };

      mockExchangeRatesService.syncAllCurrencies.mockResolvedValue(mockResult);

      const result = await controller.syncExchangeRates(dto);

      expect(result).toEqual(mockResult);
      expect(service.syncAllCurrencies).toHaveBeenCalledWith(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );
    });

    it('should sync all currencies without date range', async () => {
      const dto = {};

      const mockResult = {
        count: 3,
        currencies: ['EUR', 'GBP', 'JPY'],
      };

      mockExchangeRatesService.syncAllCurrencies.mockResolvedValue(mockResult);

      const result = await controller.syncExchangeRates(dto);

      expect(result).toEqual(mockResult);
      expect(service.syncAllCurrencies).toHaveBeenCalledWith(
        undefined,
        undefined
      );
    });

    it('should handle only from date provided', async () => {
      const dto = {
        targetCurrency: 'EUR',
        from: '2024-01-01',
      };

      const mockResult = {
        count: 30,
        currency: 'EUR',
      };

      mockExchangeRatesService.syncExchangeRates.mockResolvedValue(mockResult);

      await controller.syncExchangeRates(dto);

      expect(service.syncExchangeRates).toHaveBeenCalledWith(
        'EUR',
        new Date('2024-01-01'),
        undefined,
        undefined
      );
    });

    it('should handle only to date provided', async () => {
      const dto = {
        targetCurrency: 'EUR',
        to: '2024-01-31',
      };

      const mockResult = {
        count: 30,
        currency: 'EUR',
      };

      mockExchangeRatesService.syncExchangeRates.mockResolvedValue(mockResult);

      await controller.syncExchangeRates(dto);

      expect(service.syncExchangeRates).toHaveBeenCalledWith(
        'EUR',
        undefined,
        new Date('2024-01-31'),
        undefined
      );
    });
  });

  describe('getExchangeRate', () => {
    it('should return exchange rate for a specific date', async () => {
      const dto = {
        baseCurrency: 'USD',
        targetCurrency: 'EUR',
        date: '2024-01-15',
      };

      const mockRate = 0.92;

      mockExchangeRatesService.getExchangeRate.mockResolvedValue(mockRate);

      const result = await controller.getExchangeRate(dto);

      expect(result).toEqual({
        baseCurrency: 'USD',
        targetCurrency: 'EUR',
        date: new Date('2024-01-15'),
        rate: 0.92,
      });
      expect(service.getExchangeRate).toHaveBeenCalledWith(
        'USD',
        'EUR',
        new Date('2024-01-15')
      );
    });

    it('should handle different currency pairs', async () => {
      const dto = {
        baseCurrency: 'GBP',
        targetCurrency: 'JPY',
        date: '2024-02-01',
      };

      const mockRate = 187.45;

      mockExchangeRatesService.getExchangeRate.mockResolvedValue(mockRate);

      const result = await controller.getExchangeRate(dto);

      expect(result).toEqual({
        baseCurrency: 'GBP',
        targetCurrency: 'JPY',
        date: new Date('2024-02-01'),
        rate: 187.45,
      });
    });

    it('should handle date with time component', async () => {
      const dto = {
        baseCurrency: 'USD',
        targetCurrency: 'EUR',
        date: '2024-01-15T12:30:00.000Z',
      };

      const mockRate = 0.92;

      mockExchangeRatesService.getExchangeRate.mockResolvedValue(mockRate);

      const result = await controller.getExchangeRate(dto);

      expect(result).toEqual({
        baseCurrency: 'USD',
        targetCurrency: 'EUR',
        date: new Date('2024-01-15T12:30:00.000Z'),
        rate: 0.92,
      });
    });
  });
});
