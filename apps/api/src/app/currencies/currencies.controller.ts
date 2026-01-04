import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { CurrencyResponseDto } from './dto/currency-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('currencies')
@ApiBearerAuth()
@Controller('currencies')
@UseGuards(JwtAuthGuard)
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all currencies' })
  @ApiResponse({
    status: 200,
    description: 'List of all currencies',
    type: [CurrencyResponseDto],
  })
  async findAll(): Promise<CurrencyResponseDto[]> {
    const currencies = await this.currenciesService.findAll();
    return currencies.map(currency => CurrencyResponseDto.fromEntity(currency));
  }

  @Post()
  @ApiOperation({ summary: 'Create a new currency' })
  @ApiBody({ type: CreateCurrencyDto })
  @ApiResponse({
    status: 201,
    description: 'Currency created successfully',
    type: CurrencyResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Body() createCurrencyDto: CreateCurrencyDto): Promise<CurrencyResponseDto> {
    const currency = await this.currenciesService.create(createCurrencyDto);
    return CurrencyResponseDto.fromEntity(currency);
  }

  @Get('default')
  @ApiOperation({ summary: 'Get the default currency' })
  @ApiResponse({
    status: 200,
    description: 'Default currency or null if not set',
    type: CurrencyResponseDto,
  })
  async getDefault(): Promise<CurrencyResponseDto | null> {
    const currency = await this.currenciesService.getDefaultCurrency();
    return currency ? CurrencyResponseDto.fromEntity(currency) : null;
  }
}
