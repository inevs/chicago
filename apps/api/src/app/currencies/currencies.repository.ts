import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import type { Currency } from '../../../generated/prisma/client';
import { translateDuplicateError } from '../database/duplicate-record.error';

export interface CreateCurrencyData {
  code: string;
  name: string;
}

/**
 * Data access for currencies. Encapsulates all Prisma queries on the
 * `currencies` table so that services do not depend on the ORM directly.
 */
@Injectable()
export class CurrenciesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** All currencies ordered by code (ascending). */
  findAll(): Promise<Currency[]> {
    return this.prisma.currency.findMany({
      orderBy: { code: 'asc' },
    });
  }

  findByCode(code: string): Promise<Currency | null> {
    return this.prisma.currency.findUnique({
      where: { code },
    });
  }

  async existsByCode(code: string): Promise<boolean> {
    const currency = await this.findByCode(code);
    return currency !== null;
  }

  /** Returns the subset of the given codes that exist in the database. */
  async findExistingCodes(codes: string[]): Promise<string[]> {
    const currencies = await this.prisma.currency.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    });
    return currencies.map((currency) => currency.code);
  }

  /** All currency codes except the given one. */
  async findCodesExcept(excludedCode: string): Promise<string[]> {
    const currencies = await this.prisma.currency.findMany({
      where: { code: { not: excludedCode } },
      select: { code: true },
    });
    return currencies.map((currency) => currency.code);
  }

  /** @throws DuplicateRecordError if the code already exists. */
  create(data: CreateCurrencyData): Promise<Currency> {
    return translateDuplicateError(() =>
      this.prisma.currency.create({ data })
    );
  }
}
