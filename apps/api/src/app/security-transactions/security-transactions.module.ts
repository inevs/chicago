import { Module } from '@nestjs/common';
import { SecurityTransactionsController } from './security-transactions.controller';
import { SecurityTransactionsService } from './security-transactions.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [SecurityTransactionsController],
  providers: [SecurityTransactionsService, PrismaService],
  exports: [SecurityTransactionsService],
})
export class SecurityTransactionsModule {}
