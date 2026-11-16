import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioStateService } from '../../services/portfolio-state.service';
import { TransactionFacadeService } from '../../services/transaction-facade.service';
import { UiStateService } from '../../services/ui-state.service';
import { Security, SecurityType } from '@dividends/shared';

type SortColumn = 'symbol' | 'name' | 'type' | 'exchange' | 'currency';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-all-securities',
  imports: [CommonModule],
  templateUrl: './all-securities.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./all-securities.component.scss'],
})
export class AllSecuritiesComponent {
  protected readonly portfolioState = inject(PortfolioStateService);
  protected readonly uiState = inject(UiStateService);
  private readonly transactionFacade = inject(TransactionFacadeService);

  // Search and sorting state
  searchQuery = signal<string>('');
  sortColumn = signal<SortColumn>('symbol');
  sortDirection = signal<SortDirection>('asc');

  // Filtered and sorted securities
  filteredSecurities = computed(() => {
    const allSecurities = this.portfolioState.securities();
    const query = this.searchQuery().toLowerCase().trim();

    let filtered = allSecurities;

    // Apply search filter
    if (query) {
      filtered = allSecurities.filter((security: Security) => {
        return (
          security.name.toLowerCase().includes(query) ||
          security.symbol.toLowerCase().includes(query) ||
          (security.isin && security.isin.toLowerCase().includes(query)) ||
          (security.wkn && security.wkn.toLowerCase().includes(query))
        );
      });
    }

    // Apply sorting
    return this.applySorting(filtered);
  });

  private applySorting(securities: Security[]): Security[] {
    const column = this.sortColumn();
    const direction = this.sortDirection();

    return [...securities].sort((a, b) => {
      let comparison = 0;

      if (column === 'symbol' || column === 'name' || column === 'exchange' || column === 'currency') {
        comparison = (a[column] || '').localeCompare(b[column] || '');
      } else if (column === 'type') {
        comparison = a.type.localeCompare(b.type);
      }

      return direction === 'asc' ? comparison : -comparison;
    });
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
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

  onRowClick(security: Security): void {
    this.transactionFacade.openEditSecurityModal(security.id);
  }

  getSecurityTypeBadgeClass(type: SecurityType): string {
    switch (type) {
      case SecurityType.STOCK:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case SecurityType.ETF:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case SecurityType.BOND:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  }

  getSecurityTypeLabel(type: SecurityType): string {
    switch (type) {
      case SecurityType.STOCK:
        return 'Aktie';
      case SecurityType.ETF:
        return 'ETF';
      case SecurityType.BOND:
        return 'Anleihe';
      default:
        return type;
    }
  }
}
