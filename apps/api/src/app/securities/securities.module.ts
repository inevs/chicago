import { Module } from '@nestjs/common';
import { SecuritiesController } from './securities.controller';
import { SecuritiesService } from './securities.service';
import { PrismaService } from '../../prisma.service';
import { SecurityPricesModule } from '../security-prices/security-prices.module';

@Module({
  imports: [SecurityPricesModule],
  controllers: [SecuritiesController],
  providers: [SecuritiesService, PrismaService],
  exports: [SecuritiesService],
})
export class SecuritiesModule {}
