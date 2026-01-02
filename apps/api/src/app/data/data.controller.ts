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
import { DataService, ExportData, ImportData } from './data.service';

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
  async exportData(): Promise<ExportData> {
    return this.dataService.exportAllData();
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  async importData(
    @Body() data: ImportData,
    @Query('clearExisting') clearExisting?: string
  ): Promise<{
    success: boolean;
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
