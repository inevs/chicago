import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import type { DividendPayment, Prisma } from '../../../generated/prisma/client';

export type DividendPaymentWithSecurity = Prisma.DividendPaymentGetPayload<{
  include: { security: true };
}>;

export interface CreateDividendPaymentData {
  exDate: Date;
  payoutDate: Date;
  securityId: string;
  shares: number;
  dividendYield: number;
  taxAmount: number;
  originCurrency: string;
  destCurrency: string;
  conversionRate: number;
  finalPayment: number;
  note?: string | null;
}

export type UpdateDividendPaymentData = Partial<CreateDividendPaymentData>;

const includeSecurity = { security: true } as const;

/**
 * Data access for dividend payments. Encapsulates all Prisma queries on the
 * `dividend_payments` table so that services do not depend on the ORM directly.
 */
@Injectable()
export class DividendPaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** All payments including their security, newest payout first. */
  findAll(): Promise<DividendPaymentWithSecurity[]> {
    return this.prisma.dividendPayment.findMany({
      include: includeSecurity,
      orderBy: { payoutDate: 'desc' },
    });
  }

  /** All payments without relations, ordered by ex-date (ascending), for data export. */
  findAllForExport(): Promise<DividendPayment[]> {
    return this.prisma.dividendPayment.findMany({
      orderBy: { exDate: 'asc' },
    });
  }

  findById(id: string): Promise<DividendPayment | null> {
    return this.prisma.dividendPayment.findUnique({
      where: { id },
    });
  }

  findByIdWithSecurity(id: string): Promise<DividendPaymentWithSecurity | null> {
    return this.prisma.dividendPayment.findUnique({
      where: { id },
      include: includeSecurity,
    });
  }

  findBySecurityId(securityId: string): Promise<DividendPaymentWithSecurity[]> {
    return this.prisma.dividendPayment.findMany({
      where: { securityId },
      include: includeSecurity,
      orderBy: { payoutDate: 'desc' },
    });
  }

  /** Payments with a payout date within [startDate, endDate], newest first. */
  findByPayoutDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<DividendPaymentWithSecurity[]> {
    return this.prisma.dividendPayment.findMany({
      where: {
        payoutDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: includeSecurity,
      orderBy: { payoutDate: 'desc' },
    });
  }

  create(data: CreateDividendPaymentData): Promise<DividendPaymentWithSecurity> {
    return this.prisma.dividendPayment.create({
      data,
      include: includeSecurity,
    });
  }

  /** Inserts the given payments and returns the IDs in insertion order. */
  createMany(data: CreateDividendPaymentData[]): Promise<Array<{ id: string }>> {
    return this.prisma.dividendPayment.createManyAndReturn({
      data,
      select: { id: true },
    });
  }

  update(
    id: string,
    data: UpdateDividendPaymentData
  ): Promise<DividendPaymentWithSecurity> {
    return this.prisma.dividendPayment.update({
      where: { id },
      data,
      include: includeSecurity,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.dividendPayment.delete({
      where: { id },
    });
  }
}
