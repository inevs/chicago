import { Test, TestingModule } from '@nestjs/testing';
import { SecuritiesRepository, CreateSecurityData } from './securities.repository';
import { PrismaService } from '../../prisma.service';

describe('SecuritiesRepository', () => {
  let repository: SecuritiesRepository;
  let prisma: PrismaService;

  const mockPrismaService = {
    security: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      createManyAndReturn: jest.fn(),
      update: jest.fn(),
    },
  };

  const apple = {
    id: 'uuid-1',
    name: 'Apple Inc.',
    symbol: 'AAPL',
    isin: 'US0378331005',
    wkn: '865985',
    type: 'STOCK',
    exchange: 'NASDAQ',
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const microsoft = {
    ...apple,
    id: 'uuid-2',
    name: 'Microsoft Corp.',
    symbol: 'MSFT',
    isin: 'US5949181045',
    wkn: '870747',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecuritiesRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<SecuritiesRepository>(SecuritiesRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all securities ordered by symbol', async () => {
      mockPrismaService.security.findMany.mockResolvedValue([apple, microsoft]);

      const result = await repository.findAll();

      expect(result).toEqual([apple, microsoft]);
      expect(prisma.security.findMany).toHaveBeenCalledWith({
        orderBy: { symbol: 'asc' },
      });
    });
  });

  describe('findAllOrById', () => {
    it('should filter by ID when an ID is given', async () => {
      mockPrismaService.security.findMany.mockResolvedValue([apple]);

      const result = await repository.findAllOrById('uuid-1');

      expect(result).toEqual([apple]);
      expect(prisma.security.findMany).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        orderBy: { symbol: 'asc' },
      });
    });

    it('should return all securities when no ID is given', async () => {
      mockPrismaService.security.findMany.mockResolvedValue([apple, microsoft]);

      const result = await repository.findAllOrById();

      expect(result).toEqual([apple, microsoft]);
      expect(prisma.security.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { symbol: 'asc' },
      });
    });
  });

  describe('findById', () => {
    it('should look up the security by ID', async () => {
      mockPrismaService.security.findUnique.mockResolvedValue(apple);

      const result = await repository.findById('uuid-1');

      expect(result).toEqual(apple);
      expect(prisma.security.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
      });
    });

    it('should return null when the security does not exist', async () => {
      mockPrismaService.security.findUnique.mockResolvedValue(null);

      const result = await repository.findById('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('existsById', () => {
    it('should return true when the security exists', async () => {
      mockPrismaService.security.findUnique.mockResolvedValue(apple);

      const result = await repository.existsById('uuid-1');

      expect(result).toBe(true);
      expect(prisma.security.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
      });
    });

    it('should return false when the security does not exist', async () => {
      mockPrismaService.security.findUnique.mockResolvedValue(null);

      const result = await repository.existsById('invalid-id');

      expect(result).toBe(false);
    });
  });

  describe('findBySymbol', () => {
    it('should look up the security by symbol', async () => {
      mockPrismaService.security.findUnique.mockResolvedValue(apple);

      const result = await repository.findBySymbol('AAPL');

      expect(result).toEqual(apple);
      expect(prisma.security.findUnique).toHaveBeenCalledWith({
        where: { symbol: 'AAPL' },
      });
    });

    it('should return null when no security has the symbol', async () => {
      mockPrismaService.security.findUnique.mockResolvedValue(null);

      const result = await repository.findBySymbol('XYZ');

      expect(result).toBeNull();
    });
  });

  describe('findExistingSymbols', () => {
    it('should query the given symbols and return the existing ones as strings', async () => {
      mockPrismaService.security.findMany.mockResolvedValue([{ symbol: 'AAPL' }]);

      const result = await repository.findExistingSymbols([
        'AAPL',
        'MSFT',
        'BMW.DE',
      ]);

      expect(result).toEqual(['AAPL']);
      expect(prisma.security.findMany).toHaveBeenCalledWith({
        where: { symbol: { in: ['AAPL', 'MSFT', 'BMW.DE'] } },
        select: { symbol: true },
      });
    });

    it('should return an empty array when none of the symbols exist', async () => {
      mockPrismaService.security.findMany.mockResolvedValue([]);

      const result = await repository.findExistingSymbols(['XYZ']);

      expect(result).toEqual([]);
    });
  });

  describe('findIdsByIsins', () => {
    it('should select ID and ISIN of the securities with the given ISINs', async () => {
      const rows = [
        { id: 'uuid-1', isin: 'US0378331005' },
        { id: 'uuid-2', isin: 'US5949181045' },
      ];
      mockPrismaService.security.findMany.mockResolvedValue(rows);

      const result = await repository.findIdsByIsins([
        'US0378331005',
        'US5949181045',
      ]);

      expect(result).toEqual(rows);
      expect(prisma.security.findMany).toHaveBeenCalledWith({
        where: { isin: { in: ['US0378331005', 'US5949181045'] } },
        select: { id: true, isin: true },
      });
    });
  });

  describe('search', () => {
    it('should search name, symbol, ISIN and WKN case-insensitively, ordered and limited', async () => {
      mockPrismaService.security.findMany.mockResolvedValue([apple]);

      const result = await repository.search('apple', 10);

      expect(result).toEqual([apple]);
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

    it('should pass the given limit as take', async () => {
      mockPrismaService.security.findMany.mockResolvedValue([]);

      await repository.search('security', 5);

      expect(prisma.security.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
    });
  });

  describe('create', () => {
    it('should create the security with the given data', async () => {
      const data: CreateSecurityData = {
        name: 'Apple Inc.',
        symbol: 'AAPL',
        isin: 'US0378331005',
        wkn: '865985',
        type: 'STOCK',
        exchange: 'NASDAQ',
        currency: 'USD',
      };
      mockPrismaService.security.create.mockResolvedValue(apple);

      const result = await repository.create(data);

      expect(result).toEqual(apple);
      expect(prisma.security.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('createMany', () => {
    it('should insert all securities, skipping duplicates, and return the created rows', async () => {
      const data: CreateSecurityData[] = [
        {
          name: 'Apple Inc.',
          symbol: 'AAPL',
          type: 'STOCK',
          exchange: 'NASDAQ',
          currency: 'USD',
        },
        {
          name: 'Microsoft Corp.',
          symbol: 'MSFT',
          type: 'STOCK',
          exchange: 'NASDAQ',
          currency: 'USD',
        },
      ];
      mockPrismaService.security.createManyAndReturn.mockResolvedValue([
        apple,
        microsoft,
      ]);

      const result = await repository.createMany(data);

      expect(result).toEqual([apple, microsoft]);
      expect(prisma.security.createManyAndReturn).toHaveBeenCalledWith({
        data,
        skipDuplicates: true,
      });
    });
  });

  describe('update', () => {
    it('should update the security with the given ID', async () => {
      const data = { name: 'Apple Inc. Updated', exchange: 'XETRA' };
      const updated = { ...apple, ...data };
      mockPrismaService.security.update.mockResolvedValue(updated);

      const result = await repository.update('uuid-1', data);

      expect(result).toEqual(updated);
      expect(prisma.security.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data,
      });
    });
  });
});
