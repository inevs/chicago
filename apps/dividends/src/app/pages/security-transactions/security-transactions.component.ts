import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioStateService } from '../../services/portfolio-state.service';
import { UiStateService } from '../../services/ui-state.service';
import { SecurityTransactionTableComponent } from '../../shared/tables/security-transaction-table/security-transaction-table.component';

@Component({
  selector: 'app-security-transactions',
  imports: [
    CommonModule,
    SecurityTransactionTableComponent,
  ],
  templateUrl: './security-transactions.component.html',
  styleUrls: ['./security-transactions.component.scss'],
})
export class SecurityTransactionsComponent {
  protected readonly portfolioState = inject(PortfolioStateService);
  protected readonly uiState = inject(UiStateService);

  // Expose for template access
  protected get appState() {
    return {
      // UI State Methods
      setEditingSecurityTransaction: this.uiState.setEditingSecurityTransaction.bind(this.uiState),
      setDeletingSecurityTransaction: this.uiState.setDeletingSecurityTransaction.bind(this.uiState),
    };
  }

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
