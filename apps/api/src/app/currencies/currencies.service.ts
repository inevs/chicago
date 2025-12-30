import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
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
    // Check if currency with this code already exists
    const existing = await this.prisma.currency.findUnique({
      where: { code: createCurrencyDto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Currency with code ${createCurrencyDto.code} already exists`
      );
    }

    return this.prisma.currency.create({
      data: createCurrencyDto,
    });
  }

  async getDefaultCurrency(): Promise<Currency | null> {
    const defaultCode = process.env.DEFAULT_CURRENCY || 'EUR';

    return this.prisma.currency.findUnique({
      where: { code: defaultCode },
    });
  }
}
