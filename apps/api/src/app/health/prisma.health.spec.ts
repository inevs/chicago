import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckError } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';
import { PrismaService } from '../../prisma.service';

describe('PrismaHealthIndicator', () => {
  let indicator: PrismaHealthIndicator;
  let prismaService: PrismaService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaHealthIndicator,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    indicator = module.get<PrismaHealthIndicator>(PrismaHealthIndicator);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isHealthy', () => {
    it('should return healthy status when database query succeeds', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await indicator.isHealthy('database');

      expect(result).toEqual({
        database: {
          status: 'up',
        },
      });
      expect(prismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should throw HealthCheckError when database query fails', async () => {
      const dbError = new Error('Connection refused');
      mockPrismaService.$queryRaw.mockRejectedValue(dbError);

      await expect(indicator.isHealthy('database')).rejects.toThrow(HealthCheckError);

      try {
        await indicator.isHealthy('database');
      } catch (error) {
        expect(error).toBeInstanceOf(HealthCheckError);
        expect(error.message).toBe('Prisma check failed');
        expect(error.causes).toEqual({
          database: {
            status: 'down',
          },
        });
      }

      expect(prismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should use the provided key in the result', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await indicator.isHealthy('custom-db-key');

      expect(result).toEqual({
        'custom-db-key': {
          status: 'up',
        },
      });
    });
  });
});
