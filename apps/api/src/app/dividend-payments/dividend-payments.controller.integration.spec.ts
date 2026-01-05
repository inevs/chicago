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

describe('DividendPaymentsController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let securityId: string;

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

    // Create a security for dividend payment tests
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

  describe('POST /api/dividend-payments', () => {
    it('should create a new dividend payment successfully', async () => {
      const dividendDto = {
        exDate: '2024-01-01T00:00:00.000Z',
        payoutDate: '2024-01-15T00:00:00.000Z',
        securityId,
        shares: 10,
        dividendYield: 1.5,
        taxAmount: 0.2,
        originCurrency: 'USD',
        destCurrency: 'EUR',
        conversionRate: 0.9,
        finalPayment: 13.5,
        note: 'Quarterly dividend',
      };

      const response = await request(app.getHttpServer())
        .post('/api/dividend-payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dividendDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.shares).toBe(10);
      expect(response.body.dividendYield).toBe(1.5);
      expect(response.body.finalPayment).toBe(13.5);
      expect(response.body.note).toBe('Quarterly dividend');
      expect(response.body.security).toBeDefined();
      expect(response.body.security.symbol).toBe('AAPL');
    });

    it('should create dividend payment without optional note', async () => {
      const dividendDto = {
        exDate: '2024-01-01T00:00:00.000Z',
        payoutDate: '2024-01-15T00:00:00.000Z',
        securityId,
        shares: 10,
        dividendYield: 1.5,
        taxAmount: 0.2,
        originCurrency: 'USD',
        destCurrency: 'EUR',
        conversionRate: 0.9,
        finalPayment: 13.5,
      };

      const response = await request(app.getHttpServer())
        .post('/api/dividend-payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dividendDto)
        .expect(201);

      expect(response.body.note).toBeNull();
    });

    it('should return 404 when security does not exist', async () => {
      const dividendDto = {
        exDate: '2024-01-01T00:00:00.000Z',
        payoutDate: '2024-01-15T00:00:00.000Z',
        securityId: '00000000-0000-0000-0000-000000000000',
        shares: 10,
        dividendYield: 1.5,
        taxAmount: 0.2,
        originCurrency: 'USD',
        destCurrency: 'EUR',
        conversionRate: 0.9,
        finalPayment: 13.5,
      };

      await request(app.getHttpServer())
        .post('/api/dividend-payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dividendDto)
        .expect(404);
    });

    it('should return 404 when currency does not exist', async () => {
      const dividendDto = {
        exDate: '2024-01-01T00:00:00.000Z',
        payoutDate: '2024-01-15T00:00:00.000Z',
        securityId,
        shares: 10,
        dividendYield: 1.5,
        taxAmount: 0.2,
        originCurrency: 'XYZ',
        destCurrency: 'EUR',
        conversionRate: 0.9,
        finalPayment: 13.5,
      };

      await request(app.getHttpServer())
        .post('/api/dividend-payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dividendDto)
        .expect(404);
    });

    it('should return 400 for missing required fields', async () => {
      const dividendDto = {
        exDate: '2024-01-01T00:00:00.000Z',
        securityId,
      };

      await request(app.getHttpServer())
        .post('/api/dividend-payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dividendDto)
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      const dividendDto = {
        exDate: '2024-01-01T00:00:00.000Z',
        payoutDate: '2024-01-15T00:00:00.000Z',
        securityId,
        shares: 10,
        dividendYield: 1.5,
        taxAmount: 0.2,
        originCurrency: 'USD',
        destCurrency: 'EUR',
        conversionRate: 0.9,
        finalPayment: 13.5,
      };

      await request(app.getHttpServer())
        .post('/api/dividend-payments')
        .send(dividendDto)
        .expect(401);
    });
  });

  describe('GET /api/dividend-payments', () => {
    beforeEach(async () => {
      // Create test dividend payments
      await prisma.dividendPayment.createMany({
        data: [
          {
            exDate: new Date('2024-01-01'),
            payoutDate: new Date('2024-01-15'),
            securityId,
            shares: 10,
            dividendYield: 1.5,
            taxAmount: 0.2,
            originCurrency: 'USD',
            destCurrency: 'EUR',
            conversionRate: 0.9,
            finalPayment: 13.5,
          },
          {
            exDate: new Date('2024-02-01'),
            payoutDate: new Date('2024-02-15'),
            securityId,
            shares: 15,
            dividendYield: 1.8,
            taxAmount: 0.3,
            originCurrency: 'USD',
            destCurrency: 'EUR',
            conversionRate: 0.92,
            finalPayment: 20.0,
          },
        ],
      });
    });

    it('should return all dividend payments ordered by payout date descending', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/dividend-payments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].finalPayment).toBe(20.0); // February payment first
      expect(response.body[1].finalPayment).toBe(13.5); // January payment second
      expect(response.body[0].security).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/dividend-payments')
        .expect(401);
    });
  });

  describe('GET /api/dividend-payments/:id', () => {
    let paymentId: string;

    beforeEach(async () => {
      const payment = await prisma.dividendPayment.create({
        data: {
          exDate: new Date('2024-01-01'),
          payoutDate: new Date('2024-01-15'),
          securityId,
          shares: 10,
          dividendYield: 1.5,
          taxAmount: 0.2,
          originCurrency: 'USD',
          destCurrency: 'EUR',
          conversionRate: 0.9,
          finalPayment: 13.5,
        },
      });
      paymentId = payment.id;
    });

    it('should return a dividend payment by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/dividend-payments/${paymentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(paymentId);
      expect(response.body.shares).toBe(10);
      expect(response.body.finalPayment).toBe(13.5);
      expect(response.body.security).toBeDefined();
    });

    it('should return 404 for non-existent payment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/dividend-payments/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/dividend-payments/${paymentId}`)
        .expect(401);
    });
  });

  describe('PATCH /api/dividend-payments/:id', () => {
    let paymentId: string;

    beforeEach(async () => {
      const payment = await prisma.dividendPayment.create({
        data: {
          exDate: new Date('2024-01-01'),
          payoutDate: new Date('2024-01-15'),
          securityId,
          shares: 10,
          dividendYield: 1.5,
          taxAmount: 0.2,
          originCurrency: 'USD',
          destCurrency: 'EUR',
          conversionRate: 0.9,
          finalPayment: 13.5,
        },
      });
      paymentId = payment.id;
    });

    it('should update a dividend payment successfully', async () => {
      const updateDto = {
        shares: 20,
        finalPayment: 27.0,
        note: 'Updated payment',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/dividend-payments/${paymentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.shares).toBe(20);
      expect(response.body.finalPayment).toBe(27.0);
      expect(response.body.note).toBe('Updated payment');
    });

    it('should return 404 when payment does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateDto = { shares: 20 };

      await request(app.getHttpServer())
        .patch(`/api/dividend-payments/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      const updateDto = { shares: 20 };

      await request(app.getHttpServer())
        .patch(`/api/dividend-payments/${paymentId}`)
        .send(updateDto)
        .expect(401);
    });
  });

  describe('DELETE /api/dividend-payments/:id', () => {
    let paymentId: string;

    beforeEach(async () => {
      const payment = await prisma.dividendPayment.create({
        data: {
          exDate: new Date('2024-01-01'),
          payoutDate: new Date('2024-01-15'),
          securityId,
          shares: 10,
          dividendYield: 1.5,
          taxAmount: 0.2,
          originCurrency: 'USD',
          destCurrency: 'EUR',
          conversionRate: 0.9,
          finalPayment: 13.5,
        },
      });
      paymentId = payment.id;
    });

    it('should delete a dividend payment successfully', async () => {
      await request(app.getHttpServer())
        .delete(`/api/dividend-payments/${paymentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify deletion
      const payment = await prisma.dividendPayment.findUnique({
        where: { id: paymentId },
      });
      expect(payment).toBeNull();
    });

    it('should return 404 when payment does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .delete(`/api/dividend-payments/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/api/dividend-payments/${paymentId}`)
        .expect(401);
    });
  });

  describe('GET /api/dividend-payments/security/:securityId', () => {
    let anotherSecurityId: string;

    beforeEach(async () => {
      // Create another security
      const anotherSecurity = await prisma.security.create({
        data: {
          name: 'Microsoft Corp.',
          symbol: 'MSFT',
          type: SecurityType.STOCK,
          exchange: 'NASDAQ',
          currency: 'USD',
        },
      });
      anotherSecurityId = anotherSecurity.id;

      // Create payments for both securities
      await prisma.dividendPayment.createMany({
        data: [
          {
            exDate: new Date('2024-01-01'),
            payoutDate: new Date('2024-01-15'),
            securityId,
            shares: 10,
            dividendYield: 1.5,
            taxAmount: 0.2,
            originCurrency: 'USD',
            destCurrency: 'EUR',
            conversionRate: 0.9,
            finalPayment: 13.5,
          },
          {
            exDate: new Date('2024-02-01'),
            payoutDate: new Date('2024-02-15'),
            securityId: anotherSecurityId,
            shares: 15,
            dividendYield: 1.8,
            taxAmount: 0.3,
            originCurrency: 'USD',
            destCurrency: 'EUR',
            conversionRate: 0.92,
            finalPayment: 20.0,
          },
        ],
      });
    });

    it('should return dividend payments filtered by security id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/dividend-payments/security/${securityId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].securityId).toBe(securityId);
      expect(response.body[0].finalPayment).toBe(13.5);
    });

    it('should return empty array when security has no payments', async () => {
      const newSecurity = await prisma.security.create({
        data: {
          name: 'Amazon.com Inc.',
          symbol: 'AMZN',
          type: SecurityType.STOCK,
          exchange: 'NASDAQ',
          currency: 'USD',
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/dividend-payments/security/${newSecurity.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/dividend-payments/security/${securityId}`)
        .expect(401);
    });
  });
});
