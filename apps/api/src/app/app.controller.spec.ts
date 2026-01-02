import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SecurityType } from '@dividends/shared';

describe('AppController', () => {
  let controller: AppController;
  let service: AppService;

  const mockAppService = {
    getData: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    service = module.get<AppService>(AppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getData', () => {
    it('should return security data from service', () => {
      const expectedData = {
        id: '1',
        name: 'Example Security',
        symbol: 'EXM',
        isin: null,
        wkn: null,
        type: SecurityType.STOCK,
        exchange: 'NASDAQ',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAppService.getData.mockReturnValue(expectedData);

      const result = controller.getData();

      expect(result).toEqual(expectedData);
      expect(service.getData).toHaveBeenCalled();
    });
  });
});
