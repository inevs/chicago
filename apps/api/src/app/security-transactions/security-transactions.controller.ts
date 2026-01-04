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
import { SecurityTransactionsService } from './security-transactions.service';
import { CreateSecurityTransactionDto } from './dto/create-security-transaction.dto';
import { UpdateSecurityTransactionDto } from './dto/update-security-transaction.dto';
import { SecurityTransaction } from '@dividends/shared';

@ApiTags('security-transactions')
@Controller('security-transactions')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  })
)
export class SecurityTransactionsController {
  constructor(
    private readonly securityTransactionsService: SecurityTransactionsService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new security transaction' })
  @ApiBody({ type: CreateSecurityTransactionDto })
  @ApiResponse({
    status: 201,
    description: 'Security transaction created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(
    @Body() dto: CreateSecurityTransactionDto
  ): Promise<SecurityTransaction> {
    return this.securityTransactionsService.createSecurityTransaction(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all security transactions with optional filters',
  })
  @ApiQuery({
    name: 'securityId',
    required: false,
    description: 'Filter by security UUID',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['BUY', 'SELL'],
    description: 'Filter by transaction type',
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
    description: 'List of security transactions',
  })
  async findAll(
    @Query('securityId') securityId?: string,
    @Query('type') type?: 'BUY' | 'SELL',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<SecurityTransaction[]> {
    // Filter by security ID if provided
    if (securityId) {
      return this.securityTransactionsService.getSecurityTransactionsBySecurityId(
        securityId
      );
    }

    // Filter by type if provided
    if (type) {
      return this.securityTransactionsService.getSecurityTransactionsByType(
        type
      );
    }

    // Filter by date range if provided
    if (startDate && endDate) {
      return this.securityTransactionsService.getSecurityTransactionsByDateRange(
        new Date(startDate),
        new Date(endDate)
      );
    }

    // Return all
    return this.securityTransactionsService.getAllSecurityTransactions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a security transaction by ID' })
  @ApiParam({ name: 'id', description: 'Security transaction UUID' })
  @ApiResponse({
    status: 200,
    description: 'Security transaction found',
  })
  @ApiResponse({ status: 404, description: 'Security transaction not found' })
  async findOne(@Param('id') id: string): Promise<SecurityTransaction> {
    return this.securityTransactionsService.getSecurityTransactionById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a security transaction' })
  @ApiParam({ name: 'id', description: 'Security transaction UUID' })
  @ApiBody({ type: UpdateSecurityTransactionDto })
  @ApiResponse({
    status: 200,
    description: 'Security transaction updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Security transaction not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSecurityTransactionDto
  ): Promise<SecurityTransaction> {
    return this.securityTransactionsService.updateSecurityTransaction(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a security transaction' })
  @ApiParam({ name: 'id', description: 'Security transaction UUID' })
  @ApiResponse({
    status: 204,
    description: 'Security transaction deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Security transaction not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.securityTransactionsService.deleteSecurityTransaction(id);
  }
}
