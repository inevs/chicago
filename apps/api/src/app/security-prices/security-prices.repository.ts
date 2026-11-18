import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import type { SecurityPrice } from '../../../generated/prisma/client';

export interface CreateSecurityPriceData {
  id: string;
  securityId: string;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  currency: string;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
}

type DecimalLike = { toNumber: () => number } | number;

/** Raw row of the latest-price query; numeric columns may be Prisma Decimals. */
export interface LatestSecurityPriceRow {
  id: string;
  securityId: string;
  date: Date;
  open: DecimalLike;
  high: DecimalLike;
  low: DecimalLike;
  close: DecimalLike;
  volume: DecimalLike | null;
  currency: string;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data access for security prices. Encapsulates all Prisma queries on the
 * `security_prices` table so that services do not depend on the ORM directly.
 */
@Injectable()
export class SecurityPricesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** All prices ordered by date (ascending), for data export. */
  findAllForExport(): Promise<SecurityPrice[]> {
    return this.prisma.securityPrice.findMany({
      orderBy: { date: 'asc' },
    });
  }

  /**
   * The latest price of every security.
   *
   * Uses PostgreSQL `DISTINCT ON` to avoid an N+1 query. `$queryRaw` is safe
   * here because the query is a template literal without interpolated user
   * input and all table and column names are hardcoded.
   */
  findLatestPerSecurity(): Promise<LatestSecurityPriceRow[]> {
    return this.prisma.$queryRaw<LatestSecurityPriceRow[]>`
      SELECT DISTINCT ON ("securityId")
        id,
        "securityId",
        date,
        open,
        high,
        low,
        close,
        volume,
        currency,
        provider,
        "createdAt",
        "updatedAt"
      FROM security_prices
      ORDER BY "securityId", date DESC
    `;
  }

  /** The date of the latest price of the given security, or null if it has none. */
  async findLatestDateBySecurityId(securityId: string): Promise<Date | null> {
    const result = await this.prisma.securityPrice.findFirst({
      where: { securityId },
      orderBy: { date: 'desc' },
      select: { date: true },
    });
    return result?.date || null;
  }

  /**
   * The earliest of the latest price dates across all securities,
   * or null if no prices exist.
   */
  async findEarliestLatestDate(): Promise<Date | null> {
    const result = await this.prisma.$queryRaw<Array<{ min_date: Date | null }>>`
      SELECT MIN(max_date) as min_date
      FROM (
        SELECT MAX(date) as max_date
        FROM security_prices
        GROUP BY "securityId"
      ) latest_dates
    `;
    return result[0]?.min_date || null;
  }

  /** Inserts the given prices, skipping duplicates, and returns the number of inserted rows. */
  async createMany(data: CreateSecurityPriceData[]): Promise<number> {
    const result = await this.prisma.securityPrice.createMany({
      data,
      skipDuplicates: true,
    });
    return result.count;
  }
}
