import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CURRENCY_ERRORS } from '@dividends/shared';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import type { Currency } from '../../../generated/prisma/client';

@Injectable()
export class CurrenciesService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Currency[]> {
    return this.prisma.currency.findMany({
      orderBy: {
        code: 'asc',
      },
    });
  }

  async create(createCurrencyDto: CreateCurrencyDto): Promise<Currency> {
    // Normalize the currency code (uppercase and trim)
    // Note: This is also done by the @Transform decorator in the DTO,
    // but we ensure it here as well for additional safety
    const normalizedCode = createCurrencyDto.code.toUpperCase().trim();

    // Check if currency with this code already exists
    const existing = await this.prisma.currency.findUnique({
      where: { code: normalizedCode },
    });

    if (existing) {
      throw new ConflictException(
        CURRENCY_ERRORS.ALREADY_EXISTS(normalizedCode)
      );
    }

    return this.prisma.currency.create({
      data: {
        code: normalizedCode,
        name: createCurrencyDto.name.trim(),
      },
    });
  }

  async getDefaultCurrency(): Promise<Currency | null> {
    const defaultCode = process.env.DEFAULT_CURRENCY || 'EUR';

    return this.prisma.currency.findUnique({
      where: { code: defaultCode },
    });
  }
}
