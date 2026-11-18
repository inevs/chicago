import { Module } from '@nestjs/common';
import { SecurityTransactionsController } from './security-transactions.controller';
import { SecurityTransactionsService } from './security-transactions.service';

@Module({
  controllers: [SecurityTransactionsController],
  providers: [SecurityTransactionsService],
  exports: [SecurityTransactionsService],
})
export class SecurityTransactionsModule {}
