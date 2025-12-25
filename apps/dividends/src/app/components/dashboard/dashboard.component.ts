import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DividendDataService } from '../../services/dividend-data.service';
import { SecurityService } from '../../services/security.service';
import { DividendPaymentService } from '../../services/dividend-payment.service';
import { PaginationStateService } from '../../services/pagination-state.service';
import { CreateDividendPaymentDto, UpdateDividendPaymentDto } from '@dividends/shared';
import { TimeRange, DividendTransaction } from '../../models/dividend.model';
import { HeaderNavComponent } from './header-nav/header-nav.component';
import { KpiCardsComponent } from './kpi-cards/kpi-cards.component';
import { SecuritiesSummaryComponent } from './securities-summary/securities-summary.component';
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
    SecuritiesSummaryComponent,
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
  private readonly paginationStateService = inject(PaginationStateService);

  currentRange = signal<TimeRange>('ALL');
  searchTerm = signal('');
  isDarkMode = signal(false);
  showModal = signal(false);
  showSecurityModal = signal(false);
  showMenu = signal(false);
  editingTransaction = signal<DividendTransaction | null>(null);
  deletingTransaction = signal<DividendTransaction | null>(null);

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

  // Pagination computed signals
  currentPageSize = computed(() => this.paginationStateService.getPageSize()());
  currentPage = computed(() => this.paginationStateService.getCurrentPage()());

  paginatedTransactions = computed(() => {
    const sorted = this.sortedTransactions();
    const page = this.currentPage();
    const pageSize = this.currentPageSize();
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return sorted.slice(start, end);
  });

  paginationMetadata = computed(() => {
    const sorted = this.sortedTransactions();
    const pageSize = this.currentPageSize();
    const page = this.currentPage();
    const totalItems = sorted.length;
    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
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
    this.paginationStateService.resetPagination();
  }

  onSearchChange(searchTerm: string) {
    this.searchTerm.set(searchTerm);
    this.paginationStateService.resetPagination();
  }

  onPageChange(page: number) {
    this.paginationStateService.setCurrentPage(page);
  }

  onPageSizeChange(pageSize: 5 | 10 | 20) {
    this.paginationStateService.setPageSize(pageSize);
  }

  toggleModal() {
    const isClosing = this.showModal();
    if (isClosing) {
      this.editingTransaction.set(null);
    }
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

    const editingTx = this.editingTransaction();

    if (editingTx && transaction.id) {
      // UPDATE existing transaction
      const dto: UpdateDividendPaymentDto = {
        exDate: transaction.exDate,
        payoutDate: transaction.payoutDate,
        securityId: transaction.securityId,
        shares: transaction.amount,
        dividendYield: transaction.dividend,
        taxAmount: transaction.taxes,
        originCurrency: transaction.currency,
        destCurrency: 'EUR',
        conversionRate: transaction.rate,
        finalPayment: transaction.finalPayment,
        note: undefined,
      };

      this.dividendPaymentService.updateDividendPayment(transaction.id, dto).subscribe({
        next: (updatedPayment) => {
          console.log('Dividend payment updated successfully:', updatedPayment);
          this.dataService.loadTransactionsFromBackend();
          this.toggleModal();
          this.editingTransaction.set(null);
        },
        error: (error) => {
          console.error('Error updating dividend payment:', error);
          alert(`Failed to update dividend payment: ${error.message}`);
        },
      });
    } else {
      // CREATE new transaction
      const dto: CreateDividendPaymentDto = {
        exDate: transaction.exDate,
        payoutDate: transaction.payoutDate,
        securityId: transaction.securityId,
        shares: transaction.amount,
        dividendYield: transaction.dividend,
        taxAmount: transaction.taxes,
        originCurrency: transaction.currency,
        destCurrency: 'EUR',
        conversionRate: transaction.rate,
        finalPayment: transaction.finalPayment,
        note: undefined,
      };

      this.dividendPaymentService.createDividendPayment(dto).subscribe({
        next: (createdPayment) => {
          console.log('Dividend payment created successfully:', createdPayment);
          this.dataService.loadTransactionsFromBackend();
          this.toggleModal();
        },
        error: (error) => {
          console.error('Error creating dividend payment:', error);
          alert(`Failed to create dividend payment: ${error.message}`);
        },
      });
    }
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

  handleEditTransaction(transaction: DividendTransaction) {
    this.editingTransaction.set(transaction);
    this.showModal.set(true);
  }

  handleDeleteTransaction(transaction: DividendTransaction) {
    this.deletingTransaction.set(transaction);
  }

  confirmDelete() {
    const transaction = this.deletingTransaction();
    if (!transaction || !transaction.id) return;

    const id = typeof transaction.id === 'string' ? transaction.id : String(transaction.id);

    this.dividendPaymentService.deleteDividendPayment(id).subscribe({
      next: () => {
        console.log('Dividend payment deleted successfully');
        this.dataService.loadTransactionsFromBackend();
        this.deletingTransaction.set(null);
      },
      error: (error) => {
        console.error('Error deleting dividend payment:', error);
        alert(`Failed to delete dividend payment: ${error.message}`);
      },
    });
  }

  cancelDelete() {
    this.deletingTransaction.set(null);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('de-DE');
  }
}
