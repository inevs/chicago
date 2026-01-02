import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateSecurityTransactionDto } from './dto/create-security-transaction.dto';
import { UpdateSecurityTransactionDto } from './dto/update-security-transaction.dto';
import { SecurityTransaction } from '@dividends/shared';

@Injectable()
export class SecurityTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSecurityTransaction(
    dto: CreateSecurityTransactionDto
  ): Promise<SecurityTransaction> {
    // Validate that security exists
    const security = await this.prisma.security.findUnique({
      where: { id: dto.securityId },
    });

    if (!security) {
      throw new NotFoundException(
        `Security with ID ${dto.securityId} not found`
      );
    }

    await this.ensureCurrencyExists(dto.currency);

    // Create security transaction
    const transaction = await this.prisma.securityTransaction.create({
      data: {
        date: new Date(dto.date),
        type: dto.type,
        securityId: dto.securityId,
        quantity: dto.quantity,
        pricePerShare: dto.pricePerShare,
        fees: dto.fees,
        currency: dto.currency,
        exchangeRate: dto.exchangeRate,
        totalValue: dto.totalValue,
        note: dto.note,
      },
      include: {
        security: true,
      },
    });

    return transaction as unknown as SecurityTransaction;
  }

  async getAllSecurityTransactions(): Promise<SecurityTransaction[]> {
    const transactions = await this.prisma.securityTransaction.findMany({
      include: {
        security: true,
      },
      orderBy: { date: 'desc' },
    });

    return transactions as unknown as SecurityTransaction[];
  }

  async getSecurityTransactionById(id: string): Promise<SecurityTransaction> {
    const transaction = await this.prisma.securityTransaction.findUnique({
      where: { id },
      include: {
        security: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Security transaction not found');
    }

    return transaction as unknown as SecurityTransaction;
  }

  async getSecurityTransactionsBySecurityId(
    securityId: string
  ): Promise<SecurityTransaction[]> {
    const transactions = await this.prisma.securityTransaction.findMany({
      where: { securityId },
      include: {
        security: true,
      },
      orderBy: { date: 'desc' },
    });

    return transactions as unknown as SecurityTransaction[];
  }

  async getSecurityTransactionsByType(
    type: 'BUY' | 'SELL'
  ): Promise<SecurityTransaction[]> {
    const transactions = await this.prisma.securityTransaction.findMany({
      where: { type },
      include: {
        security: true,
      },
      orderBy: { date: 'desc' },
    });

    return transactions as unknown as SecurityTransaction[];
  }

  async getSecurityTransactionsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<SecurityTransaction[]> {
    const transactions = await this.prisma.securityTransaction.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        security: true,
      },
      orderBy: { date: 'desc' },
    });

    return transactions as unknown as SecurityTransaction[];
  }

  async updateSecurityTransaction(
    id: string,
    dto: UpdateSecurityTransactionDto
  ): Promise<SecurityTransaction> {
    // Check if security transaction exists
    const existing = await this.prisma.securityTransaction.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Security transaction not found');
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

    if (dto.currency && dto.currency !== existing.currency) {
      await this.ensureCurrencyExists(dto.currency);
    }

    // Update security transaction
    const transaction = await this.prisma.securityTransaction.update({
      where: { id },
      data: {
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.type && { type: dto.type }),
        ...(dto.securityId &&
          dto.securityId !== existing.securityId && {
            security: { connect: { id: dto.securityId } },
          }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.pricePerShare !== undefined && { pricePerShare: dto.pricePerShare }),
        ...(dto.fees !== undefined && { fees: dto.fees }),
        ...(dto.currency &&
          dto.currency !== existing.currency && {
            currencyRef: { connect: { code: dto.currency } },
          }),
        ...(dto.exchangeRate !== undefined && { exchangeRate: dto.exchangeRate }),
        ...(dto.totalValue !== undefined && { totalValue: dto.totalValue }),
        ...(dto.note !== undefined && { note: dto.note }),
      },
      include: {
        security: true,
      },
    });

    return transaction as unknown as SecurityTransaction;
  }

  async deleteSecurityTransaction(id: string): Promise<void> {
    // Check if security transaction exists
    const existing = await this.prisma.securityTransaction.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Security transaction not found');
    }

    // Delete the transaction
    await this.prisma.securityTransaction.delete({
      where: { id },
    });
  }

  private async ensureCurrencyExists(code: string): Promise<void> {
    const currency = await this.prisma.currency.findUnique({
      where: { code },
    });

    if (!currency) {
      throw new NotFoundException(`Currency with code ${code} not found`);
    }
  }
}
