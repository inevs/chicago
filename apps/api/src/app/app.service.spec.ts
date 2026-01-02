import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { SecurityType } from '@dividends/shared';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  describe('getData', () => {
    it('should return example security data', () => {
      const result = service.getData();

      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(result.name).toBe('Example Security');
      expect(result.symbol).toBe('EXM');
      expect(result.isin).toBeNull();
      expect(result.wkn).toBeNull();
      expect(result.type).toBe(SecurityType.STOCK);
      expect(result.exchange).toBe('NASDAQ');
      expect(result.currency).toBe('USD');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });
});
