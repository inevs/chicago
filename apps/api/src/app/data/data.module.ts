import { Module } from '@nestjs/common';
import { DataController } from './data.controller';
import { DataService } from './data.service';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';

@Module({
  imports: [ExchangeRatesModule],
  controllers: [DataController],
  providers: [DataService],
  exports: [DataService],
})
export class DataModule {}
