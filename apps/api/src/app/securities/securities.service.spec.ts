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
});
