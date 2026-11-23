import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import { AppModule } from '../../api/src/app/app.module';
import { GlobalExceptionFilter } from '../../api/src/app/common/filters/global-exception.filter';

describe('Request logging (e2e)', () => {
  let app: INestApplication;
  let logSpy: jest.SpyInstance;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Same setup as apps/api/src/main.ts (as far as relevant for routing)
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.setGlobalPrefix('api');
    await app.init();
  });

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('logs every API request with method, URL, status code and duration', async () => {
    await request(app.getHttpServer()).get('/api/securities').expect(401);

    expect(logSpy).toHaveBeenCalledWith({
      method: 'GET',
      url: '/api/securities',
      statusCode: 401,
      durationMs: expect.any(Number),
    });
  });

  it.each(['/api/health', '/api/health/db'])(
    'does not log requests to the health check %s',
    async (path) => {
      await request(app.getHttpServer()).get(path).expect(200);

      expect(logSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ url: path })
      );
    }
  );
});
