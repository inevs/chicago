import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateDividendPaymentDto } from './dto/create-dividend-payment.dto';
import { UpdateDividendPaymentDto } from './dto/update-dividend-payment.dto';
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

  async updateDividendPayment(
    id: string,
    dto: UpdateDividendPaymentDto
  ): Promise<DividendPayment> {
    // Check if dividend payment exists
    const existing = await this.prisma.dividendPayment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Dividend payment not found');
    }

    // If securityId is being updated, validate that the new security exists
    if (dto.securityId && dto.securityId !== existing.securityId) {
      const security = await this.prisma.security.findUnique({
        where: { id: dto.securityId },
      });

      if (!security) {
        throw new NotFoundException(
          `Security with ID ${dto.securityId} not found`
        );
      }
    }

    // Update dividend payment
    const payment = await this.prisma.dividendPayment.update({
      where: { id },
      data: {
        ...(dto.exDate && { exDate: new Date(dto.exDate) }),
        ...(dto.payoutDate && { payoutDate: new Date(dto.payoutDate) }),
        ...(dto.securityId && { securityId: dto.securityId }),
        ...(dto.shares !== undefined && { shares: dto.shares }),
        ...(dto.dividendYield !== undefined && { dividendYield: dto.dividendYield }),
        ...(dto.taxAmount !== undefined && { taxAmount: dto.taxAmount }),
        ...(dto.originCurrency && { originCurrency: dto.originCurrency }),
        ...(dto.destCurrency && { destCurrency: dto.destCurrency }),
        ...(dto.conversionRate !== undefined && { conversionRate: dto.conversionRate }),
        ...(dto.finalPayment !== undefined && { finalPayment: dto.finalPayment }),
        ...(dto.note !== undefined && { note: dto.note }),
      },
      include: {
        security: true,
      },
    });

    return payment as unknown as DividendPayment;
  }

  async deleteDividendPayment(id: string): Promise<void> {
    // Check if dividend payment exists
    const existing = await this.prisma.dividendPayment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Dividend payment not found');
    }

    // Delete the payment
    await this.prisma.dividendPayment.delete({
      where: { id },
    });
  }
}
