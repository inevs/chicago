import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SecurityPricesController } from './security-prices.controller';
import { SecurityPricesService } from './security-prices.service';
import { PriceUpdateSchedulerService } from './price-update-scheduler.service';

@Module({
  controllers: [SecurityPricesController],
  providers: [SecurityPricesService, PriceUpdateSchedulerService, PrismaService],
})
export class SecurityPricesModule {}
