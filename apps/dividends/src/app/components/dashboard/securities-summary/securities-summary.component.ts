import { Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DividendTransaction, SecuritySummary } from '../../../models/dividend.model';
import { SecurityTransactionWithSecurity, TransactionType } from '@dividends/shared';

@Component({
  selector: 'app-securities-summary',
  imports: [CommonModule],
  templateUrl: './securities-summary.component.html',
  styleUrls: ['./securities-summary.component.scss'],
})
export class SecuritiesSummaryComponent {
  // Input from parent dashboard
  filteredTransactions = input.required<DividendTransaction[]>();
  securityTransactions = input.required<SecurityTransactionWithSecurity[]>();

  // Internal pagination signals
  currentPage = signal<number>(1);
  pageSize = signal<5 | 10 | 20>(5);

  // Aggregate transactions by security name, sum dividends, calculate quantities and avg buy price
  aggregatedSecurities = computed(() => {
    // Map to store aggregated data by security name
    const securitiesMap = new Map<string, {
      totalDividends: number;
      quantity: number;
      totalBuyValue: number;
      buyCount: number;
    }>();

    // Aggregate dividend transactions
    this.filteredTransactions().forEach(tx => {
      if (!tx.name) return;

      const current = securitiesMap.get(tx.name) || {
        totalDividends: 0,
        quantity: 0,
        totalBuyValue: 0,
        buyCount: 0
      };
      const payment = Number(tx.finalPayment) || 0;
      current.totalDividends += payment;
      securitiesMap.set(tx.name, current);
    });

    // Aggregate security transactions (BUY/SELL)
    this.securityTransactions().forEach(tx => {
      const securityName = tx.security?.name;
      if (!securityName) return;

      const current = securitiesMap.get(securityName) || {
        totalDividends: 0,
        quantity: 0,
        totalBuyValue: 0,
        buyCount: 0
      };

      // Explicitly convert to numbers
      const quantity = Number(tx.quantity) || 0;
      const pricePerShare = Number(tx.pricePerShare) || 0;

      if (tx.type === TransactionType.BUY) {
        current.quantity += quantity;
        current.totalBuyValue += pricePerShare * quantity;
        current.buyCount += quantity;
      } else if (tx.type === TransactionType.SELL) {
        current.quantity -= quantity;
      }

      securitiesMap.set(securityName, current);
    });

    // Convert to array and calculate averages
    return Array.from(securitiesMap.entries())
      .map(([name, data]) => {
        const avgPrice = data.buyCount > 0 && isFinite(data.totalBuyValue / data.buyCount)
          ? data.totalBuyValue / data.buyCount
          : 0;

        return {
          name,
          totalDividends: isFinite(data.totalDividends) ? data.totalDividends : 0,
          quantity: isFinite(data.quantity) ? data.quantity : 0,
          averageBuyPrice: avgPrice
        };
      })
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

  // Calculate totals for the summary row
  totals = computed(() => {
    const securities = this.aggregatedSecurities();
    return securities.reduce((acc, security) => ({
      totalQuantity: acc.totalQuantity + security.quantity,
      totalDividends: acc.totalDividends + security.totalDividends,
    }), { totalQuantity: 0, totalDividends: 0 });
  });

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
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
