import { Test, TestingModule } from '@nestjs/testing';
import { SecuritiesController } from './securities.controller';
import { SecuritiesService } from './securities.service';
import { SecurityType } from '@dividends/shared';

describe('SecuritiesController', () => {
  let controller: SecuritiesController;
  let service: SecuritiesService;

  const mockSecuritiesService = {
    createSecurity: jest.fn(),
    getAllSecurities: jest.fn(),
    getSecurityById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SecuritiesController],
      providers: [
        {
          provide: SecuritiesService,
          useValue: mockSecuritiesService,
        },
      ],
    }).compile();

    controller = module.get<SecuritiesController>(SecuritiesController);
    service = module.get<SecuritiesService>(SecuritiesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and return a security', async () => {
      const dto = {
        name: 'Apple Inc.',
        symbol: 'AAPL',
        type: SecurityType.STOCK,
        exchange: 'NASDAQ',
        currency: 'USD',
      };

      const createdSecurity = {
        id: 'uuid-123',
        ...dto,
        isin: null,
        wkn: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSecuritiesService.createSecurity.mockResolvedValue(createdSecurity);

      const result = await controller.create(dto);

      expect(result).toEqual(createdSecurity);
      expect(service.createSecurity).toHaveBeenCalledWith(dto);
    });

    it('should create security with all optional fields', async () => {
      const dto = {
        name: 'Apple Inc.',
        symbol: 'AAPL',
        isin: 'US0378331005',
        wkn: '865985',
        type: SecurityType.STOCK,
        exchange: 'NASDAQ',
        currency: 'USD',
      };

      const createdSecurity = {
        id: 'uuid-123',
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSecuritiesService.createSecurity.mockResolvedValue(createdSecurity);

      const result = await controller.create(dto);

      expect(result).toMatchObject({
        name: 'Apple Inc.',
        symbol: 'AAPL',
        isin: 'US0378331005',
        wkn: '865985',
      });
      expect(service.createSecurity).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return an array of securities', async () => {
      const securities = [
        {
          id: 'uuid-1',
          name: 'Apple Inc.',
          symbol: 'AAPL',
          isin: 'US0378331005',
          wkn: null,
          type: SecurityType.STOCK,
          exchange: 'NASDAQ',
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'uuid-2',
          name: 'Microsoft Corp.',
          symbol: 'MSFT',
          isin: null,
          wkn: null,
          type: SecurityType.STOCK,
          exchange: 'NASDAQ',
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockSecuritiesService.getAllSecurities.mockResolvedValue(securities);

      const result = await controller.findAll();

      expect(result).toEqual(securities);
      expect(service.getAllSecurities).toHaveBeenCalled();
    });

    it('should return empty array when no securities exist', async () => {
      mockSecuritiesService.getAllSecurities.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a security by ID', async () => {
      const security = {
        id: 'uuid-123',
        name: 'Apple Inc.',
        symbol: 'AAPL',
        isin: 'US0378331005',
        wkn: null,
        type: SecurityType.STOCK,
        exchange: 'NASDAQ',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSecuritiesService.getSecurityById.mockResolvedValue(security);

      const result = await controller.findOne('uuid-123');

      expect(result).toEqual(security);
      expect(service.getSecurityById).toHaveBeenCalledWith('uuid-123');
    });
  });
});
