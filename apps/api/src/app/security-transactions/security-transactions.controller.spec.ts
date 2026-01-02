import { Test, TestingModule } from '@nestjs/testing';
import { SecurityTransactionsController } from './security-transactions.controller';
import { SecurityTransactionsService } from './security-transactions.service';
import { TransactionType } from '@dividends/shared';

describe('SecurityTransactionsController', () => {
  let controller: SecurityTransactionsController;
  let service: SecurityTransactionsService;

  const mockSecurityTransactionsService = {
    createSecurityTransaction: jest.fn(),
    getAllSecurityTransactions: jest.fn(),
    getSecurityTransactionById: jest.fn(),
    getSecurityTransactionsBySecurityId: jest.fn(),
    getSecurityTransactionsByType: jest.fn(),
    getSecurityTransactionsByDateRange: jest.fn(),
    updateSecurityTransaction: jest.fn(),
    deleteSecurityTransaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SecurityTransactionsController],
      providers: [
        {
          provide: SecurityTransactionsService,
          useValue: mockSecurityTransactionsService,
        },
      ],
    }).compile();

    controller = module.get<SecurityTransactionsController>(
      SecurityTransactionsController
    );
    service = module.get<SecurityTransactionsService>(
      SecurityTransactionsService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and return a security transaction', async () => {
      const dto = {
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

      const createdTransaction = {
        id: 'transaction-1',
        date: new Date(dto.date),
        type: dto.type,
        securityId: dto.securityId,
        quantity: dto.quantity,
        pricePerShare: dto.pricePerShare,
        fees: dto.fees,
        currency: dto.currency,
        exchangeRate: dto.exchangeRate,
        totalValue: dto.totalValue,
        note: dto.note,
        createdAt: new Date(),
        updatedAt: new Date(),
        security: {
          id: 'security-1',
          name: 'Test Security',
          symbol: 'TST',
        },
      };

      mockSecurityTransactionsService.createSecurityTransaction.mockResolvedValue(
        createdTransaction
      );

      const result = await controller.create(dto);

      expect(result).toEqual(createdTransaction);
      expect(service.createSecurityTransaction).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all security transactions when no filters are provided', async () => {
      const transactions = [
        {
          id: 'transaction-1',
          date: new Date('2024-01-01'),
          type: 'BUY',
          securityId: 'security-1',
          quantity: 10,
          pricePerShare: 100,
          fees: 5,
          currency: 'USD',
          exchangeRate: 1,
          totalValue: 1005,
          note: 'Initial purchase',
          createdAt: new Date(),
          updatedAt: new Date(),
          security: {
            id: 'security-1',
            name: 'Test Security',
            symbol: 'TST',
          },
        },
      ];

      mockSecurityTransactionsService.getAllSecurityTransactions.mockResolvedValue(
        transactions
      );

      const result = await controller.findAll();

      expect(result).toEqual(transactions);
      expect(service.getAllSecurityTransactions).toHaveBeenCalled();
      expect(
        service.getSecurityTransactionsBySecurityId
      ).not.toHaveBeenCalled();
      expect(service.getSecurityTransactionsByType).not.toHaveBeenCalled();
      expect(
        service.getSecurityTransactionsByDateRange
      ).not.toHaveBeenCalled();
    });

    it('should filter by security ID when provided', async () => {
      const transactions = [
        {
          id: 'transaction-1',
          securityId: 'security-1',
        },
      ];

      mockSecurityTransactionsService.getSecurityTransactionsBySecurityId.mockResolvedValue(
        transactions
      );

      const result = await controller.findAll('security-1');

      expect(result).toEqual(transactions);
      expect(
        service.getSecurityTransactionsBySecurityId
      ).toHaveBeenCalledWith('security-1');
      expect(service.getAllSecurityTransactions).not.toHaveBeenCalled();
      expect(service.getSecurityTransactionsByType).not.toHaveBeenCalled();
      expect(
        service.getSecurityTransactionsByDateRange
      ).not.toHaveBeenCalled();
    });

    it('should filter by type when provided', async () => {
      const transactions = [
        {
          id: 'transaction-1',
          type: 'BUY',
        },
      ];

      mockSecurityTransactionsService.getSecurityTransactionsByType.mockResolvedValue(
        transactions
      );

      const result = await controller.findAll(undefined, 'BUY');

      expect(result).toEqual(transactions);
      expect(service.getSecurityTransactionsByType).toHaveBeenCalledWith('BUY');
      expect(service.getAllSecurityTransactions).not.toHaveBeenCalled();
      expect(
        service.getSecurityTransactionsBySecurityId
      ).not.toHaveBeenCalled();
      expect(
        service.getSecurityTransactionsByDateRange
      ).not.toHaveBeenCalled();
    });

    it('should filter by date range when provided', async () => {
      const transactions = [
        {
          id: 'transaction-1',
          date: new Date('2024-01-15'),
        },
      ];
      const startDate = '2024-01-01T00:00:00.000Z';
      const endDate = '2024-01-31T23:59:59.999Z';

      mockSecurityTransactionsService.getSecurityTransactionsByDateRange.mockResolvedValue(
        transactions
      );

      const result = await controller.findAll(
        undefined,
        undefined,
        startDate,
        endDate
      );

      expect(result).toEqual(transactions);
      expect(service.getSecurityTransactionsByDateRange).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate)
      );
      expect(service.getAllSecurityTransactions).not.toHaveBeenCalled();
      expect(
        service.getSecurityTransactionsBySecurityId
      ).not.toHaveBeenCalled();
      expect(service.getSecurityTransactionsByType).not.toHaveBeenCalled();
    });

    it('should return empty array when no transactions exist', async () => {
      mockSecurityTransactionsService.getAllSecurityTransactions.mockResolvedValue(
        []
      );

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a security transaction by ID', async () => {
      const transaction = {
        id: 'transaction-1',
        date: new Date('2024-01-01'),
        type: 'BUY',
        securityId: 'security-1',
        quantity: 10,
        pricePerShare: 100,
        fees: 5,
        currency: 'USD',
        exchangeRate: 1,
        totalValue: 1005,
        note: 'Initial purchase',
        createdAt: new Date(),
        updatedAt: new Date(),
        security: {
          id: 'security-1',
          name: 'Test Security',
          symbol: 'TST',
        },
      };

      mockSecurityTransactionsService.getSecurityTransactionById.mockResolvedValue(
        transaction
      );

      const result = await controller.findOne('transaction-1');

      expect(result).toEqual(transaction);
      expect(service.getSecurityTransactionById).toHaveBeenCalledWith(
        'transaction-1'
      );
    });
  });

  describe('update', () => {
    it('should update and return a security transaction', async () => {
      const updateDto = {
        quantity: 15,
        pricePerShare: 110,
        note: 'Adjusted purchase',
      };

      const updatedTransaction = {
        id: 'transaction-1',
        date: new Date('2024-01-01'),
        type: 'BUY',
        securityId: 'security-1',
        quantity: 15,
        pricePerShare: 110,
        fees: 5,
        currency: 'USD',
        exchangeRate: 1,
        totalValue: 1655,
        note: 'Adjusted purchase',
        createdAt: new Date(),
        updatedAt: new Date(),
        security: {
          id: 'security-1',
          name: 'Test Security',
          symbol: 'TST',
        },
      };

      mockSecurityTransactionsService.updateSecurityTransaction.mockResolvedValue(
        updatedTransaction
      );

      const result = await controller.update('transaction-1', updateDto);

      expect(result).toEqual(updatedTransaction);
      expect(service.updateSecurityTransaction).toHaveBeenCalledWith(
        'transaction-1',
        updateDto
      );
    });
  });

  describe('remove', () => {
    it('should delete a security transaction', async () => {
      mockSecurityTransactionsService.deleteSecurityTransaction.mockResolvedValue(
        undefined
      );

      await controller.remove('transaction-1');

      expect(service.deleteSecurityTransaction).toHaveBeenCalledWith(
        'transaction-1'
      );
    });
  });
});
