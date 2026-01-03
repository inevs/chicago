import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from '../prisma.service';
import { SecuritiesModule } from './securities/securities.module';
import { DividendPaymentsModule } from './dividend-payments/dividend-payments.module';
import { SecurityTransactionsModule } from './security-transactions/security-transactions.module';
import { DataModule } from './data/data.module';
import { CurrenciesModule } from './currencies/currencies.module';
import { SecurityPricesModule } from './security-prices/security-prices.module';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    SecuritiesModule,
    DividendPaymentsModule,
    SecurityTransactionsModule,
    DataModule,
    CurrenciesModule,
    SecurityPricesModule,
    ExchangeRatesModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
