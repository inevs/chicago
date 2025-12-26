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
import { SecurityTransactionsService } from './security-transactions.service';
import { CreateSecurityTransactionDto } from './dto/create-security-transaction.dto';
import { UpdateSecurityTransactionDto } from './dto/update-security-transaction.dto';
import { SecurityTransaction } from '@dividends/shared';

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
  async create(
    @Body() dto: CreateSecurityTransactionDto
  ): Promise<SecurityTransaction> {
    return this.securityTransactionsService.createSecurityTransaction(dto);
  }

  @Get()
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
  async findOne(@Param('id') id: string): Promise<SecurityTransaction> {
    return this.securityTransactionsService.getSecurityTransactionById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSecurityTransactionDto
  ): Promise<SecurityTransaction> {
    return this.securityTransactionsService.updateSecurityTransaction(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.securityTransactionsService.deleteSecurityTransaction(id);
  }
}
