import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DividendPaymentsService } from './dividend-payments.service';
import { CreateDividendPaymentDto } from './dto/create-dividend-payment.dto';
import { UpdateDividendPaymentDto } from './dto/update-dividend-payment.dto';
import { DividendPayment } from '@dividends/shared';

@ApiTags('dividend-payments')
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
  @ApiOperation({ summary: 'Create a new dividend payment' })
  @ApiBody({ type: CreateDividendPaymentDto })
  @ApiResponse({
    status: 201,
    description: 'Dividend payment created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(
    @Body() dto: CreateDividendPaymentDto
  ): Promise<DividendPayment> {
    return this.dividendPaymentsService.createDividendPayment(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all dividend payments with optional filters' })
  @ApiQuery({
    name: 'securityId',
    required: false,
    description: 'Filter by security UUID',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter by start date (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter by end date (ISO format)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of dividend payments',
  })
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
  @ApiOperation({ summary: 'Get a dividend payment by ID' })
  @ApiParam({ name: 'id', description: 'Dividend payment UUID' })
  @ApiResponse({
    status: 200,
    description: 'Dividend payment found',
  })
  @ApiResponse({ status: 404, description: 'Dividend payment not found' })
  async findOne(@Param('id') id: string): Promise<DividendPayment> {
    return this.dividendPaymentsService.getDividendPaymentById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a dividend payment' })
  @ApiParam({ name: 'id', description: 'Dividend payment UUID' })
  @ApiBody({ type: UpdateDividendPaymentDto })
  @ApiResponse({
    status: 200,
    description: 'Dividend payment updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Dividend payment not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDividendPaymentDto
  ): Promise<DividendPayment> {
    return this.dividendPaymentsService.updateDividendPayment(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a dividend payment' })
  @ApiParam({ name: 'id', description: 'Dividend payment UUID' })
  @ApiResponse({
    status: 204,
    description: 'Dividend payment deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Dividend payment not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.dividendPaymentsService.deleteDividendPayment(id);
  }
}
