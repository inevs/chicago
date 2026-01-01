import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../services/app-state.service';
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
  protected readonly appState = inject(AppStateService);
  private readonly dividendDataService = inject(DividendDataService);
  protected readonly paginationStateService = inject(PaginationStateService);

  searchTerm = signal('');

  filteredTransactions = computed(() => {
    return this.dividendDataService.getFilteredTransactions(
      this.appState.selectedTimeRange(),
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
