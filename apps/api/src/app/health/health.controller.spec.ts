import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, HealthCheckResult } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma.health';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;
  let prismaHealthIndicator: PrismaHealthIndicator;

  const mockHealthCheckService = {
    check: jest.fn(),
  };

  const mockPrismaHealthIndicator = {
    isHealthy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: PrismaHealthIndicator,
          useValue: mockPrismaHealthIndicator,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
    prismaHealthIndicator = module.get<PrismaHealthIndicator>(PrismaHealthIndicator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('check', () => {
    it('should return healthy status when all checks pass', async () => {
      const healthResult: HealthCheckResult = {
        status: 'ok',
        info: {
          database: {
            status: 'up',
          },
        },
        error: {},
        details: {
          database: {
            status: 'up',
          },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(healthResult);

      const result = await controller.check();

      expect(result).toEqual(healthResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
      ]);
    });

    it('should return unhealthy status when database check fails', async () => {
      const healthResult: HealthCheckResult = {
        status: 'error',
        info: {},
        error: {
          database: {
            status: 'down',
          },
        },
        details: {
          database: {
            status: 'down',
          },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(healthResult);

      const result = await controller.check();

      expect(result).toEqual(healthResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
      ]);
    });
  });

  describe('checkDatabase', () => {
    it('should return healthy database status when check passes', async () => {
      const healthResult: HealthCheckResult = {
        status: 'ok',
        info: {
          database: {
            status: 'up',
          },
        },
        error: {},
        details: {
          database: {
            status: 'up',
          },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(healthResult);

      const result = await controller.checkDatabase();

      expect(result).toEqual(healthResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
      ]);
    });

    it('should return unhealthy database status when check fails', async () => {
      const healthResult: HealthCheckResult = {
        status: 'error',
        info: {},
        error: {
          database: {
            status: 'down',
          },
        },
        details: {
          database: {
            status: 'down',
          },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(healthResult);

      const result = await controller.checkDatabase();

      expect(result).toEqual(healthResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
      ]);
    });
  });
});
