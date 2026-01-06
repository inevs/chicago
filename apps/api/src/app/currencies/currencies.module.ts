import { Module } from '@nestjs/common';
import { CurrenciesController } from './currencies.controller';
import { CurrenciesService } from './currencies.service';
import { PrismaService } from '../../prisma.service';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';

@Module({
  imports: [ExchangeRatesModule],
  controllers: [CurrenciesController],
  providers: [CurrenciesService, PrismaService],
  exports: [CurrenciesService],
})
export class CurrenciesModule {}
