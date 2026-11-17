import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../api/src/app/app.module';
import { GlobalExceptionFilter } from '../../api/src/app/common/filters/global-exception.filter';
import { PrismaService } from '../../api/src/prisma.service';
import { SecurityPricesService } from '../../api/src/app/security-prices/security-prices.service';

const TEST_USER = {
  email: 'e2e@example.com',
  password: 'E2eTestPassword123!',
  name: 'E2E User',
};

/** Deletes all data of the e2e database (see support/e2e-database.ts). */
async function cleanDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$transaction([
    prisma.dividendPayment.deleteMany({}),
    prisma.securityTransaction.deleteMany({}),
    prisma.securityPrice.deleteMany({}),
    prisma.exchangeRate.deleteMany({}),
    prisma.security.deleteMany({}),
    prisma.currency.deleteMany({}),
    prisma.user.deleteMany({}),
  ]);
}

describe('Securities (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  /** Supertest agent with the global prefix and a valid JWT. */
  const api = {
    get: (path: string) =>
      request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${token}`),
    post: (path: string) =>
      request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${token}`),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Same setup as apps/api/src/main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
        transformOptions: { enableImplicitConversion: true },
      })
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.setGlobalPrefix('api');

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    // Creating a security starts a background price sync (Yahoo Finance, ECB).
    // Stub it so the tests do not call external services.
    jest.spyOn(app.get(SecurityPricesService), 'syncHistoricalPrices').mockResolvedValue({
      provider: 'yahoo',
      from: '',
      to: '',
      securitiesProcessed: 0,
      pricesInserted: 0,
      failures: [],
      exchangeRates: { synced: false },
    });

    await cleanDatabase(prisma);

    // Securities reference their currency
    await prisma.currency.create({ data: { code: 'USD', name: 'US-Dollar' } });

    // Registration is disabled (single-user mode), so the user is created directly
    await prisma.user.create({
      data: {
        email: TEST_USER.email,
        name: TEST_USER.name,
        password: await bcrypt.hash(TEST_USER.password, 10),
      },
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password })
      .expect(200);
    token = loginRes.body.access_token;
  });

  beforeEach(async () => {
    await prisma.security.deleteMany({});
  });

  afterAll(async () => {
    if (prisma) {
      await cleanDatabase(prisma);
    }
    await app?.close();
  });

  describe('authentication', () => {
    it('should reject requests without token', () => {
      return request(app.getHttpServer()).get('/api/securities').expect(401);
    });

    it('should reject requests with invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/securities')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /api/securities', () => {
    it('should create a security with valid data', () => {
      return api
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
      return api
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
      await api
        .post('/api/securities')
        .send(security)
        .expect(201);

      // Try to create duplicate
      return api
        .post('/api/securities')
        .send(security)
        .expect(409);
    });

    it('should reject invalid ISIN format', () => {
      return api
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
      return api
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
      return api
        .post('/api/securities')
        .send({
          name: 'Apple Inc.',
          // Missing symbol, type, exchange, currency
        })
        .expect(400);
    });

    it('should auto-uppercase symbol', () => {
      return api
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
      return api
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
      return api
        .get('/api/securities')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual([]);
        });
    });

    it('should return all securities ordered by symbol', async () => {
      // Create multiple securities
      await api
        .post('/api/securities')
        .send({
          name: 'Microsoft Corp.',
          symbol: 'MSFT',
          type: 'STOCK',
          exchange: 'NASDAQ',
          currency: 'USD',
        });

      await api
        .post('/api/securities')
        .send({
          name: 'Apple Inc.',
          symbol: 'AAPL',
          type: 'STOCK',
          exchange: 'NASDAQ',
          currency: 'USD',
        });

      return api
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
      const createRes = await api
        .post('/api/securities')
        .send({
          name: 'Apple Inc.',
          symbol: 'AAPL',
          type: 'STOCK',
          exchange: 'NASDAQ',
          currency: 'USD',
        });

      const securityId = createRes.body.id;

      return api
        .get(`/api/securities/${securityId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(securityId);
          expect(res.body.symbol).toBe('AAPL');
        });
    });

    it('should return 404 for non-existent ID', () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      return api
        .get(`/api/securities/${fakeId}`)
        .expect(404);
    });
  });
});
