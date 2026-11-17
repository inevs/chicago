import { getE2eDatabaseUrl } from './e2e-database';

// Point the API (PrismaService reads DATABASE_URL) at the dedicated e2e database
process.env.DATABASE_URL = getE2eDatabaseUrl();

// The auth module requires a JWT secret at startup
process.env.JWT_SECRET ??= 'e2e-test-secret';

// Single-user mode as in production: self-registration stays disabled
process.env.ALLOW_REGISTRATION = 'false';
