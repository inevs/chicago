import { Module } from '@nestjs/common';
import { DividendPaymentsController } from './dividend-payments.controller';
import { DividendPaymentsService } from './dividend-payments.service';

@Module({
  controllers: [DividendPaymentsController],
  providers: [DividendPaymentsService],
  exports: [DividendPaymentsService],
})
export class DividendPaymentsModule {}
