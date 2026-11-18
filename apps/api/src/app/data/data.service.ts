import { Injectable } from '@nestjs/common';
import { CurrenciesRepository } from '../currencies/currencies.repository';
import { SecuritiesRepository } from '../securities/securities.repository';
import { DividendPaymentsRepository } from '../dividend-payments/dividend-payments.repository';
import { SecurityTransactionsRepository } from '../security-transactions/security-transactions.repository';
import { SecurityPricesRepository } from '../security-prices/security-prices.repository';
import {
  DataImportRepository,
  ImportCounts,
  ImportRecords,
} from './data-import.repository';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';

export interface ExportData {
  currencies: unknown[];
  securities: unknown[];
  dividendPayments: unknown[];
  securityTransactions: unknown[];
  securityPrices: unknown[];
  exchangeRates: unknown[];
  exportedAt: string;
  version: string;
}

export type ImportData = ImportRecords;

@Injectable()
export class DataService {
  constructor(
    private readonly currenciesRepository: CurrenciesRepository,
    private readonly securitiesRepository: SecuritiesRepository,
    private readonly dividendPaymentsRepository: DividendPaymentsRepository,
    private readonly securityTransactionsRepository: SecurityTransactionsRepository,
    private readonly securityPricesRepository: SecurityPricesRepository,
    private readonly dataImportRepository: DataImportRepository,
    private readonly exchangeRatesService: ExchangeRatesService
  ) {}

  async exportAllData(): Promise<ExportData> {
    // Fetch all data from database
    const [
      currencies,
      securities,
      dividendPayments,
      securityTransactions,
      securityPrices,
      exchangeRates,
    ] = await Promise.all([
      this.currenciesRepository.findAll(),
      this.securitiesRepository.findAll(),
      this.dividendPaymentsRepository.findAllForExport(),
      this.securityTransactionsRepository.findAllForExport(),
      this.securityPricesRepository.findAllForExport(),
      this.exchangeRatesService.getAllExchangeRates(),
    ]);

    return {
      currencies,
      securities,
      dividendPayments,
      securityTransactions,
      securityPrices,
      exchangeRates,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
  }

  async importAllData(
    data: ImportData,
    options: { clearExisting?: boolean } = {}
  ): Promise<ImportCounts> {
    return this.dataImportRepository.importAll(data, options);
  }
}
