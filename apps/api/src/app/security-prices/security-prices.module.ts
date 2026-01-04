import { Module, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SecurityPricesController } from './security-prices.controller';
import { SecurityPricesService } from './security-prices.service';
import { PriceUpdateSchedulerService } from './price-update-scheduler.service';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';

@Module({
  imports: [forwardRef(() => ExchangeRatesModule)],
  controllers: [SecurityPricesController],
  providers: [SecurityPricesService, PriceUpdateSchedulerService, PrismaService],
})
export class SecurityPricesModule {}
