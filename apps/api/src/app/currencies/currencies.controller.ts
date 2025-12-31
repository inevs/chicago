import { Controller, Get, Post, Body } from '@nestjs/common';
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { CurrencyResponseDto } from './dto/currency-response.dto';

@Controller('currencies')
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get()
  async findAll(): Promise<CurrencyResponseDto[]> {
    const currencies = await this.currenciesService.findAll();
    return currencies.map(currency => CurrencyResponseDto.fromEntity(currency));
  }

  @Post()
  async create(@Body() createCurrencyDto: CreateCurrencyDto): Promise<CurrencyResponseDto> {
    const currency = await this.currenciesService.create(createCurrencyDto);
    return CurrencyResponseDto.fromEntity(currency);
  }

  @Get('default')
  async getDefault(): Promise<CurrencyResponseDto | null> {
    const currency = await this.currenciesService.getDefaultCurrency();
    return currency ? CurrencyResponseDto.fromEntity(currency) : null;
  }
}
