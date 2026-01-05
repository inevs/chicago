import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  cleanupDatabase,
  seedCurrencies,
  createAuthenticatedUser,
} from '../../testing/integration-test.helper';
import { PrismaService } from '../../prisma.service';
import { SecurityType } from '@dividends/shared';

describe('SecuritiesController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupDatabase(prisma);
    await seedCurrencies(prisma);
    const auth = await createAuthenticatedUser(app);
    authToken = auth.token;
  });

  describe('POST /api/securities', () => {
    it('should create a new security successfully', async () => {
      const securityDto = {
        name: 'Apple Inc.',
        symbol: 'AAPL',
        isin: 'US0378331005',
        wkn: '865985',
        type: SecurityType.STOCK,
        exchange: 'NASDAQ',
        currency: 'USD',
      };

      const response = await request(app.getHttpServer())
        .post('/api/securities')
        .set('Authorization', `Bearer ${authToken}`)
        .send(securityDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Apple Inc.');
      expect(response.body.symbol).toBe('AAPL');
      expect(response.body.isin).toBe('US0378331005');
      expect(response.body.type).toBe(SecurityType.STOCK);
    });

    it('should create security without optional fields', async () => {
      const securityDto = {
        name: 'Microsoft Corp.',
        symbol: 'MSFT',
        type: SecurityType.STOCK,
        exchange: 'NASDAQ',
        currency: 'USD',
      };

      const response = await request(app.getHttpServer())
        .post('/api/securities')
        .set('Authorization', `Bearer ${authToken}`)
        .send(securityDto)
        .expect(201);

      expect(response.body.name).toBe('Microsoft Corp.');
      expect(response.body.symbol).toBe('MSFT');
      expect(response.body.isin).toBeNull();
      expect(response.body.wkn).toBeNull();
    });

    it('should return 409 when symbol already exists', async () => {
      const securityDto = {
        name: 'Apple Inc.',
        symbol: 'AAPL',
        type: SecurityType.STOCK,
        exchange: 'NASDAQ',
        currency: 'USD',
      };

      // Create first security
      await request(app.getHttpServer())
        .post('/api/securities')
        .set('Authorization', `Bearer ${authToken}`)
        .send(securityDto)
        .expect(201);

      // Try to create duplicate
      await request(app.getHttpServer())
        .post('/api/securities')
        .set('Authorization', `Bearer ${authToken}`)
        .send(securityDto)
        .expect(409);
    });

    it('should return 404 when currency does not exist', async () => {
      const securityDto = {
        name: 'Test Security',
        symbol: 'TEST',
        type: SecurityType.STOCK,
        exchange: 'NYSE',
        currency: 'XYZ',
      };

      await request(app.getHttpServer())
        .post('/api/securities')
        .set('Authorization', `Bearer ${authToken}`)
        .send(securityDto)
        .expect(404);
    });

    it('should return 400 for invalid security type', async () => {
      const securityDto = {
        name: 'Test Security',
        symbol: 'TEST',
        type: 'INVALID_TYPE',
        exchange: 'NYSE',
        currency: 'USD',
      };

      await request(app.getHttpServer())
        .post('/api/securities')
        .set('Authorization', `Bearer ${authToken}`)
        .send(securityDto)
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      const securityDto = {
        name: 'Test Security',
        symbol: 'TEST',
        type: SecurityType.STOCK,
        exchange: 'NYSE',
        currency: 'USD',
      };

      await request(app.getHttpServer())
        .post('/api/securities')
        .send(securityDto)
        .expect(401);
    });
  });

  describe('GET /api/securities', () => {
    beforeEach(async () => {
      // Create test securities
      await prisma.security.createMany({
        data: [
          {
            name: 'Apple Inc.',
            symbol: 'AAPL',
            type: SecurityType.STOCK,
            exchange: 'NASDAQ',
            currency: 'USD',
          },
          {
            name: 'Microsoft Corp.',
            symbol: 'MSFT',
            type: SecurityType.STOCK,
            exchange: 'NASDAQ',
            currency: 'USD',
          },
          {
            name: 'Amazon.com Inc.',
            symbol: 'AMZN',
            type: SecurityType.STOCK,
            exchange: 'NASDAQ',
            currency: 'USD',
          },
        ],
      });
    });

    it('should return all securities ordered by symbol', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/securities')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body[0].symbol).toBe('AAPL');
      expect(response.body[1].symbol).toBe('AMZN');
      expect(response.body[2].symbol).toBe('MSFT');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/api/securities').expect(401);
    });
  });

  describe('GET /api/securities/:id', () => {
    let securityId: string;

    beforeEach(async () => {
      const security = await prisma.security.create({
        data: {
          name: 'Apple Inc.',
          symbol: 'AAPL',
          type: SecurityType.STOCK,
          exchange: 'NASDAQ',
          currency: 'USD',
        },
      });
      securityId = security.id;
    });

    it('should return a security by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/securities/${securityId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(securityId);
      expect(response.body.symbol).toBe('AAPL');
      expect(response.body.name).toBe('Apple Inc.');
    });

    it('should return 404 for non-existent security', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/securities/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/securities/${securityId}`)
        .expect(401);
    });
  });

  describe('PATCH /api/securities/:id', () => {
    let securityId: string;

    beforeEach(async () => {
      const security = await prisma.security.create({
        data: {
          name: 'Apple Inc.',
          symbol: 'AAPL',
          type: SecurityType.STOCK,
          exchange: 'NASDAQ',
          currency: 'USD',
        },
      });
      securityId = security.id;
    });

    it('should update a security successfully', async () => {
      const updateDto = {
        name: 'Apple Inc. Updated',
        exchange: 'XETRA',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/securities/${securityId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe('Apple Inc. Updated');
      expect(response.body.exchange).toBe('XETRA');
      expect(response.body.symbol).toBe('AAPL'); // Unchanged
    });

    it('should update symbol when not duplicate', async () => {
      const updateDto = {
        symbol: 'AAPL2',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/securities/${securityId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.symbol).toBe('AAPL2');
    });

    it('should return 409 when updating to existing symbol', async () => {
      // Create another security
      await prisma.security.create({
        data: {
          name: 'Microsoft Corp.',
          symbol: 'MSFT',
          type: SecurityType.STOCK,
          exchange: 'NASDAQ',
          currency: 'USD',
        },
      });

      const updateDto = {
        symbol: 'MSFT',
      };

      await request(app.getHttpServer())
        .patch(`/api/securities/${securityId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto)
        .expect(409);
    });

    it('should return 404 when security does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateDto = { name: 'Updated Name' };

      await request(app.getHttpServer())
        .patch(`/api/securities/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      const updateDto = { name: 'Updated Name' };

      await request(app.getHttpServer())
        .patch(`/api/securities/${securityId}`)
        .send(updateDto)
        .expect(401);
    });
  });

  describe('GET /api/securities/search', () => {
    beforeEach(async () => {
      await prisma.security.createMany({
        data: [
          {
            name: 'Apple Inc.',
            symbol: 'AAPL',
            isin: 'US0378331005',
            type: SecurityType.STOCK,
            exchange: 'NASDAQ',
            currency: 'USD',
          },
          {
            name: 'Microsoft Corp.',
            symbol: 'MSFT',
            type: SecurityType.STOCK,
            exchange: 'NASDAQ',
            currency: 'USD',
          },
          {
            name: 'Amazon.com Inc.',
            symbol: 'AMZN',
            type: SecurityType.STOCK,
            exchange: 'NASDAQ',
            currency: 'USD',
          },
        ],
      });
    });

    it('should search securities by symbol', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/securities/search?query=aapl')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].symbol).toBe('AAPL');
    });

    it('should search securities by name case-insensitively', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/securities/search?query=apple')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Apple Inc.');
    });

    it('should search securities by ISIN', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/securities/search?query=US0378331005')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].symbol).toBe('AAPL');
    });

    it('should return all securities when query is empty', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/securities/search?query=')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(3);
    });

    it('should return empty array when no matches found', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/securities/search?query=nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/securities/search?query=aapl')
        .expect(401);
    });
  });
});
