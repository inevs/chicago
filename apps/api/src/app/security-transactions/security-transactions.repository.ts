import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import type {
  Prisma,
  SecurityTransaction,
  TransactionType,
} from '../../../generated/prisma/client';

export type SecurityTransactionWithSecurity = Prisma.SecurityTransactionGetPayload<{
  include: { security: true };
}>;

export interface CreateSecurityTransactionData {
  date: Date;
  type: TransactionType | `${TransactionType}`;
  securityId: string;
  quantity: number;
  pricePerShare: number;
  fees: number;
  currency: string;
  exchangeRate: number;
  totalValue: number;
  note?: string | null;
}

export type UpdateSecurityTransactionData = Partial<CreateSecurityTransactionData>;

const includeSecurity = { security: true } as const;

/**
 * Data access for security transactions. Encapsulates all Prisma queries on
 * the `security_transactions` table so that services do not depend on the ORM
 * directly.
 */
@Injectable()
export class SecurityTransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** All transactions including their security, newest first. */
  findAll(): Promise<SecurityTransactionWithSecurity[]> {
    return this.findManyWithSecurity({});
  }

  /** All transactions without relations, ordered by date (ascending), for data export. */
  findAllForExport(): Promise<SecurityTransaction[]> {
    return this.prisma.securityTransaction.findMany({
      orderBy: { date: 'asc' },
    });
  }

  findById(id: string): Promise<SecurityTransaction | null> {
    return this.prisma.securityTransaction.findUnique({
      where: { id },
    });
  }

  findByIdWithSecurity(id: string): Promise<SecurityTransactionWithSecurity | null> {
    return this.prisma.securityTransaction.findUnique({
      where: { id },
      include: includeSecurity,
    });
  }

  findBySecurityId(securityId: string): Promise<SecurityTransactionWithSecurity[]> {
    return this.findManyWithSecurity({ securityId });
  }

  findByType(
    type: TransactionType | `${TransactionType}`
  ): Promise<SecurityTransactionWithSecurity[]> {
    return this.findManyWithSecurity({ type });
  }

  /** Transactions dated within [startDate, endDate], newest first. */
  findByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<SecurityTransactionWithSecurity[]> {
    return this.findManyWithSecurity({
      date: {
        gte: startDate,
        lte: endDate,
      },
    });
  }

  create(data: CreateSecurityTransactionData): Promise<SecurityTransactionWithSecurity> {
    return this.prisma.securityTransaction.create({
      data,
      include: includeSecurity,
    });
  }

  /** Inserts the given transactions and returns the created rows in insertion order. */
  createMany(data: CreateSecurityTransactionData[]): Promise<SecurityTransaction[]> {
    return this.prisma.securityTransaction.createManyAndReturn({
      data,
    });
  }

  update(
    id: string,
    data: UpdateSecurityTransactionData
  ): Promise<SecurityTransactionWithSecurity> {
    return this.prisma.securityTransaction.update({
      where: { id },
      data,
      include: includeSecurity,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.securityTransaction.delete({
      where: { id },
    });
  }

  private findManyWithSecurity(
    where: Prisma.SecurityTransactionWhereInput
  ): Promise<SecurityTransactionWithSecurity[]> {
    return this.prisma.securityTransaction.findMany({
      where,
      include: includeSecurity,
      orderBy: { date: 'desc' },
    });
  }
}
