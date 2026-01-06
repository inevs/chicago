import { Injectable, signal, computed, inject } from '@angular/core';
import { DividendDataService } from './dividend-data.service';
import { SecurityTransactionService } from './security-transaction.service';
import { SecurityPriceService } from './security-price.service';
import { CurrencyService } from './currency.service';
import { UiStateService } from './ui-state.service';
import { ExchangeRateService, LatestExchangeRate } from './exchange-rate.service';
import { SecurityPrice, SecurityTransactionWithSecurity, Currency } from '@dividends/shared';

@Injectable({
  providedIn: 'root',
})
export class PortfolioStateService {
  private readonly dividendDataService = inject(DividendDataService);
  private readonly securityTransactionService = inject(SecurityTransactionService);
  private readonly securityPriceService = inject(SecurityPriceService);
  private readonly currencyService = inject(CurrencyService);
  private readonly exchangeRateService = inject(ExchangeRateService);
  private readonly uiState = inject(UiStateService);

  // Data State
  securityTransactions = signal<SecurityTransactionWithSecurity[]>([]);
  securityPrices = signal<SecurityPrice[]>([]);
  currencies = signal<Currency[]>([]);
  defaultCurrency = signal<Currency | null>(null);
  exchangeRates = signal<LatestExchangeRate[]>([]);

  // Computed State
  filteredDividends = computed(() => {
    return this.dividendDataService.getFilteredTransactions(
      this.uiState.selectedTimeRange(),
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
    this.loadDividends();
    this.loadSecurityTransactions();
    this.loadSecurityPrices();
    this.loadCurrencies();
    this.loadExchangeRates();
  }

  loadDividends() {
    this.dividendDataService.loadTransactionsFromBackend();
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

  loadExchangeRates() {
    this.exchangeRateService.getLatestRates().subscribe({
      next: (rates) => {
        this.exchangeRates.set(rates);
      },
      error: (error) => {
        console.error('Error loading exchange rates:', error);
      },
    });
  }
}
