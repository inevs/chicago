import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SecurityPricesController } from './security-prices.controller';
import { SecurityPricesService } from './security-prices.service';
import { PriceUpdateSchedulerService } from './price-update-scheduler.service';

describe('SecurityPricesController', () => {
  let controller: SecurityPricesController;
  let service: SecurityPricesService;
  let scheduler: PriceUpdateSchedulerService;

  const mockSecurityPricesService = {
    getLatestPrices: jest.fn(),
    syncHistoricalPrices: jest.fn(),
  };

  const mockPriceUpdateSchedulerService = {
    triggerManualUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SecurityPricesController],
      providers: [
        {
          provide: SecurityPricesService,
          useValue: mockSecurityPricesService,
        },
        {
          provide: PriceUpdateSchedulerService,
          useValue: mockPriceUpdateSchedulerService,
        },
      ],
    }).compile();

    controller = module.get<SecurityPricesController>(
      SecurityPricesController
    );
    service = module.get<SecurityPricesService>(SecurityPricesService);
    scheduler = module.get<PriceUpdateSchedulerService>(PriceUpdateSchedulerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLatestPrices', () => {
    it('should return latest prices', async () => {
      const prices = [
        {
          id: 'price-1',
          securityId: 'security-1',
          date: new Date('2024-01-01'),
          open: 100,
          high: 105,
          low: 99,
          close: 103,
          volume: 1000000,
          currency: 'USD',
          provider: 'yahoo',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockSecurityPricesService.getLatestPrices.mockResolvedValue(prices);

      const result = await controller.getLatestPrices();

      expect(result).toEqual(prices);
      expect(service.getLatestPrices).toHaveBeenCalled();
    });
  });

  describe('syncHistoricalPrices', () => {
    it('should sync prices without parameters', async () => {
      const syncResult = {
        provider: 'yahoo',
        from: '2017-01-01',
        to: '2024-01-01',
        securitiesProcessed: 5,
        pricesInserted: 1000,
        failures: [],
      };

      mockSecurityPricesService.syncHistoricalPrices.mockResolvedValue(
        syncResult
      );

      const result = await controller.syncHistoricalPrices();

      expect(result).toEqual(syncResult);
      expect(service.syncHistoricalPrices).toHaveBeenCalledWith({});
    });

    it('should sync prices with security ID filter', async () => {
      const syncResult = {
        provider: 'yahoo',
        from: '2017-01-01',
        to: '2024-01-01',
        securitiesProcessed: 1,
        pricesInserted: 200,
        failures: [],
      };

      mockSecurityPricesService.syncHistoricalPrices.mockResolvedValue(
        syncResult
      );

      const result = await controller.syncHistoricalPrices('security-1');

      expect(result).toEqual(syncResult);
      expect(service.syncHistoricalPrices).toHaveBeenCalledWith({
        securityId: 'security-1',
        from: undefined,
        to: undefined,
      });
    });

    it('should sync prices with date range', async () => {
      const syncResult = {
        provider: 'yahoo',
        from: '2024-01-01',
        to: '2024-12-31',
        securitiesProcessed: 5,
        pricesInserted: 500,
        failures: [],
      };

      mockSecurityPricesService.syncHistoricalPrices.mockResolvedValue(
        syncResult
      );

      const result = await controller.syncHistoricalPrices(
        undefined,
        '2024-01-01',
        '2024-12-31'
      );

      expect(result).toEqual(syncResult);
      expect(service.syncHistoricalPrices).toHaveBeenCalledWith({
        securityId: undefined,
        from: new Date('2024-01-01'),
        to: new Date('2024-12-31'),
      });
    });

    it('should throw BadRequestException for invalid from date', async () => {
      await expect(
        controller.syncHistoricalPrices(undefined, 'invalid-date')
      ).rejects.toThrow(BadRequestException);

      expect(service.syncHistoricalPrices).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid to date', async () => {
      await expect(
        controller.syncHistoricalPrices(
          undefined,
          '2024-01-01',
          'invalid-date'
        )
      ).rejects.toThrow(BadRequestException);

      expect(service.syncHistoricalPrices).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when from date is after to date', async () => {
      await expect(
        controller.syncHistoricalPrices(
          undefined,
          '2024-12-31',
          '2024-01-01'
        )
      ).rejects.toThrow(BadRequestException);

      expect(service.syncHistoricalPrices).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when from date is in the future', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      await expect(
        controller.syncHistoricalPrices(
          undefined,
          futureDate.toISOString().split('T')[0]
        )
      ).rejects.toThrow(BadRequestException);

      expect(service.syncHistoricalPrices).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when date range exceeds 10 years', async () => {
      await expect(
        controller.syncHistoricalPrices(
          undefined,
          '2010-01-01',
          '2024-01-01'
        )
      ).rejects.toThrow(BadRequestException);

      expect(service.syncHistoricalPrices).not.toHaveBeenCalled();
    });
  });

  describe('triggerDailyUpdate', () => {
    it('should trigger manual daily update', async () => {
      mockPriceUpdateSchedulerService.triggerManualUpdate.mockResolvedValue(
        undefined
      );

      const result = await controller.triggerDailyUpdate();

      expect(result).toEqual({ message: 'Daily price update triggered successfully' });
      expect(scheduler.triggerManualUpdate).toHaveBeenCalled();
    });

    it('should handle errors from scheduler', async () => {
      mockPriceUpdateSchedulerService.triggerManualUpdate.mockRejectedValue(
        new Error('Scheduler error')
      );

      await expect(controller.triggerDailyUpdate()).rejects.toThrow('Scheduler error');
      expect(scheduler.triggerManualUpdate).toHaveBeenCalled();
    });
  });
});
