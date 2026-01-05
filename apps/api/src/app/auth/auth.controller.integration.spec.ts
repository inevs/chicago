import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  cleanupDatabase,
} from '../../testing/integration-test.helper';
import { PrismaService } from '../../prisma.service';

describe('AuthController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'StrongPassword123!',
          name: 'New User',
        })
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(response.body.user.name).toBe('New User');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 401 when registering with existing email', async () => {
      // First registration
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123!',
          name: 'First User',
        })
        .expect(201);

      // Attempt duplicate registration
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123!',
          name: 'Second User',
        })
        .expect(401);

      expect(response.body.message).toContain('already exists');
    });

    it('should return 400 for invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(400);
    });

    it('should return 400 for weak password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          name: 'Test User',
        })
        .expect(400);
    });

    it('should return 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
        })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a user for login tests
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'loginuser@example.com',
          password: 'LoginPassword123!',
          name: 'Login User',
        });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'LoginPassword123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('loginuser@example.com');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 401 for invalid email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        })
        .expect(401);
    });

    it('should return 401 for invalid password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should return 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
        })
        .expect(400);
    });
  });

  describe('GET /api/auth/profile', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
      // Create and login a user
      const registerResponse = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'profileuser@example.com',
          password: 'ProfilePassword123!',
          name: 'Profile User',
        });

      authToken = registerResponse.body.access_token;
      userId = registerResponse.body.user.id;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', userId);
      expect(response.body.email).toBe('profileuser@example.com');
      expect(response.body.name).toBe('Profile User');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 401 without authentication token', async () => {
      await request(app.getHttpServer()).get('/api/auth/profile').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 401 with malformed authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });
  });
});
