import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../app/app.module';
import { PrismaService } from '../prisma.service';
import { PrismaClient } from '../generated/prisma/client';

/**
 * Creates a test application instance for integration tests
 * Uses SQLite in-memory database to avoid affecting development data
 */
export async function createTestApp(): Promise<INestApplication> {
  // Override DATABASE_URL to use SQLite for tests
  const originalDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'file:./test.db';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useFactory({
      factory: () => {
        // Create a SQLite-based PrismaClient for testing
        const prisma = new PrismaClient({
          datasources: {
            db: {
              url: 'file:./test.db',
            },
          },
        });
        return prisma;
      },
    })
    .compile();

  const app = moduleFixture.createNestApplication();

  // Apply global validation pipe (same as main.ts)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Set global prefix (same as main.ts)
  app.setGlobalPrefix('api');

  await app.init();

  // Get PrismaService and run migrations for SQLite
  const prisma = app.get(PrismaService);
  await prisma.$connect();

  // Restore original DATABASE_URL
  process.env.DATABASE_URL = originalDatabaseUrl;

  return app;
}

/**
 * Cleans up the database after tests
 * Deletes all data in the correct order to avoid foreign key constraints
 */
export async function cleanupDatabase(prisma: PrismaService): Promise<void> {
  // Use transaction to ensure all deletions succeed or fail together
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

/**
 * Seeds basic currencies needed for tests
 */
export async function seedCurrencies(prisma: PrismaService): Promise<void> {
  const currencies = [
    { code: 'USD', name: 'United States Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
  ];

  for (const currency of currencies) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: {},
      create: currency,
    });
  }
}

/**
 * Creates a user and returns a JWT token for authenticated requests
 */
export async function createAuthenticatedUser(
  app: INestApplication,
  email: string = 'test@example.com',
  password: string = 'TestPassword123!'
): Promise<{ token: string; userId: string }> {
  const request = await import('supertest').then((m) => m.default);

  // Register a new user
  const response = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({
      email,
      password,
      name: 'Test User',
    })
    .expect(201);

  return {
    token: response.body.access_token,
    userId: response.body.user.id,
  };
}
