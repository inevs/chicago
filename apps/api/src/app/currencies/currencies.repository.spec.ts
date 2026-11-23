import { Test, TestingModule } from '@nestjs/testing';
import { CurrenciesRepository } from './currencies.repository';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import { DuplicateRecordError } from '../database/duplicate-record.error';

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('Database error', {
    code,
    clientVersion: 'test',
  });

describe('CurrenciesRepository', () => {
  let repository: CurrenciesRepository;
  let prisma: PrismaService;

  const mockPrismaService = {
    currency: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const usd = {
    id: 'uuid-usd',
    code: 'USD',
    name: 'US Dollar',
    isDefault: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrenciesRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<CurrenciesRepository>(CurrenciesRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all currencies ordered by code', async () => {
      const currencies = [
        { ...usd, id: 'uuid-chf', code: 'CHF', name: 'Swiss Franc' },
        usd,
      ];
      mockPrismaService.currency.findMany.mockResolvedValue(currencies);

      const result = await repository.findAll();

      expect(result).toEqual(currencies);
      expect(prisma.currency.findMany).toHaveBeenCalledWith({
        orderBy: { code: 'asc' },
      });
    });
  });

  describe('findByCode', () => {
    it('should look up the currency by code', async () => {
      mockPrismaService.currency.findUnique.mockResolvedValue(usd);

      const result = await repository.findByCode('USD');

      expect(result).toEqual(usd);
      expect(prisma.currency.findUnique).toHaveBeenCalledWith({
        where: { code: 'USD' },
      });
    });

    it('should return null when the currency does not exist', async () => {
      mockPrismaService.currency.findUnique.mockResolvedValue(null);

      const result = await repository.findByCode('XYZ');

      expect(result).toBeNull();
    });
  });

  describe('existsByCode', () => {
    it('should return true when the currency exists', async () => {
      mockPrismaService.currency.findUnique.mockResolvedValue(usd);

      const result = await repository.existsByCode('USD');

      expect(result).toBe(true);
      expect(prisma.currency.findUnique).toHaveBeenCalledWith({
        where: { code: 'USD' },
      });
    });

    it('should return false when the currency does not exist', async () => {
      mockPrismaService.currency.findUnique.mockResolvedValue(null);

      const result = await repository.existsByCode('XYZ');

      expect(result).toBe(false);
    });
  });

  describe('findExistingCodes', () => {
    it('should query the given codes and return the existing ones as strings', async () => {
      mockPrismaService.currency.findMany.mockResolvedValue([
        { code: 'USD' },
        { code: 'EUR' },
      ]);

      const result = await repository.findExistingCodes(['USD', 'EUR', 'XYZ']);

      expect(result).toEqual(['USD', 'EUR']);
      expect(prisma.currency.findMany).toHaveBeenCalledWith({
        where: { code: { in: ['USD', 'EUR', 'XYZ'] } },
        select: { code: true },
      });
    });

    it('should return an empty array when none of the codes exist', async () => {
      mockPrismaService.currency.findMany.mockResolvedValue([]);

      const result = await repository.findExistingCodes(['XYZ']);

      expect(result).toEqual([]);
    });
  });

  describe('findCodesExcept', () => {
    it('should return all codes except the excluded one', async () => {
      mockPrismaService.currency.findMany.mockResolvedValue([
        { code: 'CHF' },
        { code: 'USD' },
      ]);

      const result = await repository.findCodesExcept('EUR');

      expect(result).toEqual(['CHF', 'USD']);
      expect(prisma.currency.findMany).toHaveBeenCalledWith({
        where: { code: { not: 'EUR' } },
        select: { code: true },
      });
    });

    it('should return an empty array when no other currencies exist', async () => {
      mockPrismaService.currency.findMany.mockResolvedValue([]);

      const result = await repository.findCodesExcept('EUR');

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create the currency with the given data', async () => {
      mockPrismaService.currency.create.mockResolvedValue(usd);

      const result = await repository.create({ code: 'USD', name: 'US Dollar' });

      expect(result).toEqual(usd);
      expect(prisma.currency.create).toHaveBeenCalledWith({
        data: { code: 'USD', name: 'US Dollar' },
      });
    });

    it('should throw a DuplicateRecordError when the code violates the unique constraint', async () => {
      mockPrismaService.currency.create.mockRejectedValue(
        prismaError('P2002')
      );

      await expect(
        repository.create({ code: 'USD', name: 'US Dollar' })
      ).rejects.toThrow(DuplicateRecordError);
    });

    it('should rethrow other database errors unchanged', async () => {
      const error = prismaError('P2003');
      mockPrismaService.currency.create.mockRejectedValue(error);

      await expect(
        repository.create({ code: 'USD', name: 'US Dollar' })
      ).rejects.toBe(error);
    });
  });
});
