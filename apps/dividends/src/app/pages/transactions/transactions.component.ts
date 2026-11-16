import { Component, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioStateService } from '../../services/portfolio-state.service';
import { UiStateService } from '../../services/ui-state.service';
import { DividendDataService } from '../../services/dividend-data.service';
import { PaginationStateService } from '../../services/pagination-state.service';
import { TransactionTableComponent } from '../../shared/tables/transaction-table/transaction-table.component';
import { SecurityTransactionTableComponent } from '../../shared/tables/security-transaction-table/security-transaction-table.component';

@Component({
  selector: 'app-transactions',
  imports: [
    CommonModule,
    TransactionTableComponent,
    SecurityTransactionTableComponent,
  ],
  templateUrl: './transactions.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./transactions.component.scss'],
})
export class TransactionsComponent {
  protected readonly portfolioState = inject(PortfolioStateService);
  protected readonly uiState = inject(UiStateService);
  private readonly dividendDataService = inject(DividendDataService);
  protected readonly paginationStateService = inject(PaginationStateService);

  // Expose for template access
  protected get appState() {
    return {
      // UI State
      selectedTimeRange: this.uiState.selectedTimeRange,
      // UI State Methods
      setEditingTransaction: this.uiState.setEditingTransaction.bind(this.uiState),
      setDeletingTransaction: this.uiState.setDeletingTransaction.bind(this.uiState),
      setEditingSecurityTransaction: this.uiState.setEditingSecurityTransaction.bind(this.uiState),
      setDeletingSecurityTransaction: this.uiState.setDeletingSecurityTransaction.bind(this.uiState),
    };
  }

  searchTerm = signal('');

  filteredTransactions = computed(() => {
    return this.dividendDataService.getFilteredTransactions(
      this.uiState.selectedTimeRange(),
      this.searchTerm()
    );
  });

  sortedTransactions = computed(() => {
    return [...this.filteredTransactions()].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  });

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

  // Security transaction pagination
  securityTransactionPage = signal(1);
  securityTransactionPageSize = signal<5 | 10 | 20>(10);
  securityTransactionSearchTerm = signal('');

  filteredSecurityTransactions = computed(() => {
    const search = this.securityTransactionSearchTerm().toLowerCase();
    const transactions = this.portfolioState.securityTransactions();

    if (!search) return transactions;

    return transactions.filter(tx =>
      tx.security?.name.toLowerCase().includes(search) ||
      tx.security?.symbol.toLowerCase().includes(search) ||
      tx.note?.toLowerCase().includes(search)
    );
  });

  sortedSecurityTransactions = computed(() => {
    return [...this.filteredSecurityTransactions()].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  });

  paginatedSecurityTransactions = computed(() => {
    const sorted = this.sortedSecurityTransactions();
    const page = this.securityTransactionPage();
    const pageSize = this.securityTransactionPageSize();
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return sorted.slice(start, end);
  });

  securityTransactionPaginationMetadata = computed(() => {
    const sorted = this.sortedSecurityTransactions();
    const pageSize = this.securityTransactionPageSize();
    const page = this.securityTransactionPage();
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
}
