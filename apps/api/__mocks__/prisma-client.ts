// Mock Prisma Client for Jest tests
export class PrismaClient {
  $connect = jest.fn();
  $disconnect = jest.fn();
  security = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    upsert: jest.fn(),
  };
  dividendPayment = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    upsert: jest.fn(),
  };
  currency = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    upsert: jest.fn(),
  };
  securityTransaction = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    upsert: jest.fn(),
  };
  securityPrice = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    upsert: jest.fn(),
  };
  exchangeRate = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    upsert: jest.fn(),
  };
  user = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    upsert: jest.fn(),
  };
}

export enum SecurityType {
  STOCK = 'STOCK',
  ETF = 'ETF',
  BOND = 'BOND',
}

export { PrismaClient as default };
