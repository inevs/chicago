import { Controller, Get, Post, Body } from '@nestjs/common';
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import type { Currency } from '../../../generated/prisma/client';

@Controller('currencies')
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get()
  findAll(): Promise<Currency[]> {
    return this.currenciesService.findAll();
  }

  @Post()
  create(@Body() createCurrencyDto: CreateCurrencyDto): Promise<Currency> {
    return this.currenciesService.create(createCurrencyDto);
  }

  @Get('default')
  getDefault(): Promise<Currency | null> {
    return this.currenciesService.getDefaultCurrency();
  }
}
