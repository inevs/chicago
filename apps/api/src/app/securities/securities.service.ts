import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateSecurityDto } from './dto/create-security.dto';
import { Security } from '@dividends/shared';

@Injectable()
export class SecuritiesService {
  constructor(private readonly prisma: PrismaService) {}

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

    // Create security
    const security = await this.prisma.security.create({
      data: dto,
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
}
