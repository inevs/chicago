import { Module } from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { ExchangeRatesController } from './exchange-rates.controller';
import { EcbExchangeRateProvider } from './providers/ecb-exchange-rate.provider';
import { EXCHANGE_RATE_PROVIDER } from './providers/exchange-rate-provider';

@Module({
  controllers: [ExchangeRatesController],
  providers: [
    ExchangeRatesService,
    { provide: EXCHANGE_RATE_PROVIDER, useClass: EcbExchangeRateProvider },
  ],
  exports: [ExchangeRatesService],
})
export class ExchangeRatesModule {}
