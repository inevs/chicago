import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Header,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { DataService, ExportData, ImportData } from './data.service';

@ApiTags('data')
@Controller('data')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  })
)
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get('export')
  @Header('Content-Type', 'application/json')
  @Header('Content-Disposition', 'attachment; filename="dividends-export.json"')
  @ApiOperation({
    summary: 'Export all data',
    description: 'Export all currencies, securities, dividend payments, transactions, and prices as JSON',
  })
  @ApiResponse({
    status: 200,
    description: 'Data exported successfully',
    schema: {
      properties: {
        currencies: { type: 'array', items: { type: 'object' } },
        securities: { type: 'array', items: { type: 'object' } },
        dividendPayments: { type: 'array', items: { type: 'object' } },
        securityTransactions: { type: 'array', items: { type: 'object' } },
        securityPrices: { type: 'array', items: { type: 'object' } },
      },
    },
  })
  async exportData(): Promise<ExportData> {
    return this.dataService.exportAllData();
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Import data',
    description: 'Import currencies, securities, dividend payments, transactions, and prices from JSON',
  })
  @ApiQuery({
    name: 'clearExisting',
    required: false,
    description: 'Clear all existing data before import (set to "true" to enable)',
    schema: { type: 'string', enum: ['true', 'false'] },
  })
  @ApiBody({
    schema: {
      properties: {
        currencies: { type: 'array', items: { type: 'object' } },
        securities: { type: 'array', items: { type: 'object' } },
        dividendPayments: { type: 'array', items: { type: 'object' } },
        securityTransactions: { type: 'array', items: { type: 'object' } },
        securityPrices: { type: 'array', items: { type: 'object' } },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Data imported successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        currenciesImported: { type: 'number', example: 5 },
        securitiesImported: { type: 'number', example: 10 },
        dividendPaymentsImported: { type: 'number', example: 50 },
        securityTransactionsImported: { type: 'number', example: 20 },
        securityPricesImported: { type: 'number', example: 100 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid import data' })
  async importData(
    @Body() data: ImportData,
    @Query('clearExisting') clearExisting?: string
  ): Promise<{
    success: boolean;
    currenciesImported: number;
    securitiesImported: number;
    dividendPaymentsImported: number;
    securityTransactionsImported: number;
    securityPricesImported: number;
  }> {
    const result = await this.dataService.importAllData(data, {
      clearExisting: clearExisting === 'true',
    });

    return {
      success: true,
      ...result,
    };
  }
}
