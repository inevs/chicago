import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { CurrenciesRepository } from './currencies.repository';
import { CURRENCY_ERRORS } from '@dividends/shared';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import type { Currency } from '../../../generated/prisma/client';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';

@Injectable()
export class CurrenciesService {
  private readonly logger = new Logger(CurrenciesService.name);

  constructor(
    private readonly currenciesRepository: CurrenciesRepository,
    private exchangeRatesService: ExchangeRatesService
  ) {}

  async findAll(): Promise<Currency[]> {
    return this.currenciesRepository.findAll();
  }

  async create(createCurrencyDto: CreateCurrencyDto): Promise<Currency> {
    // Normalize the currency code (uppercase and trim)
    // Note: This is also done by the @Transform decorator in the DTO,
    // but we ensure it here as well for additional safety
    const normalizedCode = createCurrencyDto.code.toUpperCase().trim();

    // Check if currency with this code already exists
    if (await this.currenciesRepository.existsByCode(normalizedCode)) {
      throw new ConflictException(
        CURRENCY_ERRORS.ALREADY_EXISTS(normalizedCode)
      );
    }

    const currency = await this.currenciesRepository.create({
      code: normalizedCode,
      name: createCurrencyDto.name.trim(),
    });

    // Trigger background job to fetch exchange rates
    // We don't await this promise so it runs in the background
    this.exchangeRatesService
      .syncExchangeRates(normalizedCode)
      .then((result) => {
        this.logger.log(
          `Background sync for ${normalizedCode}: ${result.synced} synced, ${result.skipped} skipped`
        );
      })
      .catch((error) => {
        this.logger.error(
          `Background sync failed for ${normalizedCode}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : undefined
        );
      });

    return currency;
  }

  async getDefaultCurrency(): Promise<Currency | null> {
    const defaultCode = process.env.DEFAULT_CURRENCY || 'EUR';

    return this.currenciesRepository.findByCode(defaultCode);
  }
}
