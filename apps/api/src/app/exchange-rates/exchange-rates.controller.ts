import {
  Controller,
  Post,
  Query,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExchangeRatesService } from './exchange-rates.service';
import { SyncExchangeRatesDto } from './dto/sync-exchange-rates.dto';
import { GetExchangeRateDto } from './dto/get-exchange-rate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('exchange-rates')
@ApiBearerAuth()
@Controller('exchange-rates')
@UseGuards(JwtAuthGuard)
export class ExchangeRatesController {
  constructor(
    private readonly exchangeRatesService: ExchangeRatesService
  ) {}

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync exchange rates from external provider',
    description:
      'Sync exchange rates for a specific currency or all currencies within a date range',
  })
  @ApiResponse({
    status: 200,
    description: 'Exchange rates synced successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
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
  @ApiOperation({
    summary: 'Get exchange rate for a specific date',
    description:
      'Retrieve the exchange rate between two currencies for a specific date',
  })
  @ApiResponse({
    status: 200,
    description: 'Exchange rate retrieved successfully',
    schema: {
      properties: {
        baseCurrency: { type: 'string', example: 'USD' },
        targetCurrency: { type: 'string', example: 'EUR' },
        date: { type: 'string', format: 'date-time' },
        rate: { type: 'number', example: 0.85 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 404, description: 'Exchange rate not found' })
  async getExchangeRate(@Query() dto: GetExchangeRateDto) {
    const date = new Date(dto.date);
    const rate = await this.exchangeRatesService.getExchangeRate(
      dto.baseCurrency,
      dto.targetCurrency,
      date
    );

    return {
      baseCurrency: dto.baseCurrency,
      targetCurrency: dto.targetCurrency,
      date,
      rate,
    };
  }

  @Get('latest')
  @ApiOperation({
    summary: 'Get latest exchange rates to EUR for all currencies',
    description:
      'Retrieve the most recent exchange rate to EUR for each currency in the system',
  })
  @ApiResponse({
    status: 200,
    description: 'Latest exchange rates retrieved successfully',
    schema: {
      type: 'array',
      items: {
        properties: {
          currency: { type: 'string', example: 'USD' },
          rate: { type: 'number', example: 0.85 },
          date: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getLatestRates() {
    return this.exchangeRatesService.getLatestRatesToEur();
  }
}
