import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { ExchangeRatesRepository } from './exchange-rates.repository';
import { CurrenciesRepository } from '../currencies/currencies.repository';
import {
  EXCHANGE_RATE_PROVIDER,
  type ExchangeRateProvider,
} from './providers/exchange-rate-provider';

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);

  constructor(
    private readonly exchangeRatesRepository: ExchangeRatesRepository,
    private readonly currenciesRepository: CurrenciesRepository,
    @Inject(EXCHANGE_RATE_PROVIDER)
    private readonly provider: ExchangeRateProvider
  ) {}

  /**
   * Get the default start date for fetching exchange rates from environment variable
   */
  private getDefaultStartDate(): Date {
    const raw = process.env.SECURITY_PRICE_HISTORY_START || '2017-01-01';
    const parsed = new Date(raw);

    if (Number.isNaN(parsed.getTime())) {
      return new Date('2017-01-01');
    }

    return parsed;
  }

  /**
   * Sync exchange rates from the configured provider for a specific currency
   * @param targetCurrency The target currency to fetch rates for (e.g., 'USD')
   * @param from Start date (defaults to SECURITY_PRICE_HISTORY_START)
   * @param to End date (defaults to today)
   * @param baseCurrency Base currency (defaults to 'EUR')
   */
  async syncExchangeRates(
    targetCurrency: string,
    from?: Date,
    to?: Date,
    baseCurrency = 'EUR'
  ): Promise<{ synced: number; skipped: number }> {
    // The provider only delivers rates for its own base currency (ECB: EUR)
    if (baseCurrency !== this.provider.baseCurrency) {
      throw new BadRequestException(
        `${this.provider.name.toUpperCase()} API only supports ${this.provider.baseCurrency} as base currency`
      );
    }

    // Set default date range
    const startDate = from || this.getDefaultStartDate();
    const endDate = to || new Date();

    // Validate date range (max 10 years like security prices)
    const maxDays = 3650; // 10 years
    const daysDiff = Math.floor(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff > maxDays) {
      throw new BadRequestException(
        `Date range too large. Maximum ${maxDays} days allowed.`
      );
    }

    this.logger.log(
      `Syncing ${baseCurrency}/${targetCurrency} rates from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
    );

    try {
      const rates = await this.provider.fetchRates(
        targetCurrency,
        startDate,
        endDate
      );

      this.logger.log(
        `Fetched ${rates.length} rates from ${this.provider.name.toUpperCase()}`
      );

      if (rates.length === 0) {
        this.logger.warn(
          `No rates found for ${baseCurrency}/${targetCurrency}`
        );
        return { synced: 0, skipped: 0 };
      }

      // Store rates in database
      let synced = 0;
      let skipped = 0;

      // Process in chunks to avoid overwhelming the database
      const chunkSize = 500;
      for (let i = 0; i < rates.length; i += chunkSize) {
        const chunk = rates.slice(i, i + chunkSize);

        const results = await Promise.allSettled(
          chunk.map(async (rate) => {
            try {
              await this.exchangeRatesRepository.upsert({
                baseCurrency,
                targetCurrency,
                date: rate.date,
                rate: rate.rate,
                provider: this.provider.name,
              });
              return { success: true };
            } catch (error) {
              this.logger.warn(
                `Skipping rate for ${rate.date.toISOString()}: ${error instanceof Error ? error.message : 'Unknown error'}`
              );
              return { success: false };
            }
          })
        );

        // Count successes and failures
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.success) {
            synced++;
          } else {
            skipped++;
          }
        });
      }

      this.logger.log(
        `Sync completed: ${synced} synced, ${skipped} skipped for ${baseCurrency}/${targetCurrency}`
      );

      return { synced, skipped };
    } catch (error) {
      this.logger.error(
        `Error syncing ${baseCurrency}/${targetCurrency} rates: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Sync exchange rates for all currencies used in the system
   */
  async syncAllCurrencies(
    from?: Date,
    to?: Date
  ): Promise<Record<string, { synced: number; skipped: number }>> {
    const baseCurrency = 'EUR';

    // Get all unique currencies from securities, excluding EUR
    const currencies =
      await this.currenciesRepository.findCodesExcept(baseCurrency);

    this.logger.log(
      `Syncing exchange rates for ${currencies.length} currencies`
    );

    const results: Record<string, { synced: number; skipped: number }> = {};

    // Process each currency sequentially to avoid rate limiting
    for (const currencyCode of currencies) {
      try {
        const result = await this.syncExchangeRates(
          currencyCode,
          from,
          to,
          baseCurrency
        );
        results[currencyCode] = result;

        // Add delay between requests to be respectful to the API
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        this.logger.error(
          `Failed to sync ${currencyCode}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        results[currencyCode] = { synced: 0, skipped: 0 };
      }
    }

    return results;
  }

  /**
   * Get exchange rate for a specific currency pair and date
   */
  async getExchangeRate(
    baseCurrency: string,
    targetCurrency: string,
    date: Date
  ) {
    // If currencies are the same, return rate of 1
    if (baseCurrency === targetCurrency) {
      return 1;
    }

    // Try to find exact match for the date
    let rate = await this.exchangeRatesRepository.findByPairAndDate(
      baseCurrency,
      targetCurrency,
      date
    );

    // If not found, try to find the closest previous date (for weekends/holidays)
    if (!rate) {
      rate = await this.exchangeRatesRepository.findLatestOnOrBefore(
        baseCurrency,
        targetCurrency,
        date
      );
    }

    return rate ? Number(rate.rate) : null;
  }

  /**
   * Get all exchange rates (for export)
   */
  async getAllExchangeRates() {
    return this.exchangeRatesRepository.findAll();
  }

  /**
   * Get latest exchange rates for all currencies to EUR
   * Returns the most recent rate for each currency pair
   * Optimized to use a single query with DISTINCT ON
   */
  async getLatestRatesToEur(): Promise<Array<{ currency: string; rate: number; date: Date }>> {
    const baseCurrency = 'EUR';

    // Single query for the latest rate of each currency (avoids N+1 queries)
    const rates =
      await this.exchangeRatesRepository.findLatestPerTargetCurrency(baseCurrency);

    // Transform the results to match the expected format
    return rates.map((rate) => ({
      currency: rate.targetCurrency,
      rate: Number(rate.rate),
      date: rate.date,
    }));
  }
}
