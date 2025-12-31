import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CurrenciesController } from './currencies.controller';
import { CurrenciesService } from './currencies.service';
import { CurrencyResponseDto } from './dto/currency-response.dto';
import { CURRENCY_ERRORS } from '@dividends/shared';

describe('CurrenciesController', () => {
  let controller: CurrenciesController;
  let service: CurrenciesService;

  const mockCurrenciesService = {
    findAll: jest.fn(),
    create: jest.fn(),
    getDefaultCurrency: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CurrenciesController],
      providers: [
        {
          provide: CurrenciesService,
          useValue: mockCurrenciesService,
        },
      ],
    }).compile();

    controller = module.get<CurrenciesController>(CurrenciesController);
    service = module.get<CurrenciesService>(CurrenciesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return an array of CurrencyResponseDto', async () => {
      const currencies = [
        {
          id: 'uuid-1',
          code: 'CHF',
          name: 'Swiss Franc',
          createdAt: new Date(),
        },
        {
          id: 'uuid-2',
          code: 'EUR',
          name: 'Euro',
          createdAt: new Date(),
        },
        {
          id: 'uuid-3',
          code: 'USD',
          name: 'US Dollar',
          createdAt: new Date(),
        },
      ];

      mockCurrenciesService.findAll.mockResolvedValue(currencies);

      const result = await controller.findAll();

      expect(result).toHaveLength(3);
      expect(result[0]).toBeInstanceOf(CurrencyResponseDto);
      expect(result[0]).toEqual({ code: 'CHF', name: 'Swiss Franc' });
      expect(result[1]).toEqual({ code: 'EUR', name: 'Euro' });
      expect(result[2]).toEqual({ code: 'USD', name: 'US Dollar' });
      expect(service.findAll).toHaveBeenCalled();

      // Verify that internal fields (id, createdAt) are not exposed
      expect(result[0]).not.toHaveProperty('id');
      expect(result[0]).not.toHaveProperty('createdAt');
    });

    it('should return empty array when no currencies exist', async () => {
      mockCurrenciesService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create and return a CurrencyResponseDto', async () => {
      const dto = {
        code: 'JPY',
        name: 'Japanese Yen',
      };

      const createdCurrency = {
        id: 'uuid-123',
        code: 'JPY',
        name: 'Japanese Yen',
        createdAt: new Date(),
      };

      mockCurrenciesService.create.mockResolvedValue(createdCurrency);

      const result = await controller.create(dto);

      expect(result).toBeInstanceOf(CurrencyResponseDto);
      expect(result).toEqual({ code: 'JPY', name: 'Japanese Yen' });
      expect(service.create).toHaveBeenCalledWith(dto);

      // Verify that internal fields (id, createdAt) are not exposed
      expect(result).not.toHaveProperty('id');
      expect(result).not.toHaveProperty('createdAt');
    });

    it('should throw ConflictException when currency already exists', async () => {
      const dto = {
        code: 'EUR',
        name: 'Euro',
      };

      mockCurrenciesService.create.mockRejectedValue(
        new ConflictException(CURRENCY_ERRORS.ALREADY_EXISTS('EUR'))
      );

      await expect(controller.create(dto)).rejects.toThrow(ConflictException);
      await expect(controller.create(dto)).rejects.toThrow(
        CURRENCY_ERRORS.ALREADY_EXISTS('EUR')
      );
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it('should handle uppercase normalization from service', async () => {
      const dto = {
        code: 'gbp',
        name: 'British Pound',
      };

      const createdCurrency = {
        id: 'uuid-456',
        code: 'GBP',
        name: 'British Pound',
        createdAt: new Date(),
      };

      mockCurrenciesService.create.mockResolvedValue(createdCurrency);

      const result = await controller.create(dto);

      expect(result).toEqual({ code: 'GBP', name: 'British Pound' });
    });
  });

  describe('getDefault', () => {
    it('should return the default currency as CurrencyResponseDto', async () => {
      const defaultCurrency = {
        id: 'uuid-eur',
        code: 'EUR',
        name: 'Euro',
        createdAt: new Date(),
      };

      mockCurrenciesService.getDefaultCurrency.mockResolvedValue(defaultCurrency);

      const result = await controller.getDefault();

      expect(result).toBeInstanceOf(CurrencyResponseDto);
      expect(result).toEqual({ code: 'EUR', name: 'Euro' });
      expect(service.getDefaultCurrency).toHaveBeenCalled();

      // Verify that internal fields (id, createdAt) are not exposed
      expect(result).not.toHaveProperty('id');
      expect(result).not.toHaveProperty('createdAt');
    });

    it('should return null when default currency does not exist', async () => {
      mockCurrenciesService.getDefaultCurrency.mockResolvedValue(null);

      const result = await controller.getDefault();

      expect(result).toBeNull();
      expect(service.getDefaultCurrency).toHaveBeenCalled();
    });
  });
});
