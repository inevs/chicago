import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import type {
  ExchangeRateData,
  ExchangeRateProvider,
} from './exchange-rate-provider';

/**
 * Exchange rates from the European Central Bank (ECB) data API.
 * The ECB provides daily exchange rates with EUR as the base currency.
 */
@Injectable()
export class EcbExchangeRateProvider implements ExchangeRateProvider {
  readonly name = 'ecb';
  readonly baseCurrency = 'EUR';

  private readonly logger = new Logger(EcbExchangeRateProvider.name);
  private readonly ECB_API_BASE = 'https://data-api.ecb.europa.eu/service/data';

  async fetchRates(
    targetCurrency: string,
    startDate: Date,
    endDate: Date
  ): Promise<ExchangeRateData[]> {
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
      return this.parseEcbCsv(response.data);
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
  private parseEcbCsv(csv: string): ExchangeRateData[] {
    const rates: ExchangeRateData[] = [];
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
}
