import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SecurityTransactionsService } from './security-transactions.service';
import { SecurityTransactionsRepository } from './security-transactions.repository';
import { SecuritiesRepository } from '../securities/securities.repository';
import { CurrenciesRepository } from '../currencies/currencies.repository';
import { TransactionType } from '@dividends/shared';

describe('SecurityTransactionsService', () => {
  let service: SecurityTransactionsService;

  const mockSecurityTransactionsRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByIdWithSecurity: jest.fn(),
    findBySecurityId: jest.fn(),
    findByType: jest.fn(),
    findByDateRange: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockSecuritiesRepository = {
    existsById: jest.fn(),
    findIdsByIsins: jest.fn(),
  };

  const mockCurrenciesRepository = {
    existsByCode: jest.fn(),
    findExistingCodes: jest.fn(),
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
          provide: SecurityTransactionsRepository,
          useValue: mockSecurityTransactionsRepository,
        },
        {
          provide: SecuritiesRepository,
          useValue: mockSecuritiesRepository,
        },
        {
          provide: CurrenciesRepository,
          useValue: mockCurrenciesRepository,
        },
      ],
    }).compile();

    service = module.get<SecurityTransactionsService>(
      SecurityTransactionsService
    );
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

      mockSecuritiesRepository.existsById.mockResolvedValue(true);
      mockCurrenciesRepository.existsByCode.mockResolvedValue(true);
      mockSecurityTransactionsRepository.create.mockResolvedValue(
        createdTransaction
      );

      const result = await service.createSecurityTransaction(baseCreateDto);

      expect(result).toEqual(createdTransaction);
      expect(mockSecuritiesRepository.existsById).toHaveBeenCalledWith(
        baseCreateDto.securityId
      );
      expect(mockCurrenciesRepository.existsByCode).toHaveBeenCalledWith(
        baseCreateDto.currency
      );
      expect(mockSecurityTransactionsRepository.create).toHaveBeenCalledWith({
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
      });
    });

    it('should throw when security does not exist', async () => {
      mockSecuritiesRepository.existsById.mockResolvedValue(false);

      await expect(
        service.createSecurityTransaction(baseCreateDto)
      ).rejects.toThrow(NotFoundException);

      expect(mockCurrenciesRepository.existsByCode).not.toHaveBeenCalled();
      expect(mockSecurityTransactionsRepository.create).not.toHaveBeenCalled();
    });

    it('should throw when currency does not exist', async () => {
      mockSecuritiesRepository.existsById.mockResolvedValue(true);
      mockCurrenciesRepository.existsByCode.mockResolvedValue(false);

      await expect(
        service.createSecurityTransaction(baseCreateDto)
      ).rejects.toThrow(NotFoundException);

      expect(mockCurrenciesRepository.existsByCode).toHaveBeenCalledWith(
        baseCreateDto.currency
      );
      expect(mockSecurityTransactionsRepository.create).not.toHaveBeenCalled();
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

      mockSecurityTransactionsRepository.findAll.mockResolvedValue(
        transactions
      );

      const result = await service.getAllSecurityTransactions();

      expect(result).toEqual(transactions);
      expect(mockSecurityTransactionsRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSecurityTransactionById', () => {
    it('should return a security transaction when found', async () => {
      const transaction = {
        id: 'transaction-1',
        date: new Date('2024-01-01'),
      };

      mockSecurityTransactionsRepository.findByIdWithSecurity.mockResolvedValue(
        transaction
      );

      const result = await service.getSecurityTransactionById('transaction-1');

      expect(result).toEqual(transaction);
      expect(
        mockSecurityTransactionsRepository.findByIdWithSecurity
      ).toHaveBeenCalledWith('transaction-1');
    });

    it('should throw when security transaction is not found', async () => {
      mockSecurityTransactionsRepository.findByIdWithSecurity.mockResolvedValue(
        null
      );

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

      mockSecurityTransactionsRepository.findBySecurityId.mockResolvedValue(
        transactions
      );

      const result = await service.getSecurityTransactionsBySecurityId(
        'security-1'
      );

      expect(result).toEqual(transactions);
      expect(
        mockSecurityTransactionsRepository.findBySecurityId
      ).toHaveBeenCalledWith('security-1');
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

      mockSecurityTransactionsRepository.findByType.mockResolvedValue(
        transactions
      );

      const result = await service.getSecurityTransactionsByType('BUY');

      expect(result).toEqual(transactions);
      expect(mockSecurityTransactionsRepository.findByType).toHaveBeenCalledWith(
        'BUY'
      );
    });

    it('should return transactions filtered by type SELL', async () => {
      const transactions = [
        {
          id: 'transaction-2',
          type: 'SELL',
        },
      ];

      mockSecurityTransactionsRepository.findByType.mockResolvedValue(
        transactions
      );

      const result = await service.getSecurityTransactionsByType('SELL');

      expect(result).toEqual(transactions);
      expect(mockSecurityTransactionsRepository.findByType).toHaveBeenCalledWith(
        'SELL'
      );
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

      mockSecurityTransactionsRepository.findByDateRange.mockResolvedValue(
        transactions
      );

      const result = await service.getSecurityTransactionsByDateRange(
        startDate,
        endDate
      );

      expect(result).toEqual(transactions);
      expect(
        mockSecurityTransactionsRepository.findByDateRange
      ).toHaveBeenCalledWith(startDate, endDate);
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

      mockSecurityTransactionsRepository.findById.mockResolvedValue(
        existingTransaction
      );
      mockSecurityTransactionsRepository.update.mockResolvedValue(
        updatedTransaction
      );

      const result = await service.updateSecurityTransaction(
        'transaction-1',
        updateDto
      );

      expect(result).toEqual(updatedTransaction);
      expect(mockSecuritiesRepository.existsById).not.toHaveBeenCalled();
      expect(mockCurrenciesRepository.existsByCode).not.toHaveBeenCalled();
      expect(mockSecurityTransactionsRepository.update).toHaveBeenCalledWith(
        'transaction-1',
        {
          quantity: updateDto.quantity,
          pricePerShare: updateDto.pricePerShare,
          note: updateDto.note,
        }
      );
    });

    it('should throw when security transaction does not exist', async () => {
      mockSecurityTransactionsRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateSecurityTransaction('missing-transaction', {
          quantity: 5,
        })
      ).rejects.toThrow(NotFoundException);

      expect(mockSecurityTransactionsRepository.update).not.toHaveBeenCalled();
    });

    it('should throw when updated security does not exist', async () => {
      const existingTransaction = {
        id: 'transaction-1',
        securityId: 'security-1',
        currency: 'USD',
      };

      mockSecurityTransactionsRepository.findById.mockResolvedValue(
        existingTransaction
      );
      mockSecuritiesRepository.existsById.mockResolvedValue(false);

      await expect(
        service.updateSecurityTransaction('transaction-1', {
          securityId: 'missing-security',
        })
      ).rejects.toThrow(NotFoundException);

      expect(mockSecurityTransactionsRepository.update).not.toHaveBeenCalled();
    });

    it('should throw when updated currency does not exist', async () => {
      const existingTransaction = {
        id: 'transaction-1',
        securityId: 'security-1',
        currency: 'USD',
      };

      mockSecurityTransactionsRepository.findById.mockResolvedValue(
        existingTransaction
      );
      mockCurrenciesRepository.existsByCode.mockResolvedValue(false);

      await expect(
        service.updateSecurityTransaction('transaction-1', {
          currency: 'INVALID',
        })
      ).rejects.toThrow(NotFoundException);

      expect(mockSecurityTransactionsRepository.update).not.toHaveBeenCalled();
    });

    it('should pass the new security id and currency when they change', async () => {
      const existingTransaction = {
        id: 'transaction-1',
        securityId: 'security-1',
        currency: 'USD',
      };
      const updateDto = {
        securityId: 'security-2',
        currency: 'EUR',
      };
      const updatedTransaction = {
        ...existingTransaction,
        ...updateDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSecurityTransactionsRepository.findById.mockResolvedValue(
        existingTransaction
      );
      mockSecuritiesRepository.existsById.mockResolvedValue(true);
      mockCurrenciesRepository.existsByCode.mockResolvedValue(true);
      mockSecurityTransactionsRepository.update.mockResolvedValue(
        updatedTransaction
      );

      const result = await service.updateSecurityTransaction(
        'transaction-1',
        updateDto
      );

      expect(result).toEqual(updatedTransaction);
      expect(mockSecuritiesRepository.existsById).toHaveBeenCalledWith(
        updateDto.securityId
      );
      expect(mockCurrenciesRepository.existsByCode).toHaveBeenCalledWith(
        updateDto.currency
      );
      expect(mockSecurityTransactionsRepository.update).toHaveBeenCalledWith(
        'transaction-1',
        {
          securityId: updateDto.securityId,
          currency: updateDto.currency,
        }
      );
    });
  });

  describe('deleteSecurityTransaction', () => {
    it('should delete security transaction when it exists', async () => {
      mockSecurityTransactionsRepository.findById.mockResolvedValue({
        id: 'transaction-1',
      });

      await service.deleteSecurityTransaction('transaction-1');

      expect(mockSecurityTransactionsRepository.delete).toHaveBeenCalledWith(
        'transaction-1'
      );
    });

    it('should throw when security transaction does not exist', async () => {
      mockSecurityTransactionsRepository.findById.mockResolvedValue(null);

      await expect(
        service.deleteSecurityTransaction('missing-transaction')
      ).rejects.toThrow(NotFoundException);

      expect(mockSecurityTransactionsRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('importFromCsv', () => {
    const createMockFile = (content: string) => ({
      fieldname: 'file',
      originalname: 'test.csv',
      encoding: '7bit',
      mimetype: 'text/csv',
      size: Buffer.byteLength(content),
      buffer: Buffer.from(content),
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully import valid transactions', async () => {
      const csvContent = `ISIN,Datum,Typ,Menge,Preis,Gebühren,Währung,Wechselkurs,Gesamtwert,Notiz
US0378331005,2025-01-15,BUY,10,150.50,9.99,USD,0.92,1395.99,Initial purchase
DE0005190003,2025-01-10,SELL,20,85.30,12.50,EUR,1.00,1718.50,BMW sale`;

      const mockFile = createMockFile(csvContent);

      // Mock security lookup
      mockSecuritiesRepository.findIdsByIsins.mockResolvedValue([
        { id: 'sec-1', isin: 'US0378331005' },
        { id: 'sec-2', isin: 'DE0005190003' },
      ]);

      // Mock currency lookup
      mockCurrenciesRepository.findExistingCodes.mockResolvedValue([
        'USD',
        'EUR',
      ]);

      // Mock batch create
      mockSecurityTransactionsRepository.createMany.mockResolvedValue([
        { id: 'trans-1' },
        { id: 'trans-2' },
      ]);

      const result = await service.importFromCsv(mockFile);

      expect(result.total).toBe(2);
      expect(result.created).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].status).toBe('created');
      expect(result.results[1].status).toBe('created');

      expect(result.results[0].transactionId).toBe('trans-1');
      expect(result.results[1].transactionId).toBe('trans-2');

      expect(mockSecuritiesRepository.findIdsByIsins).toHaveBeenCalledWith([
        'US0378331005',
        'DE0005190003',
      ]);
      expect(mockCurrenciesRepository.findExistingCodes).toHaveBeenCalledWith([
        'USD',
        'EUR',
      ]);
      expect(mockSecurityTransactionsRepository.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: TransactionType.BUY,
            securityId: 'sec-1',
            quantity: 10,
          }),
          expect.objectContaining({
            type: TransactionType.SELL,
            securityId: 'sec-2',
            quantity: 20,
          }),
        ])
      );
    });

    it('should throw BadRequestException when file is empty', async () => {
      const mockFile = createMockFile('');

      await expect(service.importFromCsv(mockFile)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when file has no buffer', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        size: 0,
        buffer: null,
      } as any;

      await expect(service.importFromCsv(mockFile)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when required headers are missing', async () => {
      const csvContent = `ISIN,Datum,Typ
US0378331005,2025-01-15,BUY`;

      const mockFile = createMockFile(csvContent);

      await expect(service.importFromCsv(mockFile)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should skip transactions with non-existent ISIN', async () => {
      const csvContent = `ISIN,Datum,Typ,Menge,Preis,Gebühren,Währung,Wechselkurs,Gesamtwert,Notiz
US0378331005,2025-01-15,BUY,10,150.50,9.99,USD,0.92,1395.99,Known security
XX0000000000,2025-01-10,SELL,20,85.30,12.50,EUR,1.00,1718.50,Unknown security`;

      const mockFile = createMockFile(csvContent);

      // Mock security lookup - only return one security
      mockSecuritiesRepository.findIdsByIsins.mockResolvedValue([
        { id: 'sec-1', isin: 'US0378331005' },
      ]);

      // Mock currency lookup
      mockCurrenciesRepository.findExistingCodes.mockResolvedValue([
        'USD',
        'EUR',
      ]);

      // Mock batch create
      mockSecurityTransactionsRepository.createMany.mockResolvedValue([
        { id: 'trans-1' },
      ]);

      const result = await service.importFromCsv(mockFile);

      expect(result.total).toBe(2);
      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors).toBe(0);
      expect(result.results[0].status).toBe('created');
      expect(result.results[1].status).toBe('skipped');
      expect(result.results[1].reason).toContain('not found');
    });

    it('should handle invalid transaction type', async () => {
      const csvContent = `ISIN,Datum,Typ,Menge,Preis,Gebühren,Währung,Wechselkurs,Gesamtwert,Notiz
US0378331005,2025-01-15,INVALID,10,150.50,9.99,USD,0.92,1395.99,Invalid type`;

      const mockFile = createMockFile(csvContent);

      mockSecuritiesRepository.findIdsByIsins.mockResolvedValue([
        { id: 'sec-1', isin: 'US0378331005' },
      ]);
      mockCurrenciesRepository.findExistingCodes.mockResolvedValue(['USD']);

      const result = await service.importFromCsv(mockFile);

      expect(result.total).toBe(1);
      expect(result.created).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(1);
      expect(result.results[0].status).toBe('error');
      expect(result.results[0].reason).toContain('Invalid type');
    });

    it('should handle invalid numeric values', async () => {
      const csvContent = `ISIN,Datum,Typ,Menge,Preis,Gebühren,Währung,Wechselkurs,Gesamtwert,Notiz
US0378331005,2025-01-15,BUY,abc,150.50,9.99,USD,0.92,1395.99,Invalid quantity`;

      const mockFile = createMockFile(csvContent);

      mockSecuritiesRepository.findIdsByIsins.mockResolvedValue([
        { id: 'sec-1', isin: 'US0378331005' },
      ]);
      mockCurrenciesRepository.findExistingCodes.mockResolvedValue(['USD']);

      const result = await service.importFromCsv(mockFile);

      expect(result.total).toBe(1);
      expect(result.created).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(1);
      expect(result.results[0].status).toBe('error');
      expect(result.results[0].reason).toContain('Invalid numeric value');
    });

    it('should handle currency not found', async () => {
      const csvContent = `ISIN,Datum,Typ,Menge,Preis,Gebühren,Währung,Wechselkurs,Gesamtwert,Notiz
US0378331005,2025-01-15,BUY,10,150.50,9.99,XXX,0.92,1395.99,Invalid currency`;

      const mockFile = createMockFile(csvContent);

      mockSecuritiesRepository.findIdsByIsins.mockResolvedValue([
        { id: 'sec-1', isin: 'US0378331005' },
      ]);
      // Don't include XXX currency
      mockCurrenciesRepository.findExistingCodes.mockResolvedValue([]);

      const result = await service.importFromCsv(mockFile);

      expect(result.total).toBe(1);
      expect(result.created).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(1);
      expect(result.results[0].status).toBe('error');
      expect(result.results[0].reason).toContain('Currency XXX not found');
    });

    it('should throw BadRequestException when row limit exceeded', async () => {
      // Create CSV with more than 1000 rows
      const header = 'ISIN,Datum,Typ,Menge,Preis,Gebühren,Währung,Wechselkurs,Gesamtwert,Notiz';
      const row = 'US0378331005,2025-01-15,BUY,10,150.50,9.99,USD,0.92,1395.99,Test';
      const rows = Array(1001).fill(row);
      const csvContent = [header, ...rows].join('\n');

      const mockFile = createMockFile(csvContent);

      await expect(service.importFromCsv(mockFile)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should handle invalid date format', async () => {
      const csvContent = `ISIN,Datum,Typ,Menge,Preis,Gebühren,Währung,Wechselkurs,Gesamtwert,Notiz
US0378331005,invalid-date,BUY,10,150.50,9.99,USD,0.92,1395.99,Invalid date`;

      const mockFile = createMockFile(csvContent);

      mockSecuritiesRepository.findIdsByIsins.mockResolvedValue([
        { id: 'sec-1', isin: 'US0378331005' },
      ]);
      mockCurrenciesRepository.findExistingCodes.mockResolvedValue(['USD']);

      const result = await service.importFromCsv(mockFile);

      expect(result.total).toBe(1);
      expect(result.created).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(1);
      expect(result.results[0].status).toBe('error');
      expect(result.results[0].reason).toContain('Invalid date format');
    });

    it('should handle missing required fields', async () => {
      const csvContent = `ISIN,Datum,Typ,Menge,Preis,Gebühren,Währung,Wechselkurs,Gesamtwert,Notiz
US0378331005,2025-01-15,BUY,,,9.99,USD,0.92,1395.99,Missing fields`;

      const mockFile = createMockFile(csvContent);

      mockSecuritiesRepository.findIdsByIsins.mockResolvedValue([
        { id: 'sec-1', isin: 'US0378331005' },
      ]);
      mockCurrenciesRepository.findExistingCodes.mockResolvedValue(['USD']);

      const result = await service.importFromCsv(mockFile);

      expect(result.total).toBe(1);
      expect(result.created).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(1);
      expect(result.results[0].status).toBe('error');
      expect(result.results[0].reason).toContain('Missing required fields');
    });
  });
});
