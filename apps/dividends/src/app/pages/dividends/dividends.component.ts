import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioStateService } from '../../services/portfolio-state.service';
import { UiStateService } from '../../services/ui-state.service';
import { DividendDataService } from '../../services/dividend-data.service';
import { PaginationStateService } from '../../services/pagination-state.service';
import { TransactionTableComponent } from '../../shared/tables/transaction-table/transaction-table.component';

@Component({
  selector: 'app-dividends',
  imports: [
    CommonModule,
    TransactionTableComponent,
  ],
  templateUrl: './dividends.component.html',
  styleUrls: ['./dividends.component.scss'],
})
export class DividendsComponent {
  protected readonly portfolioState = inject(PortfolioStateService);
  protected readonly uiState = inject(UiStateService);
  private readonly dividendDataService = inject(DividendDataService);
  protected readonly paginationStateService = inject(PaginationStateService);

  // Expose for template access
  protected get appState() {
    return { ...this.portfolioState, ...this.uiState };
  }

  searchTerm = signal('');

  filteredTransactions = computed(() => {
    return this.dividendDataService.getFilteredTransactions(
      this.portfolioState.selectedTimeRange(),
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
}
