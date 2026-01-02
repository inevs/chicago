import { Test, TestingModule } from '@nestjs/testing';
import { DividendPaymentsController } from './dividend-payments.controller';
import { DividendPaymentsService } from './dividend-payments.service';

describe('DividendPaymentsController', () => {
  let controller: DividendPaymentsController;
  let service: DividendPaymentsService;

  const mockDividendPaymentsService = {
    createDividendPayment: jest.fn(),
    getAllDividendPayments: jest.fn(),
    getDividendPaymentById: jest.fn(),
    getDividendPaymentsBySecurityId: jest.fn(),
    getDividendPaymentsByDateRange: jest.fn(),
    updateDividendPayment: jest.fn(),
    deleteDividendPayment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DividendPaymentsController],
      providers: [
        {
          provide: DividendPaymentsService,
          useValue: mockDividendPaymentsService,
        },
      ],
    }).compile();

    controller = module.get<DividendPaymentsController>(
      DividendPaymentsController
    );
    service = module.get<DividendPaymentsService>(DividendPaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and return a dividend payment', async () => {
      const dto = {
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

      const createdPayment = {
        id: 'payment-1',
        exDate: new Date(dto.exDate),
        payoutDate: new Date(dto.payoutDate),
        securityId: dto.securityId,
        shares: dto.shares,
        dividendYield: dto.dividendYield,
        taxAmount: dto.taxAmount,
        originCurrency: dto.originCurrency,
        destCurrency: dto.destCurrency,
        conversionRate: dto.conversionRate,
        finalPayment: dto.finalPayment,
        note: dto.note,
        createdAt: new Date(),
        updatedAt: new Date(),
        security: {
          id: 'security-1',
          name: 'Test Security',
          symbol: 'TST',
        },
      };

      mockDividendPaymentsService.createDividendPayment.mockResolvedValue(
        createdPayment
      );

      const result = await controller.create(dto);

      expect(result).toEqual(createdPayment);
      expect(service.createDividendPayment).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all dividend payments when no filters are provided', async () => {
      const payments = [
        {
          id: 'payment-1',
          exDate: new Date('2024-01-01'),
          payoutDate: new Date('2024-01-15'),
          securityId: 'security-1',
          shares: 10,
          dividendYield: 1.5,
          taxAmount: 0.2,
          originCurrency: 'USD',
          destCurrency: 'EUR',
          conversionRate: 0.9,
          finalPayment: 13.5,
          note: 'Quarterly dividend',
          createdAt: new Date(),
          updatedAt: new Date(),
          security: {
            id: 'security-1',
            name: 'Test Security',
            symbol: 'TST',
          },
        },
      ];

      mockDividendPaymentsService.getAllDividendPayments.mockResolvedValue(
        payments
      );

      const result = await controller.findAll();

      expect(result).toEqual(payments);
      expect(service.getAllDividendPayments).toHaveBeenCalled();
      expect(service.getDividendPaymentsBySecurityId).not.toHaveBeenCalled();
      expect(service.getDividendPaymentsByDateRange).not.toHaveBeenCalled();
    });

    it('should filter by security ID when provided', async () => {
      const payments = [
        {
          id: 'payment-1',
          securityId: 'security-1',
        },
      ];

      mockDividendPaymentsService.getDividendPaymentsBySecurityId.mockResolvedValue(
        payments
      );

      const result = await controller.findAll('security-1');

      expect(result).toEqual(payments);
      expect(service.getDividendPaymentsBySecurityId).toHaveBeenCalledWith(
        'security-1'
      );
      expect(service.getAllDividendPayments).not.toHaveBeenCalled();
      expect(service.getDividendPaymentsByDateRange).not.toHaveBeenCalled();
    });

    it('should filter by date range when provided', async () => {
      const payments = [
        {
          id: 'payment-1',
          payoutDate: new Date('2024-01-15'),
        },
      ];
      const startDate = '2024-01-01T00:00:00.000Z';
      const endDate = '2024-01-31T23:59:59.999Z';

      mockDividendPaymentsService.getDividendPaymentsByDateRange.mockResolvedValue(
        payments
      );

      const result = await controller.findAll(undefined, startDate, endDate);

      expect(result).toEqual(payments);
      expect(service.getDividendPaymentsByDateRange).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate)
      );
      expect(service.getAllDividendPayments).not.toHaveBeenCalled();
      expect(service.getDividendPaymentsBySecurityId).not.toHaveBeenCalled();
    });

    it('should return empty array when no payments exist', async () => {
      mockDividendPaymentsService.getAllDividendPayments.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a dividend payment by ID', async () => {
      const payment = {
        id: 'payment-1',
        exDate: new Date('2024-01-01'),
        payoutDate: new Date('2024-01-15'),
        securityId: 'security-1',
        shares: 10,
        dividendYield: 1.5,
        taxAmount: 0.2,
        originCurrency: 'USD',
        destCurrency: 'EUR',
        conversionRate: 0.9,
        finalPayment: 13.5,
        note: 'Quarterly dividend',
        createdAt: new Date(),
        updatedAt: new Date(),
        security: {
          id: 'security-1',
          name: 'Test Security',
          symbol: 'TST',
        },
      };

      mockDividendPaymentsService.getDividendPaymentById.mockResolvedValue(
        payment
      );

      const result = await controller.findOne('payment-1');

      expect(result).toEqual(payment);
      expect(service.getDividendPaymentById).toHaveBeenCalledWith('payment-1');
    });
  });

  describe('update', () => {
    it('should update and return a dividend payment', async () => {
      const updateDto = {
        shares: 15,
        dividendYield: 1.8,
        note: 'Updated note',
      };

      const updatedPayment = {
        id: 'payment-1',
        exDate: new Date('2024-01-01'),
        payoutDate: new Date('2024-01-15'),
        securityId: 'security-1',
        shares: 15,
        dividendYield: 1.8,
        taxAmount: 0.2,
        originCurrency: 'USD',
        destCurrency: 'EUR',
        conversionRate: 0.9,
        finalPayment: 16.2,
        note: 'Updated note',
        createdAt: new Date(),
        updatedAt: new Date(),
        security: {
          id: 'security-1',
          name: 'Test Security',
          symbol: 'TST',
        },
      };

      mockDividendPaymentsService.updateDividendPayment.mockResolvedValue(
        updatedPayment
      );

      const result = await controller.update('payment-1', updateDto);

      expect(result).toEqual(updatedPayment);
      expect(service.updateDividendPayment).toHaveBeenCalledWith(
        'payment-1',
        updateDto
      );
    });
  });

  describe('remove', () => {
    it('should delete a dividend payment', async () => {
      mockDividendPaymentsService.deleteDividendPayment.mockResolvedValue(
        undefined
      );

      await controller.remove('payment-1');

      expect(service.deleteDividendPayment).toHaveBeenCalledWith('payment-1');
    });
  });
});
