import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import {
  HealthCheckService,
  HealthIndicatorService,
  TerminusModule,
} from '@nestjs/terminus';
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
        HealthIndicatorService,
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

    it('should return down status when database query fails', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Connection refused'));

      const result = await indicator.isHealthy('database');

      expect(result).toEqual({
        database: {
          status: 'down',
        },
      });
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

describe('PrismaHealthIndicator with HealthCheckService', () => {
  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };
  let healthCheckService: HealthCheckService;
  let indicator: PrismaHealthIndicator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule.forRoot({ logger: false })],
      providers: [
        PrismaHealthIndicator,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    healthCheckService = module.get(HealthCheckService);
    indicator = module.get(PrismaHealthIndicator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should report ok when the database is reachable', async () => {
    mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await healthCheckService.check([
      () => indicator.isHealthy('database'),
    ]);

    expect(result.status).toBe('ok');
    expect(result.details).toEqual({ database: { status: 'up' } });
  });

  it('should throw ServiceUnavailableException when the database is down', async () => {
    mockPrismaService.$queryRaw.mockRejectedValue(new Error('Connection refused'));

    await expect(
      healthCheckService.check([() => indicator.isHealthy('database')])
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
