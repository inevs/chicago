import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { DividendPaymentsService } from './dividend-payments.service';
import { CreateDividendPaymentDto } from './dto/create-dividend-payment.dto';
import { DividendPayment } from '@dividends/shared';

@Controller('dividend-payments')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  })
)
export class DividendPaymentsController {
  constructor(
    private readonly dividendPaymentsService: DividendPaymentsService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateDividendPaymentDto
  ): Promise<DividendPayment> {
    return this.dividendPaymentsService.createDividendPayment(dto);
  }

  @Get()
  async findAll(
    @Query('securityId') securityId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<DividendPayment[]> {
    // Filter by security ID if provided
    if (securityId) {
      return this.dividendPaymentsService.getDividendPaymentsBySecurityId(
        securityId
      );
    }

    // Filter by date range if provided
    if (startDate && endDate) {
      return this.dividendPaymentsService.getDividendPaymentsByDateRange(
        new Date(startDate),
        new Date(endDate)
      );
    }

    // Return all
    return this.dividendPaymentsService.getAllDividendPayments();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<DividendPayment> {
    return this.dividendPaymentsService.getDividendPaymentById(id);
  }
}
