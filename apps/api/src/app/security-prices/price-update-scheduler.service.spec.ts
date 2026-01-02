import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PriceUpdateSchedulerService } from './price-update-scheduler.service';
import { SecurityPricesService } from './security-prices.service';

describe('PriceUpdateSchedulerService', () => {
  let service: PriceUpdateSchedulerService;
  let securityPricesService: SecurityPricesService;

  const mockSecurityPricesService = {
    getLastPriceUpdateDate: jest.fn(),
    syncHistoricalPrices: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceUpdateSchedulerService,
        {
          provide: SecurityPricesService,
          useValue: mockSecurityPricesService,
        },
      ],
    }).compile();

    service = module.get<PriceUpdateSchedulerService>(PriceUpdateSchedulerService);
    securityPricesService = module.get<SecurityPricesService>(SecurityPricesService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleDailyPriceUpdate', () => {
    it('should run full historical sync when no prices exist', async () => {
      mockSecurityPricesService.getLastPriceUpdateDate.mockResolvedValue(null);
      mockSecurityPricesService.syncHistoricalPrices.mockResolvedValue({
        provider: 'yahoo',
        from: '2017-01-01',
        to: '2024-12-31',
        securitiesProcessed: 5,
        pricesInserted: 1000,
        failures: [],
      });

      await service.handleDailyPriceUpdate();

      expect(securityPricesService.getLastPriceUpdateDate).toHaveBeenCalled();
      expect(securityPricesService.syncHistoricalPrices).toHaveBeenCalledWith();
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('No existing price data found')
      );
    });

    it('should sync from last update date to today', async () => {
      const lastUpdateDate = new Date('2024-12-25');
      const today = new Date();

      mockSecurityPricesService.getLastPriceUpdateDate.mockResolvedValue(lastUpdateDate);
      mockSecurityPricesService.syncHistoricalPrices.mockResolvedValue({
        provider: 'yahoo',
        from: '2024-12-26',
        to: today.toISOString().slice(0, 10),
        securitiesProcessed: 5,
        pricesInserted: 50,
        failures: [],
      });

      await service.handleDailyPriceUpdate();

      const expectedFromDate = new Date(lastUpdateDate);
      expectedFromDate.setDate(expectedFromDate.getDate() + 1);

      expect(securityPricesService.getLastPriceUpdateDate).toHaveBeenCalled();
      expect(securityPricesService.syncHistoricalPrices).toHaveBeenCalledWith({
        from: expectedFromDate,
        to: expect.any(Date),
      });
    });

    it('should skip update when prices are already up to date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      mockSecurityPricesService.getLastPriceUpdateDate.mockResolvedValue(futureDate);

      await service.handleDailyPriceUpdate();

      expect(securityPricesService.getLastPriceUpdateDate).toHaveBeenCalled();
      expect(securityPricesService.syncHistoricalPrices).not.toHaveBeenCalled();
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('already up to date')
      );
    });

    it('should log failures when some securities fail to update', async () => {
      const lastUpdateDate = new Date('2024-12-25');

      mockSecurityPricesService.getLastPriceUpdateDate.mockResolvedValue(lastUpdateDate);
      mockSecurityPricesService.syncHistoricalPrices.mockResolvedValue({
        provider: 'yahoo',
        from: '2024-12-26',
        to: '2024-12-31',
        securitiesProcessed: 5,
        pricesInserted: 40,
        failures: [
          { symbol: 'AAPL', error: 'Rate limit exceeded' },
          { symbol: 'GOOGL', error: 'Connection timeout' },
        ],
      });

      await service.handleDailyPriceUpdate();

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('Some securities failed to update')
      );
    });

    it('should handle errors gracefully and log them', async () => {
      const error = new Error('Database connection failed');
      mockSecurityPricesService.getLastPriceUpdateDate.mockRejectedValue(error);

      await service.handleDailyPriceUpdate();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Daily price update failed'),
        expect.any(String)
      );
    });

    it('should handle non-Error exceptions', async () => {
      mockSecurityPricesService.getLastPriceUpdateDate.mockRejectedValue('String error');

      await service.handleDailyPriceUpdate();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('String error'),
        undefined
      );
    });
  });

  describe('triggerManualUpdate', () => {
    it('should trigger handleDailyPriceUpdate when called manually', async () => {
      const lastUpdateDate = new Date('2024-12-25');

      mockSecurityPricesService.getLastPriceUpdateDate.mockResolvedValue(lastUpdateDate);
      mockSecurityPricesService.syncHistoricalPrices.mockResolvedValue({
        provider: 'yahoo',
        from: '2024-12-26',
        to: '2024-12-31',
        securitiesProcessed: 5,
        pricesInserted: 50,
        failures: [],
      });

      await service.triggerManualUpdate();

      expect(Logger.prototype.log).toHaveBeenCalledWith('Manual price update triggered');
      expect(securityPricesService.getLastPriceUpdateDate).toHaveBeenCalled();
      expect(securityPricesService.syncHistoricalPrices).toHaveBeenCalled();
    });
  });
});
