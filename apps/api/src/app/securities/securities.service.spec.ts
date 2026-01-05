import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SecuritiesService } from './securities.service';
import { PrismaService } from '../../prisma.service';
import { SecurityType } from '@dividends/shared';

describe('SecuritiesService', () => {
  let service: SecuritiesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    security: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    currency: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecuritiesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SecuritiesService>(SecuritiesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSecurity', () => {
    it('should successfully create a security', async () => {
      const dto = {
        name: 'Apple Inc.',
        symbol: 'AAPL',
        isin: 'US0378331005',
        wkn: '865985',
        type: SecurityType.STOCK,
        exchange: 'NASDAQ',
        currency: 'USD',
      };

      const createdSecurity = {
        id: 'uuid-123',
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.security.findUnique.mockResolvedValue(null);
      mockPrismaService.currency.findUnique.mockResolvedValue({ code: 'USD' });
      mockPrismaService.security.create.mockResolvedValue(createdSecurity);

      const result = await service.createSecurity(dto);

      expect(result).toEqual(createdSecurity);
      expect(prisma.security.findUnique).toHaveBeenCalledWith({
        where: { symbol: 'AAPL' },
      });
      expect(prisma.currency.findUnique).toHaveBeenCalledWith({
        where: { code: 'USD' },
      });
      expect(prisma.security.create).toHaveBeenCalledWith({ data: dto });
    });

    it('should throw ConflictException when symbol already exists', async () => {
      const dto = {
        name: 'Apple Inc.',
        symbol: 'AAPL',
        type: SecurityType.STOCK,
        exchange: 'NASDAQ',
        currency: 'USD',
      };

      mockPrismaService.security.findUnique.mockResolvedValue({
        id: 'existing-id',
      });

      await expect(service.createSecurity(dto)).rejects.toThrow(
        ConflictException
      );
      expect(prisma.currency.findUnique).not.toHaveBeenCalled();
      expect(prisma.security.create).not.toHaveBeenCalled();
    });

    it('should create security with optional fields as undefined', async () => {
      const dto = {
        name: 'Microsoft Corp.',
        symbol: 'MSFT',
        type: SecurityType.STOCK,
        exchange: 'NASDAQ',
        currency: 'USD',
      };

      const createdSecurity = {
        id: 'uuid-456',
        ...dto,
        isin: null,
        wkn: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.security.findUnique.mockResolvedValue(null);
      mockPrismaService.currency.findUnique.mockResolvedValue({ code: 'USD' });
      mockPrismaService.security.create.mockResolvedValue(createdSecurity);

      const result = await service.createSecurity(dto);

      expect(result).toEqual(createdSecurity);
    });

    it('should throw NotFoundException when currency does not exist', async () => {
      const dto = {
        name: 'Example Corp.',
        symbol: 'EXM',
        type: SecurityType.STOCK,
        exchange: 'NASDAQ',
        currency: 'USD',
      };

      mockPrismaService.security.findUnique.mockResolvedValue(null);
      mockPrismaService.currency.findUnique.mockResolvedValue(null);

      await expect(service.createSecurity(dto)).rejects.toThrow(
        NotFoundException
      );
      expect(prisma.security.create).not.toHaveBeenCalled();
    });
  });

  describe('getAllSecurities', () => {
    it('should return all securities ordered by symbol', async () => {
      const securities = [
        {
          id: 'uuid-1',
          name: 'Apple Inc.',
          symbol: 'AAPL',
          isin: 'US0378331005',
          wkn: null,
          type: SecurityType.STOCK,
          exchange: 'NASDAQ',
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'uuid-2',
          name: 'Microsoft Corp.',
          symbol: 'MSFT',
          isin: null,
          wkn: null,
          type: SecurityType.STOCK,
          exchange: 'NASDAQ',
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.security.findMany.mockResolvedValue(securities);

      const result = await service.getAllSecurities();

      expect(result).toEqual(securities);
      expect(prisma.security.findMany).toHaveBeenCalledWith({
        orderBy: { symbol: 'asc' },
      });
    });

    it('should return empty array when no securities exist', async () => {
      mockPrismaService.security.findMany.mockResolvedValue([]);

      const result = await service.getAllSecurities();

      expect(result).toEqual([]);
    });
  });

  describe('getSecurityById', () => {
    it('should return a security when found', async () => {
      const security = {
        id: 'uuid-123',
        name: 'Apple Inc.',
        symbol: 'AAPL',
        isin: 'US0378331005',
        wkn: null,
        type: SecurityType.STOCK,
        exchange: 'NASDAQ',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.security.findUnique.mockResolvedValue(security);

      const result = await service.getSecurityById('uuid-123');

      expect(result).toEqual(security);
      expect(prisma.security.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
      });
    });

    it('should throw NotFoundException when security not found', async () => {
      mockPrismaService.security.findUnique.mockResolvedValue(null);

      await expect(service.getSecurityById('invalid-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateSecurity', () => {
    it('should successfully update a security', async () => {
      const existingSecurity = {
        id: 'uuid-123',
        name: 'Apple Inc.',
        symbol: 'AAPL',
        isin: null,
        wkn: null,
        type: SecurityType.STOCK,
        exchange: 'NASDAQ',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const dto = {
        name: 'Apple Inc. Updated',
        exchange: 'XETRA',
      };

      const updatedSecurity = {
        ...existingSecurity,
        ...dto,
        updatedAt: new Date(),
      };

      mockPrismaService.security.findUnique.mockResolvedValue(existingSecurity);
      mockPrismaService.security.update.mockResolvedValue(updatedSecurity);

      const result = await service.updateSecurity('uuid-123', dto);

      expect(result).toEqual(updatedSecurity);
      expect(prisma.security.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
      });
      expect(prisma.security.update).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
        data: dto,
      });
    });

    it('should throw NotFoundException when security does not exist', async () => {
      const dto = {
        name: 'Updated',
      };

      mockPrismaService.security.findUnique.mockResolvedValue(null);

      await expect(service.updateSecurity('invalid-id', dto)).rejects.toThrow(
        NotFoundException
      );
      expect(prisma.security.update).not.toHaveBeenCalled();
    });

    it('should update symbol when provided and not duplicate', async () => {
      const existingSecurity = {
        id: 'uuid-123',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: SecurityType.STOCK,
        exchange: 'NASDAQ',
        currency: 'USD',
      };

      const dto = {
        symbol: 'AAPL2',
      };

      const updatedSecurity = {
        ...existingSecurity,
        symbol: 'AAPL2',
      };

      mockPrismaService.security.findUnique
        .mockResolvedValueOnce(existingSecurity) // First call - finding the security
        .mockResolvedValueOnce(null); // Second call - checking for duplicate symbol
      mockPrismaService.security.update.mockResolvedValue(updatedSecurity);

      const result = await service.updateSecurity('uuid-123', dto);

      expect(result.symbol).toBe('AAPL2');
      expect(prisma.security.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.security.findUnique).toHaveBeenNthCalledWith(2, {
        where: { symbol: 'AAPL2' },
      });
    });

    it('should throw ConflictException when new symbol already exists', async () => {
      const existingSecurity = {
        id: 'uuid-123',
        symbol: 'AAPL',
      };

      const dto = {
        symbol: 'MSFT',
      };

      mockPrismaService.security.findUnique
        .mockResolvedValueOnce(existingSecurity)
        .mockResolvedValueOnce({ id: 'uuid-456', symbol: 'MSFT' });

      await expect(service.updateSecurity('uuid-123', dto)).rejects.toThrow(
        ConflictException
      );
      expect(prisma.security.update).not.toHaveBeenCalled();
    });

    it('should not check for duplicate when symbol is the same', async () => {
      const existingSecurity = {
        id: 'uuid-123',
        symbol: 'AAPL',
        name: 'Apple Inc.',
      };

      const dto = {
        symbol: 'AAPL',
        name: 'Apple Inc. Updated',
      };

      const updatedSecurity = {
        ...existingSecurity,
        name: 'Apple Inc. Updated',
      };

      mockPrismaService.security.findUnique.mockResolvedValueOnce(
        existingSecurity
      );
      mockPrismaService.security.update.mockResolvedValue(updatedSecurity);

      await service.updateSecurity('uuid-123', dto);

      expect(prisma.security.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.security.update).toHaveBeenCalled();
    });

    it('should validate currency when provided', async () => {
      const existingSecurity = {
        id: 'uuid-123',
        currency: 'USD',
      };

      const dto = {
        currency: 'EUR',
      };

      mockPrismaService.security.findUnique.mockResolvedValue(existingSecurity);
      mockPrismaService.currency.findUnique.mockResolvedValue({ code: 'EUR' });
      mockPrismaService.security.update.mockResolvedValue({
        ...existingSecurity,
        currency: 'EUR',
      });

      await service.updateSecurity('uuid-123', dto);

      expect(prisma.currency.findUnique).toHaveBeenCalledWith({
        where: { code: 'EUR' },
      });
    });

    it('should throw NotFoundException when currency does not exist', async () => {
      const existingSecurity = {
        id: 'uuid-123',
        currency: 'USD',
      };

      const dto = {
        currency: 'XYZ',
      };

      mockPrismaService.security.findUnique.mockResolvedValue(existingSecurity);
      mockPrismaService.currency.findUnique.mockResolvedValue(null);

      await expect(service.updateSecurity('uuid-123', dto)).rejects.toThrow(
        NotFoundException
      );
      expect(prisma.security.update).not.toHaveBeenCalled();
    });

    it('should update all fields when provided', async () => {
      const existingSecurity = {
        id: 'uuid-123',
        name: 'Apple Inc.',
        symbol: 'AAPL',
        isin: null,
        wkn: null,
        type: SecurityType.STOCK,
        exchange: 'NASDAQ',
        currency: 'USD',
      };

      const dto = {
        name: 'Apple Inc. Updated',
        symbol: 'AAPL2',
        isin: 'US0378331005',
        wkn: '865985',
        type: SecurityType.ETF,
        exchange: 'XETRA',
        currency: 'EUR',
      };

      const updatedSecurity = {
        ...existingSecurity,
        ...dto,
      };

      mockPrismaService.security.findUnique
        .mockResolvedValueOnce(existingSecurity)
        .mockResolvedValueOnce(null);
      mockPrismaService.currency.findUnique.mockResolvedValue({ code: 'EUR' });
      mockPrismaService.security.update.mockResolvedValue(updatedSecurity);

      const result = await service.updateSecurity('uuid-123', dto);

      expect(result).toMatchObject(dto);
    });
  });

  describe('searchSecurities', () => {
    it('should return all securities when query is empty', async () => {
      const securities = [
        {
          id: 'uuid-1',
          name: 'Apple Inc.',
          symbol: 'AAPL',
          type: SecurityType.STOCK,
          exchange: 'NASDAQ',
          currency: 'USD',
        },
      ];

      mockPrismaService.security.findMany.mockResolvedValue(securities);

      const result = await service.searchSecurities('');

      expect(result).toEqual(securities);
      expect(prisma.security.findMany).toHaveBeenCalledWith({
        orderBy: { symbol: 'asc' },
      });
    });

    it('should return all securities when query is only whitespace', async () => {
      const securities = [
        {
          id: 'uuid-1',
          name: 'Apple Inc.',
          symbol: 'AAPL',
          type: SecurityType.STOCK,
          exchange: 'NASDAQ',
          currency: 'USD',
        },
      ];

      mockPrismaService.security.findMany.mockResolvedValue(securities);

      const result = await service.searchSecurities('   ');

      expect(result).toEqual(securities);
      expect(prisma.security.findMany).toHaveBeenCalledWith({
        orderBy: { symbol: 'asc' },
      });
    });

    it('should search by name case-insensitively', async () => {
      const securities = [
        {
          id: 'uuid-1',
          name: 'Apple Inc.',
          symbol: 'AAPL',
          type: SecurityType.STOCK,
          exchange: 'NASDAQ',
          currency: 'USD',
        },
      ];

      mockPrismaService.security.findMany.mockResolvedValue(securities);

      const result = await service.searchSecurities('apple');

      expect(result).toEqual(securities);
      expect(prisma.security.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'apple', mode: 'insensitive' } },
            { symbol: { contains: 'apple', mode: 'insensitive' } },
            { isin: { contains: 'apple', mode: 'insensitive' } },
            { wkn: { contains: 'apple', mode: 'insensitive' } },
          ],
        },
        orderBy: { symbol: 'asc' },
        take: 10,
      });
    });

    it('should search by symbol case-insensitively', async () => {
      const securities = [
        {
          id: 'uuid-1',
          name: 'Apple Inc.',
          symbol: 'AAPL',
          type: SecurityType.STOCK,
          exchange: 'NASDAQ',
          currency: 'USD',
        },
      ];

      mockPrismaService.security.findMany.mockResolvedValue(securities);

      const result = await service.searchSecurities('aapl');

      expect(result).toEqual(securities);
      expect(prisma.security.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'aapl', mode: 'insensitive' } },
            { symbol: { contains: 'aapl', mode: 'insensitive' } },
            { isin: { contains: 'aapl', mode: 'insensitive' } },
            { wkn: { contains: 'aapl', mode: 'insensitive' } },
          ],
        },
        orderBy: { symbol: 'asc' },
        take: 10,
      });
    });

    it('should search by ISIN', async () => {
      const securities = [
        {
          id: 'uuid-1',
          name: 'Apple Inc.',
          symbol: 'AAPL',
          isin: 'US0378331005',
          type: SecurityType.STOCK,
          exchange: 'NASDAQ',
          currency: 'USD',
        },
      ];

      mockPrismaService.security.findMany.mockResolvedValue(securities);

      const result = await service.searchSecurities('US0378331005');

      expect(result).toEqual(securities);
    });

    it('should search by WKN', async () => {
      const securities = [
        {
          id: 'uuid-1',
          name: 'Apple Inc.',
          symbol: 'AAPL',
          wkn: '865985',
          type: SecurityType.STOCK,
          exchange: 'NASDAQ',
          currency: 'USD',
        },
      ];

      mockPrismaService.security.findMany.mockResolvedValue(securities);

      const result = await service.searchSecurities('865985');

      expect(result).toEqual(securities);
    });

    it('should limit results to 10 securities', async () => {
      const securities = Array.from({ length: 10 }, (_, i) => ({
        id: `uuid-${i}`,
        name: `Security ${i}`,
        symbol: `SYM${i}`,
        type: SecurityType.STOCK,
        exchange: 'NASDAQ',
        currency: 'USD',
      }));

      mockPrismaService.security.findMany.mockResolvedValue(securities);

      const result = await service.searchSecurities('security');

      expect(result).toEqual(securities);
      expect(prisma.security.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });

    it('should trim whitespace from search query', async () => {
      mockPrismaService.security.findMany.mockResolvedValue([]);

      await service.searchSecurities('  apple  ');

      expect(prisma.security.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'apple', mode: 'insensitive' } },
            { symbol: { contains: 'apple', mode: 'insensitive' } },
            { isin: { contains: 'apple', mode: 'insensitive' } },
            { wkn: { contains: 'apple', mode: 'insensitive' } },
          ],
        },
        orderBy: { symbol: 'asc' },
        take: 10,
      });
    });

    it('should return empty array when no matches found', async () => {
      mockPrismaService.security.findMany.mockResolvedValue([]);

      const result = await service.searchSecurities('nonexistent');

      expect(result).toEqual([]);
    });
  });
});
