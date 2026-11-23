import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CurrenciesService } from './currencies.service';
import { CurrenciesRepository } from './currencies.repository';
import { CURRENCY_ERRORS } from '@dividends/shared';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { DuplicateRecordError } from '../database/duplicate-record.error';

describe('CurrenciesService', () => {
  let service: CurrenciesService;
  let currenciesRepository: CurrenciesRepository;
  let exchangeRatesService: ExchangeRatesService;

  const mockCurrenciesRepository = {
    findAll: jest.fn(),
    findByCode: jest.fn(),
    existsByCode: jest.fn(),
    create: jest.fn(),
  };

  const mockExchangeRatesService = {
    syncExchangeRates: jest.fn().mockResolvedValue({ synced: 0, skipped: 0 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrenciesService,
        {
          provide: CurrenciesRepository,
          useValue: mockCurrenciesRepository,
        },
        {
          provide: ExchangeRatesService,
          useValue: mockExchangeRatesService,
        },
      ],
    }).compile();

    service = module.get<CurrenciesService>(CurrenciesService);
    currenciesRepository = module.get<CurrenciesRepository>(CurrenciesRepository);
    exchangeRatesService = module.get<ExchangeRatesService>(ExchangeRatesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all currencies ordered by code', async () => {
      const currencies = [
        {
          id: 'uuid-1',
          code: 'CHF',
          name: 'Swiss Franc',
          isDefault: false,
          createdAt: new Date(),
        },
        {
          id: 'uuid-2',
          code: 'EUR',
          name: 'Euro',
          isDefault: true,
          createdAt: new Date(),
        },
        {
          id: 'uuid-3',
          code: 'USD',
          name: 'US Dollar',
          isDefault: false,
          createdAt: new Date(),
        },
      ];

      mockCurrenciesRepository.findAll.mockResolvedValue(currencies);

      const result = await service.findAll();

      expect(result).toEqual(currencies);
      expect(currenciesRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no currencies exist', async () => {
      mockCurrenciesRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should successfully create a currency with normalized code and trigger background sync', async () => {
      const dto = {
        code: 'usd',
        name: 'US Dollar',
      };

      const createdCurrency = {
        id: 'uuid-123',
        code: 'USD',
        name: 'US Dollar',
        isDefault: false,
        createdAt: new Date(),
      };

      mockCurrenciesRepository.existsByCode.mockResolvedValue(false);
      mockCurrenciesRepository.create.mockResolvedValue(createdCurrency);

      const result = await service.create(dto);

      expect(result).toEqual(createdCurrency);
      expect(currenciesRepository.existsByCode).toHaveBeenCalledWith('USD');
      expect(currenciesRepository.create).toHaveBeenCalledWith({
        code: 'USD',
        name: 'US Dollar',
      });
      expect(exchangeRatesService.syncExchangeRates).toHaveBeenCalledWith('USD');
    });

    it('should throw ConflictException when currency code already exists', async () => {
      const dto = {
        code: 'EUR',
        name: 'Euro',
      };

      mockCurrenciesRepository.existsByCode.mockResolvedValue(true);

      await expect(service.create(dto)).rejects.toThrow(
        new ConflictException(CURRENCY_ERRORS.ALREADY_EXISTS('EUR'))
      );
      expect(currenciesRepository.existsByCode).toHaveBeenCalledWith('EUR');
      expect(currenciesRepository.create).not.toHaveBeenCalled();
      expect(exchangeRatesService.syncExchangeRates).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when a concurrent request created the currency after the check', async () => {
      const dto = {
        code: 'EUR',
        name: 'Euro',
      };

      mockCurrenciesRepository.existsByCode.mockResolvedValue(false);
      mockCurrenciesRepository.create.mockRejectedValue(
        new DuplicateRecordError()
      );

      await expect(service.create(dto)).rejects.toThrow(
        new ConflictException(CURRENCY_ERRORS.ALREADY_EXISTS('EUR'))
      );
      expect(exchangeRatesService.syncExchangeRates).not.toHaveBeenCalled();
    });

    it('should normalize lowercase code to uppercase', async () => {
      const dto = {
        code: 'gbp',
        name: 'British Pound',
      };

      const createdCurrency = {
        id: 'uuid-456',
        code: 'GBP',
        name: 'British Pound',
        isDefault: false,
        createdAt: new Date(),
      };

      mockCurrenciesRepository.existsByCode.mockResolvedValue(false);
      mockCurrenciesRepository.create.mockResolvedValue(createdCurrency);

      await service.create(dto);

      expect(currenciesRepository.existsByCode).toHaveBeenCalledWith('GBP');
      expect(currenciesRepository.create).toHaveBeenCalledWith({
        code: 'GBP',
        name: 'British Pound',
      });
    });

    it('should trim whitespace from code and name', async () => {
      const dto = {
        code: ' CHF ',
        name: ' Swiss Franc ',
      };

      const createdCurrency = {
        id: 'uuid-789',
        code: 'CHF',
        name: 'Swiss Franc',
        isDefault: false,
        createdAt: new Date(),
      };

      mockCurrenciesRepository.existsByCode.mockResolvedValue(false);
      mockCurrenciesRepository.create.mockResolvedValue(createdCurrency);

      await service.create(dto);

      expect(currenciesRepository.existsByCode).toHaveBeenCalledWith('CHF');
      expect(currenciesRepository.create).toHaveBeenCalledWith({
        code: 'CHF',
        name: 'Swiss Franc',
      });
    });
  });

  describe('getDefaultCurrency', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return the default currency from DEFAULT_CURRENCY env var', async () => {
      process.env.DEFAULT_CURRENCY = 'USD';

      const defaultCurrency = {
        id: 'uuid-usd',
        code: 'USD',
        name: 'US Dollar',
        isDefault: true,
        createdAt: new Date(),
      };

      mockCurrenciesRepository.findByCode.mockResolvedValue(defaultCurrency);

      const result = await service.getDefaultCurrency();

      expect(result).toEqual(defaultCurrency);
      expect(currenciesRepository.findByCode).toHaveBeenCalledWith('USD');
    });

    it('should default to EUR when DEFAULT_CURRENCY env var is not set', async () => {
      delete process.env.DEFAULT_CURRENCY;

      const defaultCurrency = {
        id: 'uuid-eur',
        code: 'EUR',
        name: 'Euro',
        isDefault: true,
        createdAt: new Date(),
      };

      mockCurrenciesRepository.findByCode.mockResolvedValue(defaultCurrency);

      const result = await service.getDefaultCurrency();

      expect(result).toEqual(defaultCurrency);
      expect(currenciesRepository.findByCode).toHaveBeenCalledWith('EUR');
    });

    it('should return null when default currency does not exist in database', async () => {
      process.env.DEFAULT_CURRENCY = 'JPY';

      mockCurrenciesRepository.findByCode.mockResolvedValue(null);

      const result = await service.getDefaultCurrency();

      expect(result).toBeNull();
      expect(currenciesRepository.findByCode).toHaveBeenCalledWith('JPY');
    });
  });
});
