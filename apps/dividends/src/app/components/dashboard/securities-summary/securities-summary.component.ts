import { Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DividendTransaction, SecuritySummary } from '../../../models/dividend.model';

@Component({
  selector: 'app-securities-summary',
  imports: [CommonModule],
  templateUrl: './securities-summary.component.html',
  styleUrls: ['./securities-summary.component.scss'],
})
export class SecuritiesSummaryComponent {
  // Input from parent dashboard
  filteredTransactions = input.required<DividendTransaction[]>();

  // Internal pagination signals
  currentPage = signal<number>(1);
  pageSize = signal<5 | 10 | 20>(5);

  // Aggregate transactions by security name, sum dividends, sort alphabetically
  aggregatedSecurities = computed(() => {
    const transactionsMap = new Map<string, number>();

    this.filteredTransactions().forEach(tx => {
      const current = transactionsMap.get(tx.name) || 0;
      transactionsMap.set(tx.name, current + tx.finalPayment);
    });

    return Array.from(transactionsMap.entries())
      .map(([name, totalDividends]) => ({ name, totalDividends }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  // Paginate aggregated securities
  paginatedSecurities = computed(() => {
    const securities = this.aggregatedSecurities();
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return securities.slice(start, end);
  });

  // Pagination metadata
  paginationMetadata = computed(() => {
    const totalItems = this.aggregatedSecurities().length;
    const totalPages = Math.ceil(totalItems / this.pageSize()) || 1;
    const page = this.currentPage();

    return {
      page,
      pageSize: this.pageSize(),
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  });

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  }

  previousPage() {
    const metadata = this.paginationMetadata();
    if (metadata.hasPreviousPage) {
      this.currentPage.set(metadata.page - 1);
    }
  }

  nextPage() {
    const metadata = this.paginationMetadata();
    if (metadata.hasNextPage) {
      this.currentPage.set(metadata.page + 1);
    }
  }

  onPageSizeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const size = parseInt(select.value, 10) as 5 | 10 | 20;
    this.pageSize.set(size);
    this.currentPage.set(1); // Reset to first page when changing page size
  }
}
