import { Injectable, signal, computed, inject } from '@angular/core';
import { DividendDataService } from './dividend-data.service';
import { SecurityTransactionService } from './security-transaction.service';
import { SecurityPriceService } from './security-price.service';
import { CurrencyService } from './currency.service';
import { SecurityService } from './security.service';
import { UiStateService } from './ui-state.service';
import { ExchangeRateService, LatestExchangeRate } from './exchange-rate.service';
import { AuthService } from './auth.service';
import { Security, SecurityPrice, SecurityTransactionWithSecurity, Currency, TransactionType } from '@dividends/shared';

@Injectable({
  providedIn: 'root',
})
export class PortfolioStateService {
  private readonly dividendDataService = inject(DividendDataService);
  private readonly securityTransactionService = inject(SecurityTransactionService);
  private readonly securityPriceService = inject(SecurityPriceService);
  private readonly currencyService = inject(CurrencyService);
  private readonly securityService = inject(SecurityService);
  private readonly exchangeRateService = inject(ExchangeRateService);
  private readonly uiState = inject(UiStateService);
  private readonly authService = inject(AuthService);

  // Data State
  securities = signal<Security[]>([]);
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

  getSharesAtDate(securityId: string, dateStr: string): number {
    const transactions = this.securityTransactions();
    const targetDate = new Date(dateStr);

    return transactions
      .filter(t => t.securityId === securityId && new Date(t.date) < targetDate)
      .reduce((total, t) => {
        const qty = Number(t.quantity);
        if (t.type === TransactionType.BUY) {
          return total + qty;
        } else if (t.type === TransactionType.SELL) {
          return total - qty;
        }
        return total;
      }, 0);
  }

  // Data Loading Methods
  loadAllData() {
    // Load data - if token is invalid, the error interceptor will handle 401 errors
    this.loadSecurities();
    this.loadDividends();
    this.loadSecurityTransactions();
    this.loadSecurityPrices();
    this.loadCurrencies();
    this.loadExchangeRates();
  }

  loadSecurities() {
    this.securityService.getSecurities().subscribe({
      next: (securities) => {
        this.securities.set(securities);
      },
      error: (error) => {
        console.error('Error loading securities:', error);
      },
    });
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
