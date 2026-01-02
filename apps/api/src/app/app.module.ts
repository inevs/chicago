import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from '../prisma.service';
import { SecuritiesModule } from './securities/securities.module';
import { DividendPaymentsModule } from './dividend-payments/dividend-payments.module';
import { SecurityTransactionsModule } from './security-transactions/security-transactions.module';
import { DataModule } from './data/data.module';
import { CurrenciesModule } from './currencies/currencies.module';
import { SecurityPricesModule } from './security-prices/security-prices.module';

@Module({
  imports: [SecuritiesModule, DividendPaymentsModule, SecurityTransactionsModule, DataModule, CurrenciesModule, SecurityPricesModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
