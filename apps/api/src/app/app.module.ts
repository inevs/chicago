import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from '../prisma.service';
import { SecuritiesModule } from './securities/securities.module';
import { DividendPaymentsModule } from './dividend-payments/dividend-payments.module';

@Module({
  imports: [SecuritiesModule, DividendPaymentsModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
