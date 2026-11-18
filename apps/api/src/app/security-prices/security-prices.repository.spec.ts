import { Test, TestingModule } from '@nestjs/testing';
import { SecurityPricesRepository } from './security-prices.repository';
import { PrismaService } from '../../prisma.service';

describe('SecurityPricesRepository', () => {
  let repository: SecurityPricesRepository;

  const mockPrismaService = {
    securityPrice: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      createMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const sqlOf = (call: unknown[]): string =>
    (call[0] as string[]).join('?');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityPricesRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<SecurityPricesRepository>(SecurityPricesRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllForExport', () => {
    it('should return all prices ordered by date ascending', async () => {
      const prices = [{ id: 'price-1', close: 100 }];
      mockPrismaService.securityPrice.findMany.mockResolvedValueOnce(prices);

      const result = await repository.findAllForExport();

      expect(result).toEqual(prices);
      expect(mockPrismaService.securityPrice.findMany).toHaveBeenCalledWith({
        orderBy: { date: 'asc' },
      });
    });
  });

  describe('findLatestPerSecurity', () => {
    it('should run a DISTINCT ON query and return the raw rows', async () => {
      const rows = [
        {
          id: 'price-1',
          securityId: 'security-1',
          date: new Date('2024-01-01'),
          open: 100.5,
          high: 105.2,
          low: 99.8,
          close: 103.5,
          volume: 1000000,
          currency: 'USD',
          provider: 'yahoo',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];
      mockPrismaService.$queryRaw.mockResolvedValueOnce(rows);

      const result = await repository.findLatestPerSecurity();

      expect(result).toEqual(rows);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);

      const call = mockPrismaService.$queryRaw.mock.calls[0];
      const sql = sqlOf(call);
      expect(sql).toContain('DISTINCT ON ("securityId")');
      expect(sql).toContain('FROM security_prices');
      expect(sql).toContain('ORDER BY "securityId", date DESC');
      // No interpolated values
      expect(call).toHaveLength(1);
    });
  });

  describe('findLatestDateBySecurityId', () => {
    it('should return the date of the latest price of the security', async () => {
      const date = new Date('2024-12-31');
      mockPrismaService.securityPrice.findFirst.mockResolvedValueOnce({ date });

      const result = await repository.findLatestDateBySecurityId('security-1');

      expect(result).toEqual(date);
      expect(mockPrismaService.securityPrice.findFirst).toHaveBeenCalledWith({
        where: { securityId: 'security-1' },
        orderBy: { date: 'desc' },
        select: { date: true },
      });
    });

    it('should return null when the security has no prices', async () => {
      mockPrismaService.securityPrice.findFirst.mockResolvedValueOnce(null);

      const result = await repository.findLatestDateBySecurityId('security-1');

      expect(result).toBeNull();
    });
  });

  describe('findEarliestLatestDate', () => {
    it('should return the earliest of the latest dates across all securities', async () => {
      const date = new Date('2024-11-01');
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ min_date: date }]);

      const result = await repository.findEarliestLatestDate();

      expect(result).toEqual(date);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);

      const sql = sqlOf(mockPrismaService.$queryRaw.mock.calls[0]);
      expect(sql).toContain('MIN(max_date) as min_date');
      expect(sql).toContain('GROUP BY "securityId"');
    });

    it('should return null when min_date is null', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ min_date: null }]);

      const result = await repository.findEarliestLatestDate();

      expect(result).toBeNull();
    });

    it('should return null when the query returns no rows', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

      const result = await repository.findEarliestLatestDate();

      expect(result).toBeNull();
    });
  });

  describe('createMany', () => {
    it('should insert the prices skipping duplicates and return the count', async () => {
      const now = new Date('2024-01-02');
      const data = [
        {
          id: 'price-1',
          securityId: 'security-1',
          date: new Date('2024-01-01'),
          open: 100,
          high: 105,
          low: 99,
          close: 102,
          volume: null,
          currency: 'USD',
          provider: 'yahoo',
          createdAt: now,
          updatedAt: now,
        },
      ];
      mockPrismaService.securityPrice.createMany.mockResolvedValueOnce({
        count: 1,
      });

      const result = await repository.createMany(data);

      expect(result).toBe(1);
      expect(mockPrismaService.securityPrice.createMany).toHaveBeenCalledWith({
        data,
        skipDuplicates: true,
      });
    });

    it('should return 0 when all prices already exist', async () => {
      mockPrismaService.securityPrice.createMany.mockResolvedValueOnce({
        count: 0,
      });

      const result = await repository.createMany([]);

      expect(result).toBe(0);
    });
  });
});
