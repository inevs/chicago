import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DividendPaymentsService } from './dividend-payments.service';
import { DividendPaymentsRepository } from './dividend-payments.repository';
import { SecuritiesRepository } from '../securities/securities.repository';
import { CurrenciesRepository } from '../currencies/currencies.repository';

describe('DividendPaymentsService', () => {
  let service: DividendPaymentsService;

  const mockDividendPaymentsRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByIdWithSecurity: jest.fn(),
    findBySecurityId: jest.fn(),
    findByPayoutDateRange: jest.fn(),
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
          provide: DividendPaymentsRepository,
          useValue: mockDividendPaymentsRepository,
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

    service = module.get<DividendPaymentsService>(DividendPaymentsService);
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

      mockSecuritiesRepository.existsById.mockResolvedValue(true);
      mockCurrenciesRepository.existsByCode.mockResolvedValue(true);
      mockDividendPaymentsRepository.create.mockResolvedValue(createdPayment);

      const result = await service.createDividendPayment(baseCreateDto);

      expect(result).toEqual(createdPayment);
      expect(mockSecuritiesRepository.existsById).toHaveBeenCalledWith(
        baseCreateDto.securityId
      );
      expect(mockCurrenciesRepository.existsByCode).toHaveBeenCalledWith(
        baseCreateDto.originCurrency
      );
      expect(mockCurrenciesRepository.existsByCode).toHaveBeenCalledWith(
        baseCreateDto.destCurrency
      );
      expect(mockDividendPaymentsRepository.create).toHaveBeenCalledWith({
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
      });
    });

    it('should throw when security does not exist', async () => {
      mockSecuritiesRepository.existsById.mockResolvedValue(false);

      await expect(
        service.createDividendPayment(baseCreateDto)
      ).rejects.toThrow(NotFoundException);

      expect(mockCurrenciesRepository.existsByCode).not.toHaveBeenCalled();
      expect(mockDividendPaymentsRepository.create).not.toHaveBeenCalled();
    });

    it('should throw when origin currency does not exist', async () => {
      mockSecuritiesRepository.existsById.mockResolvedValue(true);
      mockCurrenciesRepository.existsByCode.mockResolvedValue(false);

      await expect(
        service.createDividendPayment(baseCreateDto)
      ).rejects.toThrow(NotFoundException);

      expect(mockCurrenciesRepository.existsByCode).toHaveBeenCalledWith(
        baseCreateDto.originCurrency
      );
      expect(mockDividendPaymentsRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getAllDividendPayments', () => {
    it('should return all dividend payments ordered by payout date', async () => {
      const payments = [
        {
          id: 'payment-1',
        },
      ];

      mockDividendPaymentsRepository.findAll.mockResolvedValue(payments);

      const result = await service.getAllDividendPayments();

      expect(result).toEqual(payments);
      expect(mockDividendPaymentsRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getDividendPaymentById', () => {
    it('should return a dividend payment when found', async () => {
      const payment = {
        id: 'payment-1',
      };

      mockDividendPaymentsRepository.findByIdWithSecurity.mockResolvedValue(
        payment
      );

      const result = await service.getDividendPaymentById('payment-1');

      expect(result).toEqual(payment);
      expect(
        mockDividendPaymentsRepository.findByIdWithSecurity
      ).toHaveBeenCalledWith('payment-1');
    });

    it('should throw when dividend payment is not found', async () => {
      mockDividendPaymentsRepository.findByIdWithSecurity.mockResolvedValue(
        null
      );

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

      mockDividendPaymentsRepository.findBySecurityId.mockResolvedValue(
        payments
      );

      const result = await service.getDividendPaymentsBySecurityId('security-1');

      expect(result).toEqual(payments);
      expect(
        mockDividendPaymentsRepository.findBySecurityId
      ).toHaveBeenCalledWith('security-1');
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

      mockDividendPaymentsRepository.findByPayoutDateRange.mockResolvedValue(
        payments
      );

      const result = await service.getDividendPaymentsByDateRange(
        startDate,
        endDate
      );

      expect(result).toEqual(payments);
      expect(
        mockDividendPaymentsRepository.findByPayoutDateRange
      ).toHaveBeenCalledWith(startDate, endDate);
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

      mockDividendPaymentsRepository.findById.mockResolvedValue(
        existingPayment
      );
      mockSecuritiesRepository.existsById.mockResolvedValue(true);
      mockCurrenciesRepository.existsByCode.mockResolvedValue(true);
      mockDividendPaymentsRepository.update.mockResolvedValue(updatedPayment);

      const result = await service.updateDividendPayment(
        'payment-1',
        updateDto
      );

      expect(result).toEqual(updatedPayment);
      expect(mockDividendPaymentsRepository.findById).toHaveBeenCalledWith(
        'payment-1'
      );
      expect(mockSecuritiesRepository.existsById).toHaveBeenCalledWith(
        updateDto.securityId
      );
      expect(mockCurrenciesRepository.existsByCode).toHaveBeenCalledWith(
        updateDto.originCurrency
      );
      expect(mockCurrenciesRepository.existsByCode).toHaveBeenCalledWith(
        updateDto.destCurrency
      );
      expect(mockDividendPaymentsRepository.update).toHaveBeenCalledWith(
        'payment-1',
        {
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
        }
      );
    });

    it('should throw when dividend payment does not exist', async () => {
      mockDividendPaymentsRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateDividendPayment('missing-payment', { shares: 5 })
      ).rejects.toThrow(NotFoundException);

      expect(mockDividendPaymentsRepository.update).not.toHaveBeenCalled();
    });

    it('should throw when updated security does not exist', async () => {
      const existingPayment = {
        id: 'payment-1',
        securityId: 'security-1',
        originCurrency: 'USD',
        destCurrency: 'EUR',
      };

      mockDividendPaymentsRepository.findById.mockResolvedValue(
        existingPayment
      );
      mockSecuritiesRepository.existsById.mockResolvedValue(false);

      await expect(
        service.updateDividendPayment('payment-1', {
          securityId: 'missing-security',
        })
      ).rejects.toThrow(NotFoundException);

      expect(mockSecuritiesRepository.existsById).toHaveBeenCalledWith(
        'missing-security'
      );
      expect(mockDividendPaymentsRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteDividendPayment', () => {
    it('should delete dividend payment when it exists', async () => {
      mockDividendPaymentsRepository.findById.mockResolvedValue({
        id: 'payment-1',
      });

      await service.deleteDividendPayment('payment-1');

      expect(mockDividendPaymentsRepository.delete).toHaveBeenCalledWith(
        'payment-1'
      );
    });

    it('should throw when dividend payment does not exist', async () => {
      mockDividendPaymentsRepository.findById.mockResolvedValue(null);

      await expect(
        service.deleteDividendPayment('missing-payment')
      ).rejects.toThrow(NotFoundException);

      expect(mockDividendPaymentsRepository.delete).not.toHaveBeenCalled();
    });
  });
});
