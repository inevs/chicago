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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SecurityPricesService } from './security-prices.service';
import { PriceUpdateSchedulerService } from './price-update-scheduler.service';
import { SecurityPrice } from '@dividends/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('security-prices')
@ApiBearerAuth()
@Controller('security-prices')
@UseGuards(JwtAuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  })
)
export class SecurityPricesController {
  constructor(
    private readonly securityPricesService: SecurityPricesService,
    private readonly priceUpdateScheduler: PriceUpdateSchedulerService
  ) {}

  @Get('latest')
  @ApiOperation({ summary: 'Get latest prices for all securities' })
  @ApiResponse({
    status: 200,
    description: 'List of latest security prices',
  })
  async getLatestPrices(): Promise<SecurityPrice[]> {
    return this.securityPricesService.getLatestPrices();
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync historical prices from external provider',
    description:
      'Fetch and store historical security prices within a date range. Maximum range is 10 years.',
  })
  @ApiQuery({
    name: 'securityId',
    required: false,
    description: 'Security UUID to sync prices for (syncs all if not provided)',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Start date for price sync (ISO format)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'End date for price sync (ISO format)',
  })
  @ApiResponse({
    status: 200,
    description: 'Historical prices synced successfully',
    schema: {
      properties: {
        provider: { type: 'string', example: 'Yahoo Finance' },
        from: { type: 'string', format: 'date-time' },
        to: { type: 'string', format: 'date-time' },
        securitiesProcessed: { type: 'number', example: 10 },
        pricesInserted: { type: 'number', example: 250 },
        failures: {
          type: 'array',
          items: {
            properties: {
              symbol: { type: 'string', example: 'AAPL' },
              error: { type: 'string', example: 'Symbol not found' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid date range or parameters' })
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
    failures: Array<{ symbol: string; error: string }>;
  }> {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    if (from && Number.isNaN(fromDate?.getTime())) {
      throw new BadRequestException('Invalid from date');
    }

    if (to && Number.isNaN(toDate?.getTime())) {
      throw new BadRequestException('Invalid to date');
    }

    // Validate date ranges
    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException('from date must be before to date');
    }

    if (fromDate && fromDate > new Date()) {
      throw new BadRequestException('from date cannot be in the future');
    }

    // Limit range to prevent abuse (max 10 years)
    const maxDays = 3650; // 10 years
    if (fromDate && toDate) {
      const daysDiff =
        (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > maxDays) {
        throw new BadRequestException(
          `Date range cannot exceed ${maxDays} days (approximately 10 years)`
        );
      }
    }

    return this.securityPricesService.syncHistoricalPrices({
      securityId,
      from: fromDate,
      to: toDate,
    });
  }

  @Post('update-daily')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger daily price update manually',
    description: 'Manually trigger the daily scheduled price update for all securities',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily price update triggered successfully',
    schema: {
      properties: {
        message: { type: 'string', example: 'Daily price update triggered successfully' },
      },
    },
  })
  async triggerDailyUpdate(): Promise<{ message: string }> {
    // Trigger the scheduled update manually
    await this.priceUpdateScheduler.triggerManualUpdate();
    return { message: 'Daily price update triggered successfully' };
  }
}
