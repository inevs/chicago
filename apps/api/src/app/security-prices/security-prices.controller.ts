import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SecurityPricesService } from './security-prices.service';
import { SecurityPrice } from '@dividends/shared';

@Controller('security-prices')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  })
)
export class SecurityPricesController {
  constructor(private readonly securityPricesService: SecurityPricesService) {}

  @Get('latest')
  async getLatestPrices(): Promise<SecurityPrice[]> {
    return this.securityPricesService.getLatestPrices();
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncHistoricalPrices(
    @Query('securityId') securityId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ): Promise<{
    provider: string;
    from: string;
    to: string;
    securitiesProcessed: number;
    pricesInserted: number;
  }> {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    if (from && Number.isNaN(fromDate?.getTime())) {
      throw new BadRequestException('Invalid from date');
    }

    if (to && Number.isNaN(toDate?.getTime())) {
      throw new BadRequestException('Invalid to date');
    }

    return this.securityPricesService.syncHistoricalPrices({
      securityId,
      from: fromDate,
      to: toDate,
    });
  }
}
