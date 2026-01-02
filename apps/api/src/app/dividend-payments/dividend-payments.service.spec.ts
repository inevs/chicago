import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DividendPaymentsService } from './dividend-payments.service';
import { PrismaService } from '../../prisma.service';

describe('DividendPaymentsService', () => {
  let service: DividendPaymentsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    security: {
      findUnique: jest.fn(),
    },
    currency: {
      findUnique: jest.fn(),
    },
    dividendPayment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const baseCreateDto = {
    exDate: '2024-01-01T00:00:00.000Z',
    payoutDate: '2024-01-15T00:00:00.000Z',
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
        DividendPaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DividendPaymentsService>(DividendPaymentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDividendPayment', () => {
    it('should create a dividend payment when security and currencies exist', async () => {
      const security = {
        id: baseCreateDto.securityId,
        symbol: 'ACME',
      };
      const createdPayment = {
        id: 'payment-1',
        exDate: new Date(baseCreateDto.exDate),
        payoutDate: new Date(baseCreateDto.payoutDate),
        securityId: baseCreateDto.securityId,
        shares: baseCreateDto.shares,
        dividendYield: baseCreateDto.dividendYield,
        taxAmount: baseCreateDto.taxAmount,
        originCurrency: baseCreateDto.originCurrency,
        destCurrency: baseCreateDto.destCurrency,
        conversionRate: baseCreateDto.conversionRate,
        finalPayment: baseCreateDto.finalPayment,
        note: baseCreateDto.note,
        createdAt: new Date(),
        updatedAt: new Date(),
        security,
      };

      mockPrismaService.security.findUnique.mockResolvedValue(security);
      mockPrismaService.currency.findUnique
        .mockResolvedValueOnce({ code: baseCreateDto.originCurrency })
        .mockResolvedValueOnce({ code: baseCreateDto.destCurrency });
      mockPrismaService.dividendPayment.create.mockResolvedValue(
        createdPayment
      );

      const result = await service.createDividendPayment(baseCreateDto);

      expect(result).toEqual(createdPayment);
      expect(prisma.security.findUnique).toHaveBeenCalledWith({
        where: { id: baseCreateDto.securityId },
      });
      expect(prisma.currency.findUnique).toHaveBeenCalledWith({
        where: { code: baseCreateDto.originCurrency },
      });
      expect(prisma.currency.findUnique).toHaveBeenCalledWith({
        where: { code: baseCreateDto.destCurrency },
      });
      expect(prisma.dividendPayment.create).toHaveBeenCalledWith({
        data: {
          exDate: new Date(baseCreateDto.exDate),
          payoutDate: new Date(baseCreateDto.payoutDate),
          securityId: baseCreateDto.securityId,
          shares: baseCreateDto.shares,
          dividendYield: baseCreateDto.dividendYield,
          taxAmount: baseCreateDto.taxAmount,
          originCurrency: baseCreateDto.originCurrency,
          destCurrency: baseCreateDto.destCurrency,
          conversionRate: baseCreateDto.conversionRate,
          finalPayment: baseCreateDto.finalPayment,
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
        service.createDividendPayment(baseCreateDto)
      ).rejects.toThrow(NotFoundException);

      expect(prisma.currency.findUnique).not.toHaveBeenCalled();
      expect(prisma.dividendPayment.create).not.toHaveBeenCalled();
    });

    it('should throw when origin currency does not exist', async () => {
      mockPrismaService.security.findUnique.mockResolvedValue({
        id: baseCreateDto.securityId,
      });
      mockPrismaService.currency.findUnique.mockResolvedValue(null);

      await expect(
        service.createDividendPayment(baseCreateDto)
      ).rejects.toThrow(NotFoundException);

      expect(prisma.dividendPayment.create).not.toHaveBeenCalled();
    });
  });

  describe('getAllDividendPayments', () => {
    it('should return all dividend payments ordered by payout date', async () => {
      const payments = [
        {
          id: 'payment-1',
        },
      ];

      mockPrismaService.dividendPayment.findMany.mockResolvedValue(payments);

      const result = await service.getAllDividendPayments();

      expect(result).toEqual(payments);
      expect(prisma.dividendPayment.findMany).toHaveBeenCalledWith({
        include: {
          security: true,
        },
        orderBy: { payoutDate: 'desc' },
      });
    });
  });

  describe('getDividendPaymentById', () => {
    it('should return a dividend payment when found', async () => {
      const payment = {
        id: 'payment-1',
      };

      mockPrismaService.dividendPayment.findUnique.mockResolvedValue(payment);

      const result = await service.getDividendPaymentById('payment-1');

      expect(result).toEqual(payment);
      expect(prisma.dividendPayment.findUnique).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        include: {
          security: true,
        },
      });
    });

    it('should throw when dividend payment is not found', async () => {
      mockPrismaService.dividendPayment.findUnique.mockResolvedValue(null);

      await expect(
        service.getDividendPaymentById('missing-payment')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDividendPaymentsBySecurityId', () => {
    it('should return payments filtered by security id', async () => {
      const payments = [
        {
          id: 'payment-1',
        },
      ];

      mockPrismaService.dividendPayment.findMany.mockResolvedValue(payments);

      const result = await service.getDividendPaymentsBySecurityId('security-1');

      expect(result).toEqual(payments);
      expect(prisma.dividendPayment.findMany).toHaveBeenCalledWith({
        where: { securityId: 'security-1' },
        include: {
          security: true,
        },
        orderBy: { payoutDate: 'desc' },
      });
    });
  });

  describe('getDividendPaymentsByDateRange', () => {
    it('should return payments within a date range', async () => {
      const payments = [
        {
          id: 'payment-1',
        },
      ];
      const startDate = new Date('2024-01-01T00:00:00.000Z');
      const endDate = new Date('2024-01-31T00:00:00.000Z');

      mockPrismaService.dividendPayment.findMany.mockResolvedValue(payments);

      const result = await service.getDividendPaymentsByDateRange(
        startDate,
        endDate
      );

      expect(result).toEqual(payments);
      expect(prisma.dividendPayment.findMany).toHaveBeenCalledWith({
        where: {
          payoutDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          security: true,
        },
        orderBy: { payoutDate: 'desc' },
      });
    });
  });

  describe('updateDividendPayment', () => {
    it('should update dividend payment when valid changes are provided', async () => {
      const existingPayment = {
        id: 'payment-1',
        securityId: 'security-1',
        originCurrency: 'USD',
        destCurrency: 'EUR',
      };
      const updateDto = {
        exDate: '2024-02-01T00:00:00.000Z',
        payoutDate: '2024-02-15T00:00:00.000Z',
        securityId: 'security-2',
        shares: 15,
        dividendYield: 1.8,
        taxAmount: 0.3,
        originCurrency: 'CHF',
        destCurrency: 'USD',
        conversionRate: 1.1,
        finalPayment: 25,
        note: 'Adjusted payout',
      };
      const updatedPayment = {
        id: 'payment-1',
        ...updateDto,
        exDate: new Date(updateDto.exDate),
        payoutDate: new Date(updateDto.payoutDate),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.dividendPayment.findUnique.mockResolvedValue(
        existingPayment
      );
      mockPrismaService.security.findUnique.mockResolvedValue({
        id: 'security-2',
      });
      mockPrismaService.currency.findUnique
        .mockResolvedValueOnce({ code: updateDto.originCurrency })
        .mockResolvedValueOnce({ code: updateDto.destCurrency });
      mockPrismaService.dividendPayment.update.mockResolvedValue(
        updatedPayment
      );

      const result = await service.updateDividendPayment(
        'payment-1',
        updateDto
      );

      expect(result).toEqual(updatedPayment);
      expect(prisma.security.findUnique).toHaveBeenCalledWith({
        where: { id: updateDto.securityId },
      });
      expect(prisma.currency.findUnique).toHaveBeenCalledWith({
        where: { code: updateDto.originCurrency },
      });
      expect(prisma.currency.findUnique).toHaveBeenCalledWith({
        where: { code: updateDto.destCurrency },
      });
      expect(prisma.dividendPayment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: {
          exDate: new Date(updateDto.exDate),
          payoutDate: new Date(updateDto.payoutDate),
          securityId: updateDto.securityId,
          shares: updateDto.shares,
          dividendYield: updateDto.dividendYield,
          taxAmount: updateDto.taxAmount,
          originCurrency: updateDto.originCurrency,
          destCurrency: updateDto.destCurrency,
          conversionRate: updateDto.conversionRate,
          finalPayment: updateDto.finalPayment,
          note: updateDto.note,
        },
        include: {
          security: true,
        },
      });
    });

    it('should throw when dividend payment does not exist', async () => {
      mockPrismaService.dividendPayment.findUnique.mockResolvedValue(null);

      await expect(
        service.updateDividendPayment('missing-payment', { shares: 5 })
      ).rejects.toThrow(NotFoundException);

      expect(prisma.dividendPayment.update).not.toHaveBeenCalled();
    });

    it('should throw when updated security does not exist', async () => {
      const existingPayment = {
        id: 'payment-1',
        securityId: 'security-1',
        originCurrency: 'USD',
        destCurrency: 'EUR',
      };

      mockPrismaService.dividendPayment.findUnique.mockResolvedValue(
        existingPayment
      );
      mockPrismaService.security.findUnique.mockResolvedValue(null);

      await expect(
        service.updateDividendPayment('payment-1', {
          securityId: 'missing-security',
        })
      ).rejects.toThrow(NotFoundException);

      expect(prisma.dividendPayment.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteDividendPayment', () => {
    it('should delete dividend payment when it exists', async () => {
      mockPrismaService.dividendPayment.findUnique.mockResolvedValue({
        id: 'payment-1',
      });

      await service.deleteDividendPayment('payment-1');

      expect(prisma.dividendPayment.delete).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
      });
    });

    it('should throw when dividend payment does not exist', async () => {
      mockPrismaService.dividendPayment.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteDividendPayment('missing-payment')
      ).rejects.toThrow(NotFoundException);

      expect(prisma.dividendPayment.delete).not.toHaveBeenCalled();
    });
  });
});
