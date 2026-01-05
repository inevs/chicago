import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { AuthModule } from './auth/auth.module';
import { SecuritiesModule } from './securities/securities.module';
import { DividendPaymentsModule } from './dividend-payments/dividend-payments.module';
import { SecurityTransactionsModule } from './security-transactions/security-transactions.module';
import { DataModule } from './data/data.module';
import { CurrenciesModule } from './currencies/currencies.module';
import { SecurityPricesModule } from './security-prices/security-prices.module';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    HealthModule,
    AuthModule,
    SecuritiesModule,
    DividendPaymentsModule,
    SecurityTransactionsModule,
    DataModule,
    CurrenciesModule,
    SecurityPricesModule,
    ExchangeRatesModule,
  ],
  controllers: [],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
