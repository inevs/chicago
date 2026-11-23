import { Module } from '@nestjs/common';
import { SecurityPricesController } from './security-prices.controller';
import { SecurityPricesService } from './security-prices.service';
import { PriceUpdateSchedulerService } from './price-update-scheduler.service';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';

@Module({
  imports: [ExchangeRatesModule],
  controllers: [SecurityPricesController],
  providers: [SecurityPricesService, PriceUpdateSchedulerService],
  exports: [SecurityPricesService],
})
export class SecurityPricesModule {}
