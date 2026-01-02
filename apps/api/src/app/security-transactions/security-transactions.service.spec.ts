import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SecurityTransactionsService } from './security-transactions.service';
import { PrismaService } from '../../prisma.service';
import { TransactionType } from '@dividends/shared';

describe('SecurityTransactionsService', () => {
  let service: SecurityTransactionsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    security: {
      findUnique: jest.fn(),
    },
    currency: {
      findUnique: jest.fn(),
    },
    securityTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const baseCreateDto = {
    date: '2024-01-01T00:00:00.000Z',
    type: TransactionType.BUY,
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
        SecurityTransactionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SecurityTransactionsService>(
      SecurityTransactionsService
    );
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSecurityTransaction', () => {
    it('should create a security transaction when security and currency exist', async () => {
      const security = {
        id: baseCreateDto.securityId,
        symbol: 'ACME',
      };
      const createdTransaction = {
        id: 'transaction-1',
        date: new Date(baseCreateDto.date),
        type: baseCreateDto.type,
        securityId: baseCreateDto.securityId,
        quantity: baseCreateDto.quantity,
        pricePerShare: baseCreateDto.pricePerShare,
        fees: baseCreateDto.fees,
        currency: baseCreateDto.currency,
        exchangeRate: baseCreateDto.exchangeRate,
        totalValue: baseCreateDto.totalValue,
        note: baseCreateDto.note,
        createdAt: new Date(),
        updatedAt: new Date(),
        security,
      };

      mockPrismaService.security.findUnique.mockResolvedValue(security);
      mockPrismaService.currency.findUnique.mockResolvedValue({
        code: baseCreateDto.currency,
      });
      mockPrismaService.securityTransaction.create.mockResolvedValue(
        createdTransaction
      );

      const result = await service.createSecurityTransaction(baseCreateDto);

      expect(result).toEqual(createdTransaction);
      expect(prisma.security.findUnique).toHaveBeenCalledWith({
        where: { id: baseCreateDto.securityId },
      });
      expect(prisma.currency.findUnique).toHaveBeenCalledWith({
        where: { code: baseCreateDto.currency },
      });
      expect(prisma.securityTransaction.create).toHaveBeenCalledWith({
        data: {
          date: new Date(baseCreateDto.date),
          type: baseCreateDto.type,
          securityId: baseCreateDto.securityId,
          quantity: baseCreateDto.quantity,
          pricePerShare: baseCreateDto.pricePerShare,
          fees: baseCreateDto.fees,
          currency: baseCreateDto.currency,
          exchangeRate: baseCreateDto.exchangeRate,
          totalValue: baseCreateDto.totalValue,
          note: baseCreateDto.note,
        },
        include: {
          security: true,
        },
      });
    });

    it('should throw when security does not exist', async () => {
      mockPrismaService.security.findUnique.mockResolvedValue(null);

      await expect(
        service.createSecurityTransaction(baseCreateDto)
      ).rejects.toThrow(NotFoundException);

      expect(prisma.currency.findUnique).not.toHaveBeenCalled();
      expect(prisma.securityTransaction.create).not.toHaveBeenCalled();
    });

    it('should throw when currency does not exist', async () => {
      mockPrismaService.security.findUnique.mockResolvedValue({
        id: baseCreateDto.securityId,
      });
      mockPrismaService.currency.findUnique.mockResolvedValue(null);

      await expect(
        service.createSecurityTransaction(baseCreateDto)
      ).rejects.toThrow(NotFoundException);

      expect(prisma.securityTransaction.create).not.toHaveBeenCalled();
    });
  });

  describe('getAllSecurityTransactions', () => {
    it('should return all security transactions ordered by date', async () => {
      const transactions = [
        {
          id: 'transaction-1',
          date: new Date('2024-01-01'),
        },
      ];

      mockPrismaService.securityTransaction.findMany.mockResolvedValue(
        transactions
      );

      const result = await service.getAllSecurityTransactions();

      expect(result).toEqual(transactions);
      expect(prisma.securityTransaction.findMany).toHaveBeenCalledWith({
        include: {
          security: true,
        },
        orderBy: { date: 'desc' },
      });
    });
  });

  describe('getSecurityTransactionById', () => {
    it('should return a security transaction when found', async () => {
      const transaction = {
        id: 'transaction-1',
        date: new Date('2024-01-01'),
      };

      mockPrismaService.securityTransaction.findUnique.mockResolvedValue(
        transaction
      );

      const result = await service.getSecurityTransactionById('transaction-1');

      expect(result).toEqual(transaction);
      expect(prisma.securityTransaction.findUnique).toHaveBeenCalledWith({
        where: { id: 'transaction-1' },
        include: {
          security: true,
        },
      });
    });

    it('should throw when security transaction is not found', async () => {
      mockPrismaService.securityTransaction.findUnique.mockResolvedValue(null);

      await expect(
        service.getSecurityTransactionById('missing-transaction')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSecurityTransactionsBySecurityId', () => {
    it('should return transactions filtered by security id', async () => {
      const transactions = [
        {
          id: 'transaction-1',
          securityId: 'security-1',
        },
      ];

      mockPrismaService.securityTransaction.findMany.mockResolvedValue(
        transactions
      );

      const result = await service.getSecurityTransactionsBySecurityId(
        'security-1'
      );

      expect(result).toEqual(transactions);
      expect(prisma.securityTransaction.findMany).toHaveBeenCalledWith({
        where: { securityId: 'security-1' },
        include: {
          security: true,
        },
        orderBy: { date: 'desc' },
      });
    });
  });

  describe('getSecurityTransactionsByType', () => {
    it('should return transactions filtered by type BUY', async () => {
      const transactions = [
        {
          id: 'transaction-1',
          type: 'BUY',
        },
      ];

      mockPrismaService.securityTransaction.findMany.mockResolvedValue(
        transactions
      );

      const result = await service.getSecurityTransactionsByType('BUY');

      expect(result).toEqual(transactions);
      expect(prisma.securityTransaction.findMany).toHaveBeenCalledWith({
        where: { type: 'BUY' },
        include: {
          security: true,
        },
        orderBy: { date: 'desc' },
      });
    });

    it('should return transactions filtered by type SELL', async () => {
      const transactions = [
        {
          id: 'transaction-2',
          type: 'SELL',
        },
      ];

      mockPrismaService.securityTransaction.findMany.mockResolvedValue(
        transactions
      );

      const result = await service.getSecurityTransactionsByType('SELL');

      expect(result).toEqual(transactions);
      expect(prisma.securityTransaction.findMany).toHaveBeenCalledWith({
        where: { type: 'SELL' },
        include: {
          security: true,
        },
        orderBy: { date: 'desc' },
      });
    });
  });

  describe('getSecurityTransactionsByDateRange', () => {
    it('should return transactions within a date range', async () => {
      const transactions = [
        {
          id: 'transaction-1',
          date: new Date('2024-01-15'),
        },
      ];
      const startDate = new Date('2024-01-01T00:00:00.000Z');
      const endDate = new Date('2024-01-31T00:00:00.000Z');

      mockPrismaService.securityTransaction.findMany.mockResolvedValue(
        transactions
      );

      const result = await service.getSecurityTransactionsByDateRange(
        startDate,
        endDate
      );

      expect(result).toEqual(transactions);
      expect(prisma.securityTransaction.findMany).toHaveBeenCalledWith({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          security: true,
        },
        orderBy: { date: 'desc' },
      });
    });
  });

  describe('updateSecurityTransaction', () => {
    it('should update security transaction when valid changes are provided', async () => {
      const existingTransaction = {
        id: 'transaction-1',
        securityId: 'security-1',
        currency: 'USD',
      };
      const updateDto = {
        quantity: 15,
        pricePerShare: 110,
        note: 'Adjusted purchase',
      };
      const updatedTransaction = {
        id: 'transaction-1',
        ...existingTransaction,
        ...updateDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.securityTransaction.findUnique.mockResolvedValue(
        existingTransaction
      );
      mockPrismaService.securityTransaction.update.mockResolvedValue(
        updatedTransaction
      );

      const result = await service.updateSecurityTransaction(
        'transaction-1',
        updateDto
      );

      expect(result).toEqual(updatedTransaction);
      expect(prisma.securityTransaction.update).toHaveBeenCalledWith({
        where: { id: 'transaction-1' },
        data: {
          quantity: updateDto.quantity,
          pricePerShare: updateDto.pricePerShare,
          note: updateDto.note,
        },
        include: {
          security: true,
        },
      });
    });

    it('should throw when security transaction does not exist', async () => {
      mockPrismaService.securityTransaction.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSecurityTransaction('missing-transaction', {
          quantity: 5,
        })
      ).rejects.toThrow(NotFoundException);

      expect(prisma.securityTransaction.update).not.toHaveBeenCalled();
    });

    it('should throw when updated security does not exist', async () => {
      const existingTransaction = {
        id: 'transaction-1',
        securityId: 'security-1',
        currency: 'USD',
      };

      mockPrismaService.securityTransaction.findUnique.mockResolvedValue(
        existingTransaction
      );
      mockPrismaService.security.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSecurityTransaction('transaction-1', {
          securityId: 'missing-security',
        })
      ).rejects.toThrow(NotFoundException);

      expect(prisma.securityTransaction.update).not.toHaveBeenCalled();
    });

    it('should throw when updated currency does not exist', async () => {
      const existingTransaction = {
        id: 'transaction-1',
        securityId: 'security-1',
        currency: 'USD',
      };

      mockPrismaService.securityTransaction.findUnique.mockResolvedValue(
        existingTransaction
      );
      mockPrismaService.currency.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSecurityTransaction('transaction-1', {
          currency: 'INVALID',
        })
      ).rejects.toThrow(NotFoundException);

      expect(prisma.securityTransaction.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteSecurityTransaction', () => {
    it('should delete security transaction when it exists', async () => {
      mockPrismaService.securityTransaction.findUnique.mockResolvedValue({
        id: 'transaction-1',
      });

      await service.deleteSecurityTransaction('transaction-1');

      expect(prisma.securityTransaction.delete).toHaveBeenCalledWith({
        where: { id: 'transaction-1' },
      });
    });

    it('should throw when security transaction does not exist', async () => {
      mockPrismaService.securityTransaction.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteSecurityTransaction('missing-transaction')
      ).rejects.toThrow(NotFoundException);

      expect(prisma.securityTransaction.delete).not.toHaveBeenCalled();
    });
  });
});
