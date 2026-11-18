import { Test, TestingModule } from '@nestjs/testing';
import {
  SecurityTransactionsRepository,
  CreateSecurityTransactionData,
} from './security-transactions.repository';
import { PrismaService } from '../../prisma.service';

describe('SecurityTransactionsRepository', () => {
  let repository: SecurityTransactionsRepository;

  const mockPrismaService = {
    securityTransaction: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      createManyAndReturn: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const createData: CreateSecurityTransactionData = {
    date: new Date('2024-01-01T00:00:00.000Z'),
    type: 'BUY',
    securityId: 'security-1',
    quantity: 10,
    pricePerShare: 100,
    fees: 5,
    currency: 'USD',
    exchangeRate: 1,
    totalValue: 1005,
    note: 'Initial purchase',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityTransactionsRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<SecurityTransactionsRepository>(
      SecurityTransactionsRepository
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all transactions with security ordered by date descending', async () => {
      const transactions = [{ id: 'transaction-1' }];
      mockPrismaService.securityTransaction.findMany.mockResolvedValue(
        transactions
      );

      const result = await repository.findAll();

      expect(result).toEqual(transactions);
      expect(
        mockPrismaService.securityTransaction.findMany
      ).toHaveBeenCalledWith({
        where: {},
        include: { security: true },
        orderBy: { date: 'desc' },
      });
    });
  });

  describe('findAllForExport', () => {
    it('should return all transactions without relations ordered by date ascending', async () => {
      const transactions = [{ id: 'transaction-1' }];
      mockPrismaService.securityTransaction.findMany.mockResolvedValue(
        transactions
      );

      const result = await repository.findAllForExport();

      expect(result).toEqual(transactions);
      expect(
        mockPrismaService.securityTransaction.findMany
      ).toHaveBeenCalledWith({
        orderBy: { date: 'asc' },
      });
    });
  });

  describe('findById', () => {
    it('should look up the transaction by id without relations', async () => {
      const transaction = { id: 'transaction-1' };
      mockPrismaService.securityTransaction.findUnique.mockResolvedValue(
        transaction
      );

      const result = await repository.findById('transaction-1');

      expect(result).toEqual(transaction);
      expect(
        mockPrismaService.securityTransaction.findUnique
      ).toHaveBeenCalledWith({
        where: { id: 'transaction-1' },
      });
    });

    it('should return null when the transaction does not exist', async () => {
      mockPrismaService.securityTransaction.findUnique.mockResolvedValue(null);

      await expect(repository.findById('missing')).resolves.toBeNull();
    });
  });

  describe('findByIdWithSecurity', () => {
    it('should look up the transaction by id including its security', async () => {
      const transaction = {
        id: 'transaction-1',
        security: { id: 'security-1' },
      };
      mockPrismaService.securityTransaction.findUnique.mockResolvedValue(
        transaction
      );

      const result = await repository.findByIdWithSecurity('transaction-1');

      expect(result).toEqual(transaction);
      expect(
        mockPrismaService.securityTransaction.findUnique
      ).toHaveBeenCalledWith({
        where: { id: 'transaction-1' },
        include: { security: true },
      });
    });

    it('should return null when the transaction does not exist', async () => {
      mockPrismaService.securityTransaction.findUnique.mockResolvedValue(null);

      await expect(
        repository.findByIdWithSecurity('missing')
      ).resolves.toBeNull();
    });
  });

  describe('findBySecurityId', () => {
    it('should filter by security id ordered by date descending', async () => {
      const transactions = [{ id: 'transaction-1', securityId: 'security-1' }];
      mockPrismaService.securityTransaction.findMany.mockResolvedValue(
        transactions
      );

      const result = await repository.findBySecurityId('security-1');

      expect(result).toEqual(transactions);
      expect(
        mockPrismaService.securityTransaction.findMany
      ).toHaveBeenCalledWith({
        where: { securityId: 'security-1' },
        include: { security: true },
        orderBy: { date: 'desc' },
      });
    });
  });

  describe('findByType', () => {
    it.each(['BUY', 'SELL'] as const)(
      'should filter by type %s ordered by date descending',
      async (type) => {
        const transactions = [{ id: 'transaction-1', type }];
        mockPrismaService.securityTransaction.findMany.mockResolvedValue(
          transactions
        );

        const result = await repository.findByType(type);

        expect(result).toEqual(transactions);
        expect(
          mockPrismaService.securityTransaction.findMany
        ).toHaveBeenCalledWith({
          where: { type },
          include: { security: true },
          orderBy: { date: 'desc' },
        });
      }
    );
  });

  describe('findByDateRange', () => {
    it('should filter by inclusive date range ordered by date descending', async () => {
      const transactions = [{ id: 'transaction-1' }];
      const startDate = new Date('2024-01-01T00:00:00.000Z');
      const endDate = new Date('2024-01-31T00:00:00.000Z');
      mockPrismaService.securityTransaction.findMany.mockResolvedValue(
        transactions
      );

      const result = await repository.findByDateRange(startDate, endDate);

      expect(result).toEqual(transactions);
      expect(
        mockPrismaService.securityTransaction.findMany
      ).toHaveBeenCalledWith({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: { security: true },
        orderBy: { date: 'desc' },
      });
    });
  });

  describe('create', () => {
    it('should create the transaction and include its security', async () => {
      const created = { id: 'transaction-1', ...createData };
      mockPrismaService.securityTransaction.create.mockResolvedValue(created);

      const result = await repository.create(createData);

      expect(result).toEqual(created);
      expect(mockPrismaService.securityTransaction.create).toHaveBeenCalledWith(
        {
          data: createData,
          include: { security: true },
        }
      );
    });
  });

  describe('createMany', () => {
    it('should insert all transactions and return the created rows', async () => {
      const data = [
        createData,
        { ...createData, type: 'SELL' as const, securityId: 'security-2' },
      ];
      const created = [
        { id: 'transaction-1', ...data[0] },
        { id: 'transaction-2', ...data[1] },
      ];
      mockPrismaService.securityTransaction.createManyAndReturn.mockResolvedValue(
        created
      );

      const result = await repository.createMany(data);

      expect(result).toEqual(created);
      expect(
        mockPrismaService.securityTransaction.createManyAndReturn
      ).toHaveBeenCalledWith({
        data,
      });
    });
  });

  describe('update', () => {
    it('should update the transaction by id with scalar foreign keys and include its security', async () => {
      const data = { securityId: 'security-2', currency: 'EUR', quantity: 15 };
      const updated = { id: 'transaction-1', ...createData, ...data };
      mockPrismaService.securityTransaction.update.mockResolvedValue(updated);

      const result = await repository.update('transaction-1', data);

      expect(result).toEqual(updated);
      expect(mockPrismaService.securityTransaction.update).toHaveBeenCalledWith(
        {
          where: { id: 'transaction-1' },
          data,
          include: { security: true },
        }
      );
    });
  });

  describe('delete', () => {
    it('should delete the transaction by id and resolve to void', async () => {
      mockPrismaService.securityTransaction.delete.mockResolvedValue({
        id: 'transaction-1',
      });

      await expect(
        repository.delete('transaction-1')
      ).resolves.toBeUndefined();

      expect(mockPrismaService.securityTransaction.delete).toHaveBeenCalledWith(
        {
          where: { id: 'transaction-1' },
        }
      );
    });
  });
});
