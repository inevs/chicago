import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import type { Security, SecurityType } from '../../../generated/prisma/client';

export interface CreateSecurityData {
  name: string;
  symbol: string;
  type: SecurityType | `${SecurityType}`;
  exchange: string;
  currency: string;
  isin?: string | null;
  wkn?: string | null;
}

export type UpdateSecurityData = Partial<CreateSecurityData>;

/**
 * Data access for securities. Encapsulates all Prisma queries on the
 * `securities` table so that services do not depend on the ORM directly.
 */
@Injectable()
export class SecuritiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** All securities ordered by symbol (ascending). */
  findAll(): Promise<Security[]> {
    return this.prisma.security.findMany({
      orderBy: { symbol: 'asc' },
    });
  }

  /** A single security by ID, or all securities if no ID is given (ordered by symbol). */
  findAllOrById(id?: string): Promise<Security[]> {
    return this.prisma.security.findMany({
      where: id ? { id } : undefined,
      orderBy: { symbol: 'asc' },
    });
  }

  findById(id: string): Promise<Security | null> {
    return this.prisma.security.findUnique({
      where: { id },
    });
  }

  async existsById(id: string): Promise<boolean> {
    const security = await this.findById(id);
    return security !== null;
  }

  findBySymbol(symbol: string): Promise<Security | null> {
    return this.prisma.security.findUnique({
      where: { symbol },
    });
  }

  /** Returns the subset of the given symbols that already exist. */
  async findExistingSymbols(symbols: string[]): Promise<string[]> {
    const securities = await this.prisma.security.findMany({
      where: { symbol: { in: symbols } },
      select: { symbol: true },
    });
    return securities.map((security) => security.symbol);
  }

  /** IDs and ISINs of the securities with one of the given ISINs. */
  findIdsByIsins(isins: string[]): Promise<Array<{ id: string; isin: string | null }>> {
    return this.prisma.security.findMany({
      where: { isin: { in: isins } },
      select: { id: true, isin: true },
    });
  }

  /**
   * Case-insensitive search in name, symbol, ISIN and WKN,
   * ordered by symbol and limited to `limit` results.
   */
  search(term: string, limit: number): Promise<Security[]> {
    return this.prisma.security.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { symbol: { contains: term, mode: 'insensitive' } },
          { isin: { contains: term, mode: 'insensitive' } },
          { wkn: { contains: term, mode: 'insensitive' } },
        ],
      },
      orderBy: { symbol: 'asc' },
      take: limit,
    });
  }

  create(data: CreateSecurityData): Promise<Security> {
    return this.prisma.security.create({ data });
  }

  /** Inserts the given securities, skipping duplicates, and returns the created rows. */
  createMany(data: CreateSecurityData[]): Promise<Security[]> {
    return this.prisma.security.createManyAndReturn({
      data,
      skipDuplicates: true,
    });
  }

  update(id: string, data: UpdateSecurityData): Promise<Security> {
    return this.prisma.security.update({
      where: { id },
      data,
    });
  }
}
