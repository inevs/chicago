import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../api/src/app/app.module';
import { PrismaService } from '../../api/src/prisma.service';

describe('Securities (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.security.deleteMany({});
  });

  afterAll(async () => {
    await prisma.security.deleteMany({});
    await app.close();
  });

  describe('POST /api/securities', () => {
    it('should create a security with valid data', () => {
      return request(app.getHttpServer())
        .post('/api/securities')
        .send({
          name: 'Apple Inc.',
          symbol: 'AAPL',
          isin: 'US0378331005',
          type: 'STOCK',
          exchange: 'NASDAQ',
          currency: 'USD',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.symbol).toBe('AAPL');
          expect(res.body.name).toBe('Apple Inc.');
          expect(res.body.exchange).toBe('NASDAQ');
          expect(res.body.currency).toBe('USD');
        });
    });

    it('should create security without optional fields', () => {
      return request(app.getHttpServer())
        .post('/api/securities')
        .send({
          name: 'Microsoft Corp.',
          symbol: 'MSFT',
          type: 'STOCK',
          exchange: 'NASDAQ',
          currency: 'USD',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.symbol).toBe('MSFT');
          expect(res.body.isin).toBeNull();
          expect(res.body.wkn).toBeNull();
        });
    });

    it('should reject duplicate symbol', async () => {
      const security = {
        name: 'Apple Inc.',
        symbol: 'AAPL',
        type: 'STOCK',
        exchange: 'NASDAQ',
        currency: 'USD',
      };

      // Create first security
      await request(app.getHttpServer())
        .post('/api/securities')
        .send(security)
        .expect(201);

      // Try to create duplicate
      return request(app.getHttpServer())
        .post('/api/securities')
        .send(security)
        .expect(409);
    });

    it('should reject invalid ISIN format', () => {
      return request(app.getHttpServer())
        .post('/api/securities')
        .send({
          name: 'Apple Inc.',
          symbol: 'AAPL',
          isin: 'INVALID',
          type: 'STOCK',
          exchange: 'NASDAQ',
          currency: 'USD',
        })
        .expect(400);
    });

    it('should reject invalid currency format', () => {
      return request(app.getHttpServer())
        .post('/api/securities')
        .send({
          name: 'Apple Inc.',
          symbol: 'AAPL',
          type: 'STOCK',
          exchange: 'NASDAQ',
          currency: 'US', // Too short
        })
        .expect(400);
    });

    it('should reject missing required fields', () => {
      return request(app.getHttpServer())
        .post('/api/securities')
        .send({
          name: 'Apple Inc.',
          // Missing symbol, type, exchange, currency
        })
        .expect(400);
    });

    it('should auto-uppercase symbol', () => {
      return request(app.getHttpServer())
        .post('/api/securities')
        .send({
          name: 'Apple Inc.',
          symbol: 'aapl',
          type: 'STOCK',
          exchange: 'NASDAQ',
          currency: 'USD',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.symbol).toBe('AAPL');
        });
    });

    it('should create ETF security', () => {
      return request(app.getHttpServer())
        .post('/api/securities')
        .send({
          name: 'Vanguard S&P 500 ETF',
          symbol: 'VOO',
          type: 'ETF',
          exchange: 'NYSE',
          currency: 'USD',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.type).toBe('ETF');
        });
    });
  });

  describe('GET /api/securities', () => {
    it('should return empty array when no securities exist', () => {
      return request(app.getHttpServer())
        .get('/api/securities')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual([]);
        });
    });

    it('should return all securities ordered by symbol', async () => {
      // Create multiple securities
      await request(app.getHttpServer())
        .post('/api/securities')
        .send({
          name: 'Microsoft Corp.',
          symbol: 'MSFT',
          type: 'STOCK',
          exchange: 'NASDAQ',
          currency: 'USD',
        });

      await request(app.getHttpServer())
        .post('/api/securities')
        .send({
          name: 'Apple Inc.',
          symbol: 'AAPL',
          type: 'STOCK',
          exchange: 'NASDAQ',
          currency: 'USD',
        });

      return request(app.getHttpServer())
        .get('/api/securities')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveLength(2);
          expect(res.body[0].symbol).toBe('AAPL'); // Ordered by symbol
          expect(res.body[1].symbol).toBe('MSFT');
        });
    });
  });

  describe('GET /api/securities/:id', () => {
    it('should return security by valid ID', async () => {
      // Create a security first
      const createRes = await request(app.getHttpServer())
        .post('/api/securities')
        .send({
          name: 'Apple Inc.',
          symbol: 'AAPL',
          type: 'STOCK',
          exchange: 'NASDAQ',
          currency: 'USD',
        });

      const securityId = createRes.body.id;

      return request(app.getHttpServer())
        .get(`/api/securities/${securityId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(securityId);
          expect(res.body.symbol).toBe('AAPL');
        });
    });

    it('should return 404 for non-existent ID', () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      return request(app.getHttpServer())
        .get(`/api/securities/${fakeId}`)
        .expect(404);
    });
  });
});
