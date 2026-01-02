import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DividendTransaction } from '../../../models/dividend.model';
import { SecurityPrice, SecurityTransactionWithSecurity, TransactionType } from '@dividends/shared';

type SortColumn = 'name' | 'quantity' | 'averageBuyPrice' | 'latestPrice' | 'dividendYield' | 'totalDividends';
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
  latestPrices = input.required<SecurityPrice[]>();

  // Output event when a row is clicked for editing
  editSecurity = output<string>();

  // Sorting state
  sortColumn = signal<SortColumn>('name');
  sortDirection = signal<SortDirection>('asc');

  // Aggregate transactions by security name, sum dividends, calculate quantities and avg buy price
  aggregatedSecurities = computed(() => {
    const securitiesMap = this.buildSecuritiesMap();
    const latestPriceMap = this.buildPriceMap(this.latestPrices());
    const securities = this.convertToSecuritiesArray(securitiesMap, latestPriceMap);
    return this.applySorting(securities);
  });

  private buildPriceMap(prices: SecurityPrice[]): Map<string, SecurityPrice> {
    const map = new Map<string, SecurityPrice>();
    prices.forEach((price) => {
      map.set(price.securityId, price);
    });
    return map;
  }

  private buildSecuritiesMap(): Map<
    string,
    {
      securityId?: string;
      name: string;
      totalDividends: number;
      quantity: number;
      totalBuyValue: number;
      buyCount: number;
      currency?: string;
    }
  > {
    const securitiesMap = new Map<
      string,
      {
        securityId?: string;
        name: string;
        totalDividends: number;
        quantity: number;
        totalBuyValue: number;
        buyCount: number;
        currency?: string;
      }
    >();

    this.aggregateDividends(securitiesMap);
    this.aggregateTransactions(securitiesMap);

    return securitiesMap;
  }

  private aggregateDividends(
    securitiesMap: Map<
      string,
      {
        securityId?: string;
        name: string;
        totalDividends: number;
        quantity: number;
        totalBuyValue: number;
        buyCount: number;
        currency?: string;
      }
    >
  ): void {
    this.filteredTransactions().forEach((tx) => {
      if (!tx.name) return;

      const key = tx.securityId || tx.name;
      const current = securitiesMap.get(key) || {
        securityId: tx.securityId,
        name: tx.name,
        totalDividends: 0,
        quantity: 0,
        totalBuyValue: 0,
        buyCount: 0,
        currency: undefined,
      };
      const payment = Number(tx.finalPayment) || 0;
      current.totalDividends += payment;
      current.name = tx.name || current.name;
      current.securityId = tx.securityId || current.securityId;
      securitiesMap.set(key, current);
    });
  }

  private aggregateTransactions(
    securitiesMap: Map<
      string,
      {
        securityId?: string;
        name: string;
        totalDividends: number;
        quantity: number;
        totalBuyValue: number;
        buyCount: number;
        currency?: string;
      }
    >
  ): void {
    this.securityTransactions().forEach((tx) => {
      const securityName = tx.security?.name;
      const securityId = tx.security?.id;
      if (!securityName && !securityId) return;

      const key = securityId || securityName || '';
      if (!key) return;

      const current = securitiesMap.get(key) || {
        securityId,
        name: securityName || 'Unknown',
        totalDividends: 0,
        quantity: 0,
        totalBuyValue: 0,
        buyCount: 0,
        currency: undefined,
      };
      current.securityId = securityId || current.securityId;
      current.name = securityName || current.name;
      current.currency = tx.security?.currency || current.currency;

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

      securitiesMap.set(key, current);
    });
  }

  private convertToSecuritiesArray(
    securitiesMap: Map<
      string,
      {
        securityId?: string;
        name: string;
        totalDividends: number;
        quantity: number;
        totalBuyValue: number;
        buyCount: number;
        currency?: string;
      }
    >,
    latestPriceMap: Map<string, SecurityPrice>
  ): Array<{
    securityId?: string;
    name: string;
    totalDividends: number;
    quantity: number;
    averageBuyPrice: number;
    dividendYield: number;
    latestPrice: number | null;
    latestPriceDate: Date | null;
    latestPriceCurrency: string;
  }> {
    // Use epsilon to handle floating-point precision issues
    const EPSILON = 0.0001;

    return Array.from(securitiesMap.entries())
      .map(([key, data]) => {
        const price = data.securityId
          ? latestPriceMap.get(data.securityId)
          : undefined;
        const avgPrice =
          data.buyCount > 0 && isFinite(data.totalBuyValue / data.buyCount)
            ? data.totalBuyValue / data.buyCount
            : 0;

        const totalDividends = isFinite(data.totalDividends)
          ? data.totalDividends
          : 0;
        const quantity = isFinite(data.quantity) ? data.quantity : 0;

        // Calculate dividend yield: total dividends / original total investment
        // Use totalBuyValue (all historical purchases) instead of current holding value
        const dividendYield =
          data.totalBuyValue > 0
            ? (totalDividends / data.totalBuyValue) * 100
            : 0;
        const latestPrice = price ? Number(price.close) : null;
        const latestPriceDate = price?.date || null;
        const latestPriceCurrency =
          price?.currency || data.currency || 'EUR';

        return {
          securityId: data.securityId || (key || undefined),
          name: data.name,
          totalDividends,
          quantity,
          averageBuyPrice: avgPrice,
          dividendYield: isFinite(dividendYield) ? dividendYield : 0,
          latestPrice,
          latestPriceDate,
          latestPriceCurrency,
        };
      })
      .filter((s) => s.quantity > EPSILON); // Only show securities with holdings
  }

  private applySorting(
    securities: Array<{
      securityId?: string;
      name: string;
      totalDividends: number;
      quantity: number;
      averageBuyPrice: number;
      dividendYield: number;
      latestPrice: number | null;
      latestPriceDate: Date | null;
      latestPriceCurrency: string;
    }>
  ): Array<{
    securityId?: string;
    name: string;
    totalDividends: number;
    quantity: number;
    averageBuyPrice: number;
    dividendYield: number;
    latestPrice: number | null;
    latestPriceDate: Date | null;
    latestPriceCurrency: string;
  }> {
    const column = this.sortColumn();
    const direction = this.sortDirection();

    return securities.sort((a, b) => {
      let comparison = 0;

      if (column === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (column === 'latestPrice') {
        // Handle null values for latestPrice
        const left = a.latestPrice ?? -Infinity;
        const right = b.latestPrice ?? -Infinity;
        comparison = left - right;
      } else {
        const left = (a[column] as number) ?? 0;
        const right = (b[column] as number) ?? 0;
        comparison = left - right;
      }

      return direction === 'asc' ? comparison : -comparison;
    });
  }

  // Calculate totals for the summary row
  totals = computed(() => {
    const securities = this.aggregatedSecurities();
    return securities.reduce((acc, security) => ({
      totalQuantity: acc.totalQuantity + security.quantity,
      totalDividends: acc.totalDividends + security.totalDividends,
    }), { totalQuantity: 0, totalDividends: 0 });
  });

  formatCurrency(value: number, currency = 'EUR'): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency,
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

  formatDate(value?: string | Date | null): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('de-DE').format(date);
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

  onRowClick(securityId?: string): void {
    if (securityId) {
      this.editSecurity.emit(securityId);
    }
  }
}
