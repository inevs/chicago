import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateSecurityDto } from './dto/create-security.dto';
import { UpdateSecurityDto } from './dto/update-security.dto';
import { Security } from '@dividends/shared';
import { SecurityPricesService } from '../security-prices/security-prices.service';

@Injectable()
export class SecuritiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly securityPricesService: SecurityPricesService
  ) {}

  async createSecurity(dto: CreateSecurityDto): Promise<Security> {
    // Check for duplicate symbol
    const existing = await this.prisma.security.findUnique({
      where: { symbol: dto.symbol },
    });

    if (existing) {
      throw new ConflictException(
        'Security with this symbol already exists'
      );
    }

    const currency = await this.prisma.currency.findUnique({
      where: { code: dto.currency },
    });

    if (!currency) {
      throw new NotFoundException(
        `Currency with code ${dto.currency} not found`
      );
    }

    // Create security
    const security = await this.prisma.security.create({
      data: dto,
    });

    // Trigger price update for the new security
    // We don't await this so the API response isn't delayed
    this.securityPricesService.syncHistoricalPrices({ securityId: security.id }).catch(err => {
      console.error(`Failed to trigger price update for new security ${security.symbol}:`, err);
    });

    return security as Security;
  }

  async getAllSecurities(): Promise<Security[]> {
    const securities = await this.prisma.security.findMany({
      orderBy: { symbol: 'asc' },
    });

    return securities as Security[];
  }

  async getSecurityById(id: string): Promise<Security> {
    const security = await this.prisma.security.findUnique({
      where: { id },
    });

    if (!security) {
      throw new NotFoundException('Security not found');
    }

    return security as Security;
  }

  async updateSecurity(id: string, dto: UpdateSecurityDto): Promise<Security> {
    const security = await this.prisma.security.findUnique({
      where: { id },
    });

    if (!security) {
      throw new NotFoundException('Security not found');
    }

    // Check for duplicate symbol if symbol is being changed
    const newSymbol = dto.symbol;
    if (newSymbol && newSymbol !== security.symbol) {
      const existing = await this.prisma.security.findUnique({
        where: { symbol: newSymbol },
      });

      if (existing) {
        throw new ConflictException(
          'Security with this symbol already exists'
        );
      }
    }

    // Validate currency if provided
    const newCurrency = dto.currency;
    if (newCurrency) {
      const currency = await this.prisma.currency.findUnique({
        where: { code: newCurrency },
      });

      if (!currency) {
        throw new NotFoundException(
          `Currency with code ${newCurrency} not found`
        );
      }
    }

    const updated = await this.prisma.security.update({
      where: { id },
      data: dto,
    });

    return updated as Security;
  }

  async searchSecurities(query: string): Promise<Security[]> {
    if (!query || query.trim().length === 0) {
      return this.getAllSecurities();
    }

    const searchTerm = query.trim().toLowerCase();

    const securities = await this.prisma.security.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { symbol: { contains: searchTerm, mode: 'insensitive' } },
          { isin: { contains: searchTerm, mode: 'insensitive' } },
          { wkn: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      orderBy: { symbol: 'asc' },
      take: 10,
    });

    return securities as Security[];
  }
}
