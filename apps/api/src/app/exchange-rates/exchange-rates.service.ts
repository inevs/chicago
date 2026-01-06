import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../prisma.service';

interface EcbRate {
  date: Date;
  rate: number;
}

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);
  private readonly ECB_API_BASE = 'https://data-api.ecb.europa.eu/service/data';

  constructor(private readonly prisma: PrismaService) {}

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
   * Sync exchange rates from ECB for a specific currency
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
    // Validate that base currency is EUR (ECB only provides EUR-based rates)
    if (baseCurrency !== 'EUR') {
      throw new BadRequestException(
        'ECB API only supports EUR as base currency'
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
      // Fetch rates from ECB
      const rates = await this.fetchEcbRates(
        targetCurrency,
        startDate,
        endDate
      );

      this.logger.log(`Fetched ${rates.length} rates from ECB`);

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
              await this.prisma.exchangeRate.upsert({
                where: {
                  baseCurrency_targetCurrency_date: {
                    baseCurrency,
                    targetCurrency,
                    date: rate.date,
                  },
                },
                update: {
                  rate: rate.rate,
                  provider: 'ecb',
                },
                create: {
                  baseCurrency,
                  targetCurrency,
                  date: rate.date,
                  rate: rate.rate,
                  provider: 'ecb',
                },
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
   * Fetch exchange rates from ECB API
   * ECB provides daily exchange rates with EUR as the base currency
   */
  private async fetchEcbRates(
    targetCurrency: string,
    startDate: Date,
    endDate: Date
  ): Promise<EcbRate[]> {
    try {
      // Format dates as YYYY-MM-DD
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      // ECB API endpoint for exchange rates
      // EXR = Exchange Rates
      // D = Daily frequency
      // EUR = Base currency
      // targetCurrency = Quote currency
      const url = `${this.ECB_API_BASE}/EXR/D.${targetCurrency}.EUR.SP00.A`;
      const params = {
        startPeriod: startStr,
        endPeriod: endStr,
        format: 'csvdata',
      };

      this.logger.debug(`Fetching from ECB: ${url}`);

      const response = await axios.get(url, {
        params,
        timeout: 30000,
        headers: {
          Accept: 'text/csv',
        },
      });

      // Parse CSV response
      const rates = this.parseEcbCsv(response.data);

      return rates;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          this.logger.warn(
            `Currency ${targetCurrency} not found in ECB data`
          );
          return [];
        }
        this.logger.error(
          `ECB API error: ${error.response?.status} - ${error.message}`
        );
      }
      throw new BadRequestException(
        `Failed to fetch exchange rates from ECB: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Parse ECB CSV response to extract rates
   * Dynamically parses the header to map column names to indices,
   * making the parser resilient to ECB format changes
   */
  private parseEcbCsv(csv: string): EcbRate[] {
    const rates: EcbRate[] = [];
    const lines = csv.split('\n');

    if (lines.length === 0) {
      this.logger.warn('ECB CSV response is empty');
      return rates;
    }

    // Parse header line to map column names to indices
    const headerLine = lines[0].trim();
    if (!headerLine) {
      this.logger.warn('ECB CSV header line is empty');
      return rates;
    }

    const headers = headerLine.split(',').map((h) => h.trim());
    const columnMap = new Map<string, number>();
    headers.forEach((header, index) => {
      columnMap.set(header, index);
    });

    // Validate required columns exist
    const requiredColumns = ['TIME_PERIOD', 'OBS_VALUE'];
    const missingColumns = requiredColumns.filter(
      (col) => !columnMap.has(col)
    );

    if (missingColumns.length > 0) {
      this.logger.warn(
        `ECB CSV format missing required columns: ${missingColumns.join(', ')}`
      );
      this.logger.warn(`Available columns: ${headers.join(', ')}`);
      return rates;
    }

    // These columns are guaranteed to exist due to the validation above
    const dateIndex = columnMap.get('TIME_PERIOD') as number;
    const rateIndex = columnMap.get('OBS_VALUE') as number;

    // Log format validation success
    this.logger.debug(
      `ECB CSV format validated. TIME_PERIOD at index ${dateIndex}, OBS_VALUE at index ${rateIndex}`
    );

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split(',');

      if (columns.length > Math.max(dateIndex, rateIndex)) {
        const dateStr = columns[dateIndex]?.trim();
        const rateStr = columns[rateIndex]?.trim();

        if (dateStr && rateStr) {
          const date = new Date(dateStr);
          const rate = parseFloat(rateStr);

          if (!isNaN(date.getTime()) && !isNaN(rate)) {
            rates.push({ date, rate });
          }
        }
      }
    }

    return rates;
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
    const currencies = await this.prisma.currency.findMany({
      where: {
        code: {
          not: baseCurrency,
        },
      },
      select: {
        code: true,
      },
    });

    this.logger.log(
      `Syncing exchange rates for ${currencies.length} currencies`
    );

    const results: Record<string, { synced: number; skipped: number }> = {};

    // Process each currency sequentially to avoid rate limiting
    for (const currency of currencies) {
      try {
        const result = await this.syncExchangeRates(
          currency.code,
          from,
          to,
          baseCurrency
        );
        results[currency.code] = result;

        // Add delay between requests to be respectful to the API
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        this.logger.error(
          `Failed to sync ${currency.code}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        results[currency.code] = { synced: 0, skipped: 0 };
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
    let rate = await this.prisma.exchangeRate.findUnique({
      where: {
        baseCurrency_targetCurrency_date: {
          baseCurrency,
          targetCurrency,
          date,
        },
      },
    });

    // If not found, try to find the closest previous date (for weekends/holidays)
    if (!rate) {
      rate = await this.prisma.exchangeRate.findFirst({
        where: {
          baseCurrency,
          targetCurrency,
          date: {
            lte: date,
          },
        },
        orderBy: {
          date: 'desc',
        },
      });
    }

    return rate ? Number(rate.rate) : null;
  }

  /**
   * Get all exchange rates (for export)
   */
  async getAllExchangeRates() {
    return this.prisma.exchangeRate.findMany({
      orderBy: [{ baseCurrency: 'asc' }, { targetCurrency: 'asc' }, { date: 'asc' }],
    });
  }

  /**
   * Get latest exchange rates for all currencies to EUR
   * Returns the most recent rate for each currency pair
   */
  async getLatestRatesToEur(): Promise<Array<{ currency: string; rate: number; date: Date }>> {
    const baseCurrency = 'EUR';

    // Get all unique currencies from the Currency table
    const currencies = await this.prisma.currency.findMany({
      where: {
        code: {
          not: baseCurrency,
        },
      },
      select: {
        code: true,
      },
    });

    // Get the latest rate for each currency
    const rates = await Promise.all(
      currencies.map(async (currency) => {
        const latestRate = await this.prisma.exchangeRate.findFirst({
          where: {
            baseCurrency,
            targetCurrency: currency.code,
          },
          orderBy: {
            date: 'desc',
          },
        });

        if (latestRate) {
          return {
            currency: currency.code,
            rate: Number(latestRate.rate),
            date: latestRate.date,
          };
        }

        return null;
      })
    );

    // Filter out null values (currencies without rates)
    return rates.filter((rate): rate is { currency: string; rate: number; date: Date } => rate !== null);
  }
}
