import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CurrenciesService } from './currencies.service';
import { PrismaService } from '../../prisma.service';
import { CURRENCY_ERRORS } from '@dividends/shared';

describe('CurrenciesService', () => {
  let service: CurrenciesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    currency: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrenciesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CurrenciesService>(CurrenciesService);
    prisma = module.get<PrismaService>(PrismaService);
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

      mockPrismaService.currency.findMany.mockResolvedValue(currencies);

      const result = await service.findAll();

      expect(result).toEqual(currencies);
      expect(prisma.currency.findMany).toHaveBeenCalledWith({
        orderBy: { code: 'asc' },
      });
    });

    it('should return empty array when no currencies exist', async () => {
      mockPrismaService.currency.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should successfully create a currency with normalized code', async () => {
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

      mockPrismaService.currency.findUnique.mockResolvedValue(null);
      mockPrismaService.currency.create.mockResolvedValue(createdCurrency);

      const result = await service.create(dto);

      expect(result).toEqual(createdCurrency);
      expect(prisma.currency.findUnique).toHaveBeenCalledWith({
        where: { code: 'USD' },
      });
      expect(prisma.currency.create).toHaveBeenCalledWith({
        data: {
          code: 'USD',
          name: 'US Dollar',
        },
      });
    });

    it('should throw ConflictException when currency code already exists', async () => {
      const dto = {
        code: 'EUR',
        name: 'Euro',
      };

      const existingCurrency = {
        id: 'existing-id',
        code: 'EUR',
        name: 'Euro',
        isDefault: true,
        createdAt: new Date(),
      };

      mockPrismaService.currency.findUnique.mockResolvedValue(existingCurrency);

      await expect(service.create(dto)).rejects.toThrow(
        new ConflictException(CURRENCY_ERRORS.ALREADY_EXISTS('EUR'))
      );
      expect(prisma.currency.create).not.toHaveBeenCalled();
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

      mockPrismaService.currency.findUnique.mockResolvedValue(null);
      mockPrismaService.currency.create.mockResolvedValue(createdCurrency);

      await service.create(dto);

      expect(prisma.currency.findUnique).toHaveBeenCalledWith({
        where: { code: 'GBP' },
      });
      expect(prisma.currency.create).toHaveBeenCalledWith({
        data: {
          code: 'GBP',
          name: 'British Pound',
        },
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

      mockPrismaService.currency.findUnique.mockResolvedValue(null);
      mockPrismaService.currency.create.mockResolvedValue(createdCurrency);

      await service.create(dto);

      expect(prisma.currency.create).toHaveBeenCalledWith({
        data: {
          code: 'CHF',
          name: 'Swiss Franc',
        },
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

      mockPrismaService.currency.findUnique.mockResolvedValue(defaultCurrency);

      const result = await service.getDefaultCurrency();

      expect(result).toEqual(defaultCurrency);
      expect(prisma.currency.findUnique).toHaveBeenCalledWith({
        where: { code: 'USD' },
      });
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

      mockPrismaService.currency.findUnique.mockResolvedValue(defaultCurrency);

      const result = await service.getDefaultCurrency();

      expect(result).toEqual(defaultCurrency);
      expect(prisma.currency.findUnique).toHaveBeenCalledWith({
        where: { code: 'EUR' },
      });
    });

    it('should return null when default currency does not exist in database', async () => {
      process.env.DEFAULT_CURRENCY = 'JPY';

      mockPrismaService.currency.findUnique.mockResolvedValue(null);

      const result = await service.getDefaultCurrency();

      expect(result).toBeNull();
    });
  });
});
