import { Injectable, signal, computed, inject } from '@angular/core';
import { DividendDataService } from './dividend-data.service';
import { SecurityTransactionService } from './security-transaction.service';
import { SecurityPriceService } from './security-price.service';
import { CurrencyService } from './currency.service';
import { SecurityPrice, SecurityTransactionWithSecurity, Currency } from '@dividends/shared';
import { TimeRange } from '../models/dividend.model';

@Injectable({
  providedIn: 'root',
})
export class PortfolioStateService {
  private readonly dividendDataService = inject(DividendDataService);
  private readonly securityTransactionService = inject(SecurityTransactionService);
  private readonly securityPriceService = inject(SecurityPriceService);
  private readonly currencyService = inject(CurrencyService);

  // Data State
  securityTransactions = signal<SecurityTransactionWithSecurity[]>([]);
  securityPrices = signal<SecurityPrice[]>([]);
  currencies = signal<Currency[]>([]);
  defaultCurrency = signal<Currency | null>(null);

  // Time Range (for filtering)
  selectedTimeRange = signal<TimeRange>('ALL');

  // Computed State
  filteredDividends = computed(() => {
    return this.dividendDataService.getFilteredTransactions(
      this.selectedTimeRange(),
      ''
    );
  });

  kpis = computed(() => {
    return this.dividendDataService.calculateKPIs(
      this.filteredDividends(),
      this.securityTransactions()
    );
  });

  // Data Loading Methods
  loadAllData() {
    this.dividendDataService.loadTransactionsFromBackend();
    this.loadSecurityTransactions();
    this.loadSecurityPrices();
    this.loadCurrencies();
  }

  loadSecurityTransactions() {
    this.securityTransactionService.getSecurityTransactions().subscribe({
      next: (transactions) => {
        this.securityTransactions.set(transactions);
      },
      error: (error) => {
        console.error('Error loading security transactions:', error);
      },
    });
  }

  loadSecurityPrices() {
    this.securityPriceService.getLatestSecurityPrices().subscribe({
      next: (prices) => {
        this.securityPrices.set(prices);
      },
      error: (error) => {
        console.error('Error loading security prices:', error);
      },
    });
  }

  loadCurrencies() {
    this.currencyService.getCurrencies().subscribe({
      next: (currencies) => {
        this.currencies.set(currencies);
      },
      error: (error) => {
        console.error('Error loading currencies:', error);
      },
    });

    this.currencyService.getDefaultCurrency().subscribe({
      next: (currency) => {
        this.defaultCurrency.set(currency);
      },
      error: (error) => {
        console.error('Error loading default currency:', error);
      },
    });
  }

  // Time Range Methods
  setTimeRange(range: TimeRange) {
    this.selectedTimeRange.set(range);
  }
}
