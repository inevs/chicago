// Must stay the first import: validates the environment before other modules read it
import { environment } from './config/environment';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
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
    ConfigModule.forRoot({
      isGlobal: true,
      // .env files are loaded by Nx (nx serve) and Docker Compose
      ignoreEnvFile: true,
      // forRoot() validates asynchronously; the environment is already validated on import
      validate: () => environment,
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
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
})
export class AppModule {}
