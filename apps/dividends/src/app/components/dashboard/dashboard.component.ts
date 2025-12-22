import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DividendDataService } from '../../services/dividend-data.service';
import { SecurityService } from '../../services/security.service';
import { DividendPaymentService } from '../../services/dividend-payment.service';
import { CreateDividendPaymentDto } from '@dividends/shared';
import { TimeRange } from '../../models/dividend.model';
import { HeaderNavComponent } from './header-nav/header-nav.component';
import { KpiCardsComponent } from './kpi-cards/kpi-cards.component';
import { ChartsSectionComponent } from './charts-section/charts-section.component';
import { TransactionTableComponent } from './transaction-table/transaction-table.component';
import { TransactionModalComponent, TransactionForm } from './transaction-modal/transaction-modal.component';
import { SecurityModalComponent, SecurityForm } from './security-modal/security-modal.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    HeaderNavComponent,
    KpiCardsComponent,
    ChartsSectionComponent,
    TransactionTableComponent,
    TransactionModalComponent,
    SecurityModalComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private readonly dataService = inject(DividendDataService);
  private readonly securityService = inject(SecurityService);
  private readonly dividendPaymentService = inject(DividendPaymentService);

  currentRange = signal<TimeRange>('ALL');
  searchTerm = signal('');
  isDarkMode = signal(false);
  showModal = signal(false);
  showSecurityModal = signal(false);
  showMenu = signal(false);

  filteredTransactions = computed(() => {
    return this.dataService.getFilteredTransactions(
      this.currentRange(),
      this.searchTerm()
    );
  });

  kpis = computed(() => {
    return this.dataService.calculateKPIs(this.filteredTransactions());
  });

  sortedTransactions = computed(() => {
    return [...this.filteredTransactions()].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  });

  ngOnInit() {
    this.initTheme();
    this.dataService.loadTransactionsFromBackend();
  }

  initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      this.isDarkMode.set(true);
      document.documentElement.classList.add('dark');
    } else {
      this.isDarkMode.set(false);
      document.documentElement.classList.remove('dark');
    }
  }

  toggleTheme() {
    const newDarkMode = !this.isDarkMode();
    this.isDarkMode.set(newDarkMode);

    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }

  setRange(range: TimeRange) {
    this.currentRange.set(range);
  }

  onSearchChange(searchTerm: string) {
    this.searchTerm.set(searchTerm);
  }

  toggleModal() {
    this.showModal.update((show) => !show);
    this.showMenu.set(false);
  }

  toggleSecurityModal() {
    this.showSecurityModal.update((show) => !show);
    this.showMenu.set(false);
  }

  toggleMenu() {
    this.showMenu.update((show) => !show);
  }

  handleTransactionSubmit(transaction: TransactionForm) {
    // Validation
    if (!transaction.securityId) {
      alert('Bitte wählen Sie ein Wertpapier aus der Liste aus');
      return;
    }

    // Create DTO with proper mapping
    const dto: CreateDividendPaymentDto = {
      exDate: transaction.exDate,
      payoutDate: transaction.payoutDate,
      securityId: transaction.securityId,
      shares: transaction.amount,
      dividendYield: transaction.dividend,
      taxAmount: transaction.taxes,
      originCurrency: transaction.currency,
      destCurrency: 'EUR', // Fixed for now
      conversionRate: transaction.rate,
      finalPayment: transaction.finalPayment,
      note: undefined,
    };

    // Persist to backend
    this.dividendPaymentService.createDividendPayment(dto).subscribe({
      next: (createdPayment) => {
        console.log('Dividend payment created successfully:', createdPayment);
        // Reload transactions from backend
        this.dataService.loadTransactionsFromBackend();
        this.toggleModal();
      },
      error: (error) => {
        console.error('Error creating dividend payment:', error);
        alert(`Failed to create dividend payment: ${error.message}`);
      },
    });
  }

  handleSecuritySubmit(security: SecurityForm) {
    const createRequest = {
      name: security.name,
      symbol: security.symbol,
      isin: security.isin || undefined,
      wkn: security.wkn || undefined,
      type: security.type,
      exchange: security.exchange,
      currency: security.currency,
    };

    this.securityService.createSecurity(createRequest).subscribe({
      next: (createdSecurity) => {
        console.log('Security created successfully:', createdSecurity);
        this.toggleSecurityModal();
      },
      error: (error) => {
        console.error('Error creating security:', error);
        alert(`Failed to create security: ${error.message}`);
      },
    });
  }
}
