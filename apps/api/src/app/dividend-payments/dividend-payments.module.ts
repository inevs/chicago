import { Module } from '@nestjs/common';
import { DividendPaymentsController } from './dividend-payments.controller';
import { DividendPaymentsService } from './dividend-payments.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [DividendPaymentsController],
  providers: [DividendPaymentsService, PrismaService],
  exports: [DividendPaymentsService],
})
export class DividendPaymentsModule {}
