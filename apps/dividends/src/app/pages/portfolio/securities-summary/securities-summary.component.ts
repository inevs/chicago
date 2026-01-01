import { Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DividendTransaction, SecuritySummary } from '../../../models/dividend.model';
import { SecurityTransactionWithSecurity, TransactionType } from '@dividends/shared';

type SortColumn = 'name' | 'quantity' | 'averageBuyPrice' | 'dividendYield' | 'totalDividends';
type SortDirection = 'asc' | 'desc';

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

  // Sorting state
  sortColumn = signal<SortColumn>('name');
  sortDirection = signal<SortDirection>('asc');

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

    // Convert to array, calculate averages, and filter to only show securities with holdings
    // Use epsilon to handle floating-point precision issues
    const EPSILON = 0.0001;

    const securities = Array.from(securitiesMap.entries())
      .map(([name, data]) => {
        const avgPrice = data.buyCount > 0 && isFinite(data.totalBuyValue / data.buyCount)
          ? data.totalBuyValue / data.buyCount
          : 0;

        const totalDividends = isFinite(data.totalDividends) ? data.totalDividends : 0;
        const quantity = isFinite(data.quantity) ? data.quantity : 0;

        // Calculate dividend yield: total dividends / original total investment
        // Use totalBuyValue (all historical purchases) instead of current holding value
        const dividendYield = data.totalBuyValue > 0 ? (totalDividends / data.totalBuyValue) * 100 : 0;

        return {
          name,
          totalDividends,
          quantity,
          averageBuyPrice: avgPrice,
          dividendYield: isFinite(dividendYield) ? dividendYield : 0
        };
      })
      .filter(s => s.quantity > EPSILON); // Only show securities with holdings

    // Apply sorting
    const column = this.sortColumn();
    const direction = this.sortDirection();

    return securities.sort((a, b) => {
      let comparison = 0;

      if (column === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else {
        comparison = a[column] - b[column];
      }

      return direction === 'asc' ? comparison : -comparison;
    });
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

  formatPercent(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value) + ' %';
  }

  sort(column: SortColumn): void {
    if (this.sortColumn() === column) {
      // Toggle direction if same column
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }
}
