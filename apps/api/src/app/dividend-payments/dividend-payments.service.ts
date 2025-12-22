import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateDividendPaymentDto } from './dto/create-dividend-payment.dto';
import { DividendPayment } from '@dividends/shared';

@Injectable()
export class DividendPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createDividendPayment(
    dto: CreateDividendPaymentDto
  ): Promise<DividendPayment> {
    // Validate that security exists
    const security = await this.prisma.security.findUnique({
      where: { id: dto.securityId },
    });

    if (!security) {
      throw new NotFoundException(
        `Security with ID ${dto.securityId} not found`
      );
    }

    // Create dividend payment
    const payment = await this.prisma.dividendPayment.create({
      data: {
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
      },
      include: {
        security: true,
      },
    });

    return payment as unknown as DividendPayment;
  }

  async getAllDividendPayments(): Promise<DividendPayment[]> {
    const payments = await this.prisma.dividendPayment.findMany({
      include: {
        security: true,
      },
      orderBy: { payoutDate: 'desc' },
    });

    return payments as unknown as DividendPayment[];
  }

  async getDividendPaymentById(id: string): Promise<DividendPayment> {
    const payment = await this.prisma.dividendPayment.findUnique({
      where: { id },
      include: {
        security: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Dividend payment not found');
    }

    return payment as unknown as DividendPayment;
  }

  async getDividendPaymentsBySecurityId(
    securityId: string
  ): Promise<DividendPayment[]> {
    const payments = await this.prisma.dividendPayment.findMany({
      where: { securityId },
      include: {
        security: true,
      },
      orderBy: { payoutDate: 'desc' },
    });

    return payments as unknown as DividendPayment[];
  }

  async getDividendPaymentsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<DividendPayment[]> {
    const payments = await this.prisma.dividendPayment.findMany({
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

    return payments as unknown as DividendPayment[];
  }
}
