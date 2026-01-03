import {
  Controller,
  Post,
  Query,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { SyncExchangeRatesDto } from './dto/sync-exchange-rates.dto';

@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(
    private readonly exchangeRatesService: ExchangeRatesService
  ) {}

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncExchangeRates(@Query() dto: SyncExchangeRatesDto) {
    const from = dto.from ? new Date(dto.from) : undefined;
    const to = dto.to ? new Date(dto.to) : undefined;

    if (dto.targetCurrency) {
      // Sync a specific currency
      return this.exchangeRatesService.syncExchangeRates(
        dto.targetCurrency,
        from,
        to,
        dto.baseCurrency
      );
    } else {
      // Sync all currencies
      return this.exchangeRatesService.syncAllCurrencies(from, to);
    }
  }

  @Get('rate')
  async getExchangeRate(
    @Query('baseCurrency') baseCurrency: string,
    @Query('targetCurrency') targetCurrency: string,
    @Query('date') dateStr: string
  ) {
    const date = new Date(dateStr);
    const rate = await this.exchangeRatesService.getExchangeRate(
      baseCurrency,
      targetCurrency,
      date
    );

    return {
      baseCurrency,
      targetCurrency,
      date,
      rate,
    };
  }
}
