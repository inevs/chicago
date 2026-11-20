import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { SecuritiesService } from './securities.service';
import { SecuritiesRepository } from './securities.repository';
import { CurrenciesRepository } from '../currencies/currencies.repository';
import { SecurityPricesService } from '../security-prices/security-prices.service';
import { SecurityType } from '@dividends/shared';
import { UploadedFile } from './dto/import-securities-csv.dto';

describe('SecuritiesService', () => {
  let service: SecuritiesService;
  let securitiesRepository: SecuritiesRepository;
  let currenciesRepository: CurrenciesRepository;
  let securityPricesService: SecurityPricesService;

  const mockSecuritiesRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findBySymbol: jest.fn(),
    findExistingSymbols: jest.fn(),
    search: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
  };

  const mockCurrenciesRepository = {
    existsByCode: jest.fn(),
    findExistingCodes: jest.fn(),
  };

  const mockSecurityPricesService = {
    syncHistoricalPrices: jest.fn().mockResolvedValue({
      failures: [],
      pricesInserted: 10,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecuritiesService,
        {
          provide: SecuritiesRepository,
          useValue: mockSecuritiesRepository,
        },
        {
          provide: CurrenciesRepository,
          useValue: mockCurrenciesRepository,
        },
        {
          provide: SecurityPricesService,
          useValue: mockSecurityPricesService,
        },
      ],
    }).compile();

    service = module.get<SecuritiesService>(SecuritiesService);
    securitiesRepository = module.get<SecuritiesRepository>(SecuritiesRepository);
    currenciesRepository = module.get<CurrenciesRepository>(CurrenciesRepository);
    securityPricesService = module.get<SecurityPricesService>(SecurityPricesService);
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

      mockSecuritiesRepository.findBySymbol.mockResolvedValue(null);
      mockCurrenciesRepository.existsByCode.mockResolvedValue(true);
      mockSecuritiesRepository.create.mockResolvedValue(createdSecurity);

      const result = await service.createSecurity(dto);

      expect(result).toEqual(createdSecurity);
      expect(securitiesRepository.findBySymbol).toHaveBeenCalledWith('AAPL');
      expect(currenciesRepository.existsByCode).toHaveBeenCalledWith('USD');
      expect(securitiesRepository.create).toHaveBeenCalledWith(dto);
      expect(securityPricesService.syncHistoricalPrices).toHaveBeenCalledWith({
        securityId: 'uuid-123',
      });
    });

    it('should throw ConflictException when symbol already exists', async () => {
      const dto = {
        name: 'Apple Inc.',
        symbol: 'AAPL',
        type: SecurityType.STOCK,
        exchange: 'NASDAQ',
        currency: 'USD',
      };

      mockSecuritiesRepository.findBySymbol.mockResolvedValue({
        id: 'existing-id',
      });

      await expect(service.createSecurity(dto)).rejects.toThrow(
        ConflictException
      );
      expect(currenciesRepository.existsByCode).not.toHaveBeenCalled();
      expect(securitiesRepository.create).not.toHaveBeenCalled();
      expect(securityPricesService.syncHistoricalPrices).not.toHaveBeenCalled();
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

      mockSecuritiesRepository.findBySymbol.mockResolvedValue(null);
      mockCurrenciesRepository.existsByCode.mockResolvedValue(true);
      mockSecuritiesRepository.create.mockResolvedValue(createdSecurity);

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

      mockSecuritiesRepository.findBySymbol.mockResolvedValue(null);
      mockCurrenciesRepository.existsByCode.mockResolvedValue(false);

      await expect(service.createSecurity(dto)).rejects.toThrow(
        NotFoundException
      );
      expect(securitiesRepository.create).not.toHaveBeenCalled();
      expect(securityPricesService.syncHistoricalPrices).not.toHaveBeenCalled();
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

      mockSecuritiesRepository.findAll.mockResolvedValue(securities);

      const result = await service.getAllSecurities();

      expect(result).toEqual(securities);
      expect(securitiesRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no securities exist', async () => {
      mockSecuritiesRepository.findAll.mockResolvedValue([]);

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

      mockSecuritiesRepository.findById.mockResolvedValue(security);

      const result = await service.getSecurityById('uuid-123');

      expect(result).toEqual(security);
      expect(securitiesRepository.findById).toHaveBeenCalledWith('uuid-123');
    });

    it('should throw NotFoundException when security not found', async () => {
      mockSecuritiesRepository.findById.mockResolvedValue(null);

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

      mockSecuritiesRepository.findById.mockResolvedValue(existingSecurity);
      mockSecuritiesRepository.update.mockResolvedValue(updatedSecurity);

      const result = await service.updateSecurity('uuid-123', dto);

      expect(result).toEqual(updatedSecurity);
      expect(securitiesRepository.findById).toHaveBeenCalledWith('uuid-123');
      expect(securitiesRepository.findBySymbol).not.toHaveBeenCalled();
      expect(currenciesRepository.existsByCode).not.toHaveBeenCalled();
      expect(securitiesRepository.update).toHaveBeenCalledWith('uuid-123', dto);
    });

    it('should throw NotFoundException when security does not exist', async () => {
      const dto = {
        name: 'Updated',
      };

      mockSecuritiesRepository.findById.mockResolvedValue(null);

      await expect(service.updateSecurity('invalid-id', dto)).rejects.toThrow(
        NotFoundException
      );
      expect(securitiesRepository.update).not.toHaveBeenCalled();
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

      mockSecuritiesRepository.findById.mockResolvedValue(existingSecurity); // Finding the security
      mockSecuritiesRepository.findBySymbol.mockResolvedValue(null); // Checking for duplicate symbol
      mockSecuritiesRepository.update.mockResolvedValue(updatedSecurity);

      const result = await service.updateSecurity('uuid-123', dto);

      expect(result.symbol).toBe('AAPL2');
      expect(securitiesRepository.findById).toHaveBeenCalledTimes(1);
      expect(securitiesRepository.findBySymbol).toHaveBeenCalledTimes(1);
      expect(securitiesRepository.findBySymbol).toHaveBeenCalledWith('AAPL2');
    });

    it('should throw ConflictException when new symbol already exists', async () => {
      const existingSecurity = {
        id: 'uuid-123',
        symbol: 'AAPL',
      };

      const dto = {
        symbol: 'MSFT',
      };

      mockSecuritiesRepository.findById.mockResolvedValue(existingSecurity);
      mockSecuritiesRepository.findBySymbol.mockResolvedValue({
        id: 'uuid-456',
        symbol: 'MSFT',
      });

      await expect(service.updateSecurity('uuid-123', dto)).rejects.toThrow(
        ConflictException
      );
      expect(securitiesRepository.update).not.toHaveBeenCalled();
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

      mockSecuritiesRepository.findById.mockResolvedValue(existingSecurity);
      mockSecuritiesRepository.update.mockResolvedValue(updatedSecurity);

      await service.updateSecurity('uuid-123', dto);

      expect(securitiesRepository.findById).toHaveBeenCalledTimes(1);
      expect(securitiesRepository.findBySymbol).not.toHaveBeenCalled();
      expect(securitiesRepository.update).toHaveBeenCalled();
    });

    it('should validate currency when provided', async () => {
      const existingSecurity = {
        id: 'uuid-123',
        currency: 'USD',
      };

      const dto = {
        currency: 'EUR',
      };

      mockSecuritiesRepository.findById.mockResolvedValue(existingSecurity);
      mockCurrenciesRepository.existsByCode.mockResolvedValue(true);
      mockSecuritiesRepository.update.mockResolvedValue({
        ...existingSecurity,
        currency: 'EUR',
      });

      await service.updateSecurity('uuid-123', dto);

      expect(currenciesRepository.existsByCode).toHaveBeenCalledWith('EUR');
    });

    it('should throw NotFoundException when currency does not exist', async () => {
      const existingSecurity = {
        id: 'uuid-123',
        currency: 'USD',
      };

      const dto = {
        currency: 'XYZ',
      };

      mockSecuritiesRepository.findById.mockResolvedValue(existingSecurity);
      mockCurrenciesRepository.existsByCode.mockResolvedValue(false);

      await expect(service.updateSecurity('uuid-123', dto)).rejects.toThrow(
        NotFoundException
      );
      expect(securitiesRepository.update).not.toHaveBeenCalled();
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

      mockSecuritiesRepository.findById.mockResolvedValue(existingSecurity);
      mockSecuritiesRepository.findBySymbol.mockResolvedValue(null);
      mockCurrenciesRepository.existsByCode.mockResolvedValue(true);
      mockSecuritiesRepository.update.mockResolvedValue(updatedSecurity);

      const result = await service.updateSecurity('uuid-123', dto);

      expect(result).toMatchObject(dto);
      expect(securitiesRepository.update).toHaveBeenCalledWith('uuid-123', dto);
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

      mockSecuritiesRepository.findAll.mockResolvedValue(securities);

      const result = await service.searchSecurities('');

      expect(result).toEqual(securities);
      expect(securitiesRepository.findAll).toHaveBeenCalledTimes(1);
      expect(securitiesRepository.search).not.toHaveBeenCalled();
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

      mockSecuritiesRepository.findAll.mockResolvedValue(securities);

      const result = await service.searchSecurities('   ');

      expect(result).toEqual(securities);
      expect(securitiesRepository.findAll).toHaveBeenCalledTimes(1);
      expect(securitiesRepository.search).not.toHaveBeenCalled();
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

      mockSecuritiesRepository.search.mockResolvedValue(securities);

      const result = await service.searchSecurities('apple');

      expect(result).toEqual(securities);
      expect(securitiesRepository.search).toHaveBeenCalledWith('apple', 10);
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

      mockSecuritiesRepository.search.mockResolvedValue(securities);

      const result = await service.searchSecurities('aapl');

      expect(result).toEqual(securities);
      expect(securitiesRepository.search).toHaveBeenCalledWith('aapl', 10);
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

      mockSecuritiesRepository.search.mockResolvedValue(securities);

      const result = await service.searchSecurities('US0378331005');

      expect(result).toEqual(securities);
      // The search term is lower-cased before it is passed to the repository
      expect(securitiesRepository.search).toHaveBeenCalledWith(
        'us0378331005',
        10
      );
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

      mockSecuritiesRepository.search.mockResolvedValue(securities);

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

      mockSecuritiesRepository.search.mockResolvedValue(securities);

      const result = await service.searchSecurities('security');

      expect(result).toEqual(securities);
      expect(securitiesRepository.search).toHaveBeenCalledWith(
        'security',
        10
      );
    });

    it('should trim whitespace from search query', async () => {
      mockSecuritiesRepository.search.mockResolvedValue([]);

      await service.searchSecurities('  apple  ');

      expect(securitiesRepository.search).toHaveBeenCalledWith('apple', 10);
    });

    it('should return empty array when no matches found', async () => {
      mockSecuritiesRepository.search.mockResolvedValue([]);

      const result = await service.searchSecurities('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('importFromCsv', () => {
    const createMockFile = (content: string): UploadedFile => ({
      fieldname: 'file',
      originalname: 'test.csv',
      encoding: '7bit',
      mimetype: 'text/csv',
      size: Buffer.byteLength(content),
      buffer: Buffer.from(content, 'utf-8'),
    });

    it('should successfully import valid securities from CSV', async () => {
      const csvContent = `name,symbol,type,exchange,currency,isin,wkn
Apple Inc.,AAPL,STOCK,NASDAQ,USD,US0378331005,865985
Microsoft Corp.,MSFT,STOCK,NASDAQ,USD,US5949181045,870747`;

      const file = createMockFile(csvContent);

      const createdSecurities = [
        { id: 'uuid-1', name: 'Apple Inc.', symbol: 'AAPL', type: 'STOCK', exchange: 'NASDAQ', currency: 'USD', isin: 'US0378331005', wkn: '865985' },
        { id: 'uuid-2', name: 'Microsoft Corp.', symbol: 'MSFT', type: 'STOCK', exchange: 'NASDAQ', currency: 'USD', isin: 'US5949181045', wkn: '870747' },
      ];

      mockSecuritiesRepository.findExistingSymbols.mockResolvedValue([]);
      mockCurrenciesRepository.findExistingCodes.mockResolvedValue(['USD']);
      mockSecuritiesRepository.createMany.mockResolvedValue(createdSecurities);

      const result = await service.importFromCsv(file);

      expect(result.total).toBe(2);
      expect(result.created).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.pricesSyncTriggered).toBe(true);
      expect(securityPricesService.syncHistoricalPrices).toHaveBeenCalledTimes(2);
    });

    it('should import CSV files starting with a UTF-8 BOM (e.g. Excel export)', async () => {
      const csvContent = `\uFEFFname,symbol,type,exchange,currency
Apple Inc.,AAPL,STOCK,NASDAQ,USD`;

      const file = createMockFile(csvContent);

      mockSecuritiesRepository.findExistingSymbols.mockResolvedValue([]);
      mockCurrenciesRepository.findExistingCodes.mockResolvedValue(['USD']);
      mockSecuritiesRepository.createMany.mockResolvedValue([
        { id: 'uuid-1', name: 'Apple Inc.', symbol: 'AAPL', type: 'STOCK', exchange: 'NASDAQ', currency: 'USD' },
      ]);

      const result = await service.importFromCsv(file);

      expect(result.created).toBe(1);
      expect(result.errors).toBe(0);
      expect(securitiesRepository.createMany).toHaveBeenCalledWith([
        expect.objectContaining({ name: 'Apple Inc.', symbol: 'AAPL' }),
      ]);
    });

    it('should skip duplicate symbols', async () => {
      const csvContent = `name,symbol,type,exchange,currency
Apple Inc.,AAPL,STOCK,NASDAQ,USD
Microsoft Corp.,MSFT,STOCK,NASDAQ,USD`;

      const file = createMockFile(csvContent);

      mockSecuritiesRepository.findExistingSymbols.mockResolvedValue(['AAPL']);
      mockCurrenciesRepository.findExistingCodes.mockResolvedValue(['USD']);
      mockSecuritiesRepository.createMany.mockResolvedValue([
        { id: 'uuid-2', symbol: 'MSFT', name: 'Microsoft Corp.', type: 'STOCK', exchange: 'NASDAQ', currency: 'USD' },
      ]);

      const result = await service.importFromCsv(file);

      expect(result.total).toBe(2);
      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.results[0].status).toBe('skipped');
      expect(result.results[0].reason).toBe('Symbol already exists');
      expect(result.results[1].status).toBe('created');
    });

    it('should assign security IDs by symbol, not by position', async () => {
      const csvContent = `name,symbol,type,exchange,currency
Apple Inc.,AAPL,STOCK,NASDAQ,USD
Microsoft Corp.,MSFT,STOCK,NASDAQ,USD`;

      const file = createMockFile(csvContent);

      mockSecuritiesRepository.findExistingSymbols.mockResolvedValue([]);
      mockCurrenciesRepository.findExistingCodes.mockResolvedValue(['USD']);
      mockSecuritiesRepository.createMany.mockResolvedValue([
        { id: 'uuid-msft', symbol: 'MSFT', name: 'Microsoft Corp.', type: 'STOCK', exchange: 'NASDAQ', currency: 'USD' },
        { id: 'uuid-aapl', symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK', exchange: 'NASDAQ', currency: 'USD' },
      ]);

      const result = await service.importFromCsv(file);

      expect(result.results[0]).toMatchObject({ symbol: 'AAPL', status: 'created', securityId: 'uuid-aapl' });
      expect(result.results[1]).toMatchObject({ symbol: 'MSFT', status: 'created', securityId: 'uuid-msft' });
    });

    it('should mark rows skipped at insert time (concurrent duplicate) as skipped', async () => {
      const csvContent = `name,symbol,type,exchange,currency
Apple Inc.,AAPL,STOCK,NASDAQ,USD
Microsoft Corp.,MSFT,STOCK,NASDAQ,USD
Alphabet Inc.,GOOGL,STOCK,NASDAQ,USD`;

      const file = createMockFile(csvContent);

      mockSecuritiesRepository.findExistingSymbols.mockResolvedValue([]);
      mockCurrenciesRepository.findExistingCodes.mockResolvedValue(['USD']);
      // MSFT was inserted concurrently after the pre-check and is skipped by createMany
      mockSecuritiesRepository.createMany.mockResolvedValue([
        { id: 'uuid-aapl', symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK', exchange: 'NASDAQ', currency: 'USD' },
        { id: 'uuid-googl', symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'STOCK', exchange: 'NASDAQ', currency: 'USD' },
      ]);

      const result = await service.importFromCsv(file);

      expect(result.created).toBe(2);
      expect(result.skipped).toBe(1);
      expect(result.results[0]).toMatchObject({ symbol: 'AAPL', status: 'created', securityId: 'uuid-aapl' });
      expect(result.results[1]).toMatchObject({ symbol: 'MSFT', status: 'skipped', reason: 'Symbol already exists' });
      expect(result.results[1].securityId).toBeUndefined();
      expect(result.results[2]).toMatchObject({ symbol: 'GOOGL', status: 'created', securityId: 'uuid-googl' });
      expect(securityPricesService.syncHistoricalPrices).toHaveBeenCalledTimes(2);
      expect(securityPricesService.syncHistoricalPrices).toHaveBeenCalledWith({ securityId: 'uuid-aapl' });
      expect(securityPricesService.syncHistoricalPrices).toHaveBeenCalledWith({ securityId: 'uuid-googl' });
    });

    it('should not trigger a price sync when all rows are skipped at insert time', async () => {
      const csvContent = `name,symbol,type,exchange,currency
Apple Inc.,AAPL,STOCK,NASDAQ,USD`;

      const file = createMockFile(csvContent);

      mockSecuritiesRepository.findExistingSymbols.mockResolvedValue([]);
      mockCurrenciesRepository.findExistingCodes.mockResolvedValue(['USD']);
      mockSecuritiesRepository.createMany.mockResolvedValue([]);

      const result = await service.importFromCsv(file);

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.pricesSyncTriggered).toBe(false);
      expect(securityPricesService.syncHistoricalPrices).not.toHaveBeenCalled();
    });

    it('should reject CSV with missing headers', async () => {
      const csvContent = `name,symbol,type
Apple Inc.,AAPL,STOCK`;

      const file = createMockFile(csvContent);

      await expect(service.importFromCsv(file)).rejects.toThrow(BadRequestException);
      await expect(service.importFromCsv(file)).rejects.toThrow(/Missing required headers/);
    });

    it('should reject empty CSV file', async () => {
      const file = createMockFile('');

      await expect(service.importFromCsv(file)).rejects.toThrow(BadRequestException);
      await expect(service.importFromCsv(file)).rejects.toThrow('CSV file is empty');
    });

    it('should reject CSV with no data rows', async () => {
      const csvContent = `name,symbol,type,exchange,currency`;

      const file = createMockFile(csvContent);

      await expect(service.importFromCsv(file)).rejects.toThrow(BadRequestException);
      await expect(service.importFromCsv(file)).rejects.toThrow('CSV file contains no data rows');
    });

    it('should reject CSV exceeding row limit', async () => {
      const headers = `name,symbol,type,exchange,currency\n`;
      const rows = Array.from({ length: 1001 }, (_, i) => `Security ${i},SYM${i},STOCK,NASDAQ,USD`).join('\n');
      const csvContent = headers + rows;

      const file = createMockFile(csvContent);

      await expect(service.importFromCsv(file)).rejects.toThrow(BadRequestException);
      await expect(service.importFromCsv(file)).rejects.toThrow(/too many rows/);
    });

    it('should handle invalid security type', async () => {
      const csvContent = `name,symbol,type,exchange,currency
Apple Inc.,AAPL,INVALID,NASDAQ,USD`;

      const file = createMockFile(csvContent);

      mockSecuritiesRepository.findExistingSymbols.mockResolvedValue([]);
      mockCurrenciesRepository.findExistingCodes.mockResolvedValue(['USD']);
      mockSecuritiesRepository.createMany.mockResolvedValue([]);

      const result = await service.importFromCsv(file);

      expect(result.total).toBe(1);
      expect(result.errors).toBe(1);
      expect(result.results[0].status).toBe('error');
      expect(result.results[0].reason).toContain('Invalid type');
    });

    it('should handle currency not found', async () => {
      const csvContent = `name,symbol,type,exchange,currency
Apple Inc.,AAPL,STOCK,NASDAQ,XYZ`;

      const file = createMockFile(csvContent);

      mockSecuritiesRepository.findExistingSymbols.mockResolvedValue([]);
      mockCurrenciesRepository.findExistingCodes.mockResolvedValue([]);
      mockSecuritiesRepository.createMany.mockResolvedValue([]);

      const result = await service.importFromCsv(file);

      expect(result.total).toBe(1);
      expect(result.errors).toBe(1);
      expect(result.results[0].status).toBe('error');
      expect(result.results[0].reason).toBe('Currency XYZ not found');
    });

    it('should handle missing required fields', async () => {
      const csvContent = `name,symbol,type,exchange,currency
,AAPL,STOCK,NASDAQ,USD`;

      const file = createMockFile(csvContent);

      mockSecuritiesRepository.findExistingSymbols.mockResolvedValue([]);
      mockCurrenciesRepository.findExistingCodes.mockResolvedValue(['USD']);
      mockSecuritiesRepository.createMany.mockResolvedValue([]);

      const result = await service.importFromCsv(file);

      expect(result.total).toBe(1);
      expect(result.errors).toBe(1);
      expect(result.results[0].status).toBe('error');
      expect(result.results[0].reason).toBe('Missing required fields');
    });

    it('should handle invalid CSV format', async () => {
      const csvContent = `This is not a valid CSV format`;

      const file = createMockFile(csvContent);

      await expect(service.importFromCsv(file)).rejects.toThrow(BadRequestException);
    });

    it('should handle no file provided', async () => {
      await expect(service.importFromCsv(null as unknown as UploadedFile)).rejects.toThrow(BadRequestException);
      await expect(service.importFromCsv(null as unknown as UploadedFile)).rejects.toThrow('No file provided');
    });

    it('should trim whitespace from fields', async () => {
      const csvContent = `name,symbol,type,exchange,currency
  Apple Inc.  ,  AAPL  ,  STOCK  ,  NASDAQ  ,  USD  `;

      const file = createMockFile(csvContent);

      mockSecuritiesRepository.findExistingSymbols.mockResolvedValue([]);
      mockCurrenciesRepository.findExistingCodes.mockResolvedValue(['USD']);
      mockSecuritiesRepository.createMany.mockResolvedValue([
        { id: 'uuid-1', symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK', exchange: 'NASDAQ', currency: 'USD' },
      ]);

      const result = await service.importFromCsv(file);

      expect(result.created).toBe(1);
      expect(securitiesRepository.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Apple Inc.',
            symbol: 'AAPL',
            type: 'STOCK',
            exchange: 'NASDAQ',
            currency: 'USD',
          }),
        ])
      );
    });

    it('should convert symbol to uppercase', async () => {
      const csvContent = `name,symbol,type,exchange,currency
Apple Inc.,aapl,STOCK,NASDAQ,USD`;

      const file = createMockFile(csvContent);

      mockSecuritiesRepository.findExistingSymbols.mockResolvedValue([]);
      mockCurrenciesRepository.findExistingCodes.mockResolvedValue(['USD']);
      mockSecuritiesRepository.createMany.mockResolvedValue([
        { id: 'uuid-1', symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK', exchange: 'NASDAQ', currency: 'USD' },
      ]);

      const result = await service.importFromCsv(file);

      expect(result.created).toBe(1);
      expect(securitiesRepository.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            symbol: 'AAPL',
          }),
        ])
      );
    });

    it('should handle optional ISIN and WKN fields', async () => {
      const csvContent = `name,symbol,type,exchange,currency,isin,wkn
Apple Inc.,AAPL,STOCK,NASDAQ,USD,,`;

      const file = createMockFile(csvContent);

      mockSecuritiesRepository.findExistingSymbols.mockResolvedValue([]);
      mockCurrenciesRepository.findExistingCodes.mockResolvedValue(['USD']);
      mockSecuritiesRepository.createMany.mockResolvedValue([
        { id: 'uuid-1', symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK', exchange: 'NASDAQ', currency: 'USD', isin: undefined, wkn: undefined },
      ]);

      const result = await service.importFromCsv(file);

      expect(result.created).toBe(1);
      expect(securitiesRepository.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            isin: undefined,
            wkn: undefined,
          }),
        ])
      );
    });

    it('should batch load symbols and currencies for performance', async () => {
      const csvContent = `name,symbol,type,exchange,currency
Apple Inc.,AAPL,STOCK,NASDAQ,USD
Microsoft Corp.,MSFT,STOCK,NASDAQ,USD
BMW AG,BMW.DE,STOCK,XETRA,EUR`;

      const file = createMockFile(csvContent);

      mockSecuritiesRepository.findExistingSymbols.mockResolvedValue([]);
      mockCurrenciesRepository.findExistingCodes.mockResolvedValue(['USD', 'EUR']);
      mockSecuritiesRepository.createMany.mockResolvedValue([
        { id: 'uuid-1', symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK', exchange: 'NASDAQ', currency: 'USD' },
        { id: 'uuid-2', symbol: 'MSFT', name: 'Microsoft Corp.', type: 'STOCK', exchange: 'NASDAQ', currency: 'USD' },
        { id: 'uuid-3', symbol: 'BMW.DE', name: 'BMW AG', type: 'STOCK', exchange: 'XETRA', currency: 'EUR' },
      ]);

      await service.importFromCsv(file);

      // Should only load existing symbols once and existing currencies once
      expect(securitiesRepository.findExistingSymbols).toHaveBeenCalledTimes(1);
      expect(currenciesRepository.findExistingCodes).toHaveBeenCalledTimes(1);

      // Should call with all symbols at once
      expect(securitiesRepository.findExistingSymbols).toHaveBeenCalledWith([
        'AAPL',
        'MSFT',
        'BMW.DE',
      ]);

      // Should call with unique currencies
      expect(currenciesRepository.findExistingCodes).toHaveBeenCalledWith([
        'USD',
        'EUR',
      ]);
    });
  });
});
