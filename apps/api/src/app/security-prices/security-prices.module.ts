import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SecurityPricesController } from './security-prices.controller';
import { SecurityPricesService } from './security-prices.service';

@Module({
  controllers: [SecurityPricesController],
  providers: [SecurityPricesService, PrismaService],
})
export class SecurityPricesModule {}
