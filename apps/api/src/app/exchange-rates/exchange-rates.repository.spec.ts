import { Test, TestingModule } from '@nestjs/testing';
import { ExchangeRatesRepository } from './exchange-rates.repository';
import { PrismaService } from '../../prisma.service';

describe('ExchangeRatesRepository', () => {
  let repository: ExchangeRatesRepository;

  const mockPrismaService = {
    exchangeRate: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockRate = {
    id: 'rate-1',
    baseCurrency: 'EUR',
    targetCurrency: 'USD',
    date: new Date('2025-01-03'),
    rate: 1.0234,
    provider: 'ecb',
    createdAt: new Date('2025-01-03'),
    updatedAt: new Date('2025-01-03'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRatesRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<ExchangeRatesRepository>(ExchangeRatesRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all rates ordered by base currency, target currency and date', async () => {
      mockPrismaService.exchangeRate.findMany.mockResolvedValueOnce([mockRate]);

      const result = await repository.findAll();

      expect(result).toEqual([mockRate]);
      expect(mockPrismaService.exchangeRate.findMany).toHaveBeenCalledWith({
        orderBy: [
          { baseCurrency: 'asc' },
          { targetCurrency: 'asc' },
          { date: 'asc' },
        ],
      });
    });
  });

  describe('findByPairAndDate', () => {
    it('should look up the rate by the compound unique key', async () => {
      const date = new Date('2025-01-03');
      mockPrismaService.exchangeRate.findUnique.mockResolvedValueOnce(mockRate);

      const result = await repository.findByPairAndDate('EUR', 'USD', date);

      expect(result).toEqual(mockRate);
      expect(mockPrismaService.exchangeRate.findUnique).toHaveBeenCalledWith({
        where: {
          baseCurrency_targetCurrency_date: {
            baseCurrency: 'EUR',
            targetCurrency: 'USD',
            date,
          },
        },
      });
    });

    it('should return null when no rate exists', async () => {
      mockPrismaService.exchangeRate.findUnique.mockResolvedValueOnce(null);

      const result = await repository.findByPairAndDate(
        'EUR',
        'USD',
        new Date('2025-01-04')
      );

      expect(result).toBeNull();
    });
  });

  describe('findLatestOnOrBefore', () => {
    it('should return the most recent rate on or before the given date', async () => {
      const date = new Date('2025-01-06');
      mockPrismaService.exchangeRate.findFirst.mockResolvedValueOnce(mockRate);

      const result = await repository.findLatestOnOrBefore('EUR', 'USD', date);

      expect(result).toEqual(mockRate);
      expect(mockPrismaService.exchangeRate.findFirst).toHaveBeenCalledWith({
        where: {
          baseCurrency: 'EUR',
          targetCurrency: 'USD',
          date: {
            lte: date,
          },
        },
        orderBy: {
          date: 'desc',
        },
      });
    });

    it('should return null when no earlier rate exists', async () => {
      mockPrismaService.exchangeRate.findFirst.mockResolvedValueOnce(null);

      const result = await repository.findLatestOnOrBefore(
        'EUR',
        'USD',
        new Date('2000-01-01')
      );

      expect(result).toBeNull();
    });
  });

  describe('findLatestPerTargetCurrency', () => {
    it('should run a DISTINCT ON query with the base currency as parameter', async () => {
      const rows = [
        { targetCurrency: 'USD', rate: 1.0845, date: new Date('2025-01-03') },
        { targetCurrency: 'GBP', rate: 0.8567, date: new Date('2025-01-02') },
      ];
      mockPrismaService.$queryRaw.mockResolvedValueOnce(rows);

      const result = await repository.findLatestPerTargetCurrency('EUR');

      expect(result).toEqual(rows);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);

      const [strings, ...values] = mockPrismaService.$queryRaw.mock.calls[0];
      const sql = (strings as string[]).join('?');
      expect(sql).toContain('DISTINCT ON ("targetCurrency")');
      expect(sql).toContain('FROM "exchange_rates"');
      expect(sql).toContain('ORDER BY "targetCurrency", date DESC');
      // The base currency is passed as a parameter, not interpolated into the SQL
      expect(values).toEqual(['EUR']);
      expect(sql).not.toContain('EUR');
    });

    it('should return an empty array when no rates exist', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

      const result = await repository.findLatestPerTargetCurrency('EUR');

      expect(result).toEqual([]);
    });

    it('should propagate database errors', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(
        new Error('Database connection lost')
      );

      await expect(repository.findLatestPerTargetCurrency('EUR')).rejects.toThrow(
        'Database connection lost'
      );
    });
  });

  describe('upsert', () => {
    it('should create the rate or update rate and provider of the existing one', async () => {
      const date = new Date('2025-01-03');
      mockPrismaService.exchangeRate.upsert.mockResolvedValueOnce(mockRate);

      const result = await repository.upsert({
        baseCurrency: 'EUR',
        targetCurrency: 'USD',
        date,
        rate: 1.0234,
        provider: 'ecb',
      });

      expect(result).toBeUndefined();
      expect(mockPrismaService.exchangeRate.upsert).toHaveBeenCalledWith({
        where: {
          baseCurrency_targetCurrency_date: {
            baseCurrency: 'EUR',
            targetCurrency: 'USD',
            date,
          },
        },
        update: {
          rate: 1.0234,
          provider: 'ecb',
        },
        create: {
          baseCurrency: 'EUR',
          targetCurrency: 'USD',
          date,
          rate: 1.0234,
          provider: 'ecb',
        },
      });
    });

    it('should propagate database errors', async () => {
      mockPrismaService.exchangeRate.upsert.mockRejectedValueOnce(
        new Error('Database constraint violation')
      );

      await expect(
        repository.upsert({
          baseCurrency: 'EUR',
          targetCurrency: 'USD',
          date: new Date('2025-01-03'),
          rate: 1.0234,
          provider: 'ecb',
        })
      ).rejects.toThrow('Database constraint violation');
    });
  });
});
