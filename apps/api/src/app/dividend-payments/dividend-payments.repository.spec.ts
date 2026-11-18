import { Test, TestingModule } from '@nestjs/testing';
import {
  DividendPaymentsRepository,
  CreateDividendPaymentData,
} from './dividend-payments.repository';
import { PrismaService } from '../../prisma.service';

describe('DividendPaymentsRepository', () => {
  let repository: DividendPaymentsRepository;

  const mockPrismaService = {
    dividendPayment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      createManyAndReturn: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const createData: CreateDividendPaymentData = {
    exDate: new Date('2024-01-01T00:00:00.000Z'),
    payoutDate: new Date('2024-01-15T00:00:00.000Z'),
    securityId: 'security-1',
    shares: 10,
    dividendYield: 1.5,
    taxAmount: 0.2,
    originCurrency: 'USD',
    destCurrency: 'EUR',
    conversionRate: 0.9,
    finalPayment: 13.5,
    note: 'Quarterly dividend',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DividendPaymentsRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<DividendPaymentsRepository>(
      DividendPaymentsRepository
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all payments with security ordered by payout date descending', async () => {
      const payments = [{ id: 'payment-1' }];
      mockPrismaService.dividendPayment.findMany.mockResolvedValue(payments);

      const result = await repository.findAll();

      expect(result).toEqual(payments);
      expect(mockPrismaService.dividendPayment.findMany).toHaveBeenCalledWith({
        include: { security: true },
        orderBy: { payoutDate: 'desc' },
      });
    });
  });

  describe('findAllForExport', () => {
    it('should return all payments without relations ordered by ex-date ascending', async () => {
      const payments = [{ id: 'payment-1' }];
      mockPrismaService.dividendPayment.findMany.mockResolvedValue(payments);

      const result = await repository.findAllForExport();

      expect(result).toEqual(payments);
      expect(mockPrismaService.dividendPayment.findMany).toHaveBeenCalledWith({
        orderBy: { exDate: 'asc' },
      });
    });
  });

  describe('findById', () => {
    it('should look up the payment by id without relations', async () => {
      const payment = { id: 'payment-1' };
      mockPrismaService.dividendPayment.findUnique.mockResolvedValue(payment);

      const result = await repository.findById('payment-1');

      expect(result).toEqual(payment);
      expect(mockPrismaService.dividendPayment.findUnique).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
      });
    });

    it('should return null when the payment does not exist', async () => {
      mockPrismaService.dividendPayment.findUnique.mockResolvedValue(null);

      await expect(repository.findById('missing')).resolves.toBeNull();
    });
  });

  describe('findByIdWithSecurity', () => {
    it('should look up the payment by id including its security', async () => {
      const payment = { id: 'payment-1', security: { id: 'security-1' } };
      mockPrismaService.dividendPayment.findUnique.mockResolvedValue(payment);

      const result = await repository.findByIdWithSecurity('payment-1');

      expect(result).toEqual(payment);
      expect(mockPrismaService.dividendPayment.findUnique).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        include: { security: true },
      });
    });

    it('should return null when the payment does not exist', async () => {
      mockPrismaService.dividendPayment.findUnique.mockResolvedValue(null);

      await expect(
        repository.findByIdWithSecurity('missing')
      ).resolves.toBeNull();
    });
  });

  describe('findBySecurityId', () => {
    it('should filter by security id ordered by payout date descending', async () => {
      const payments = [{ id: 'payment-1' }];
      mockPrismaService.dividendPayment.findMany.mockResolvedValue(payments);

      const result = await repository.findBySecurityId('security-1');

      expect(result).toEqual(payments);
      expect(mockPrismaService.dividendPayment.findMany).toHaveBeenCalledWith({
        where: { securityId: 'security-1' },
        include: { security: true },
        orderBy: { payoutDate: 'desc' },
      });
    });
  });

  describe('findByPayoutDateRange', () => {
    it('should filter by inclusive payout date range ordered by payout date descending', async () => {
      const payments = [{ id: 'payment-1' }];
      const startDate = new Date('2024-01-01T00:00:00.000Z');
      const endDate = new Date('2024-01-31T00:00:00.000Z');
      mockPrismaService.dividendPayment.findMany.mockResolvedValue(payments);

      const result = await repository.findByPayoutDateRange(startDate, endDate);

      expect(result).toEqual(payments);
      expect(mockPrismaService.dividendPayment.findMany).toHaveBeenCalledWith({
        where: {
          payoutDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: { security: true },
        orderBy: { payoutDate: 'desc' },
      });
    });
  });

  describe('create', () => {
    it('should create the payment and include its security', async () => {
      const created = { id: 'payment-1', ...createData };
      mockPrismaService.dividendPayment.create.mockResolvedValue(created);

      const result = await repository.create(createData);

      expect(result).toEqual(created);
      expect(mockPrismaService.dividendPayment.create).toHaveBeenCalledWith({
        data: createData,
        include: { security: true },
      });
    });
  });

  describe('createMany', () => {
    it('should insert all payments and select only their ids', async () => {
      const data = [createData, { ...createData, securityId: 'security-2' }];
      const ids = [{ id: 'payment-1' }, { id: 'payment-2' }];
      mockPrismaService.dividendPayment.createManyAndReturn.mockResolvedValue(
        ids
      );

      const result = await repository.createMany(data);

      expect(result).toEqual(ids);
      expect(
        mockPrismaService.dividendPayment.createManyAndReturn
      ).toHaveBeenCalledWith({
        data,
        select: { id: true },
      });
    });
  });

  describe('update', () => {
    it('should update the payment by id and include its security', async () => {
      const data = { shares: 15, note: 'Adjusted payout' };
      const updated = { id: 'payment-1', ...createData, ...data };
      mockPrismaService.dividendPayment.update.mockResolvedValue(updated);

      const result = await repository.update('payment-1', data);

      expect(result).toEqual(updated);
      expect(mockPrismaService.dividendPayment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data,
        include: { security: true },
      });
    });
  });

  describe('delete', () => {
    it('should delete the payment by id and resolve to void', async () => {
      mockPrismaService.dividendPayment.delete.mockResolvedValue({
        id: 'payment-1',
      });

      await expect(repository.delete('payment-1')).resolves.toBeUndefined();

      expect(mockPrismaService.dividendPayment.delete).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
      });
    });
  });
});
