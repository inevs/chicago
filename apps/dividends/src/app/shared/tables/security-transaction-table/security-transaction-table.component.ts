import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SecurityTransactionWithSecurity, TransactionType } from '@dividends/shared';

@Component({
  selector: 'app-security-transaction-table',
  imports: [CommonModule],
  templateUrl: './security-transaction-table.component.html',
  styleUrls: ['./security-transaction-table.component.scss'],
})
export class SecurityTransactionTableComponent {
  transactions = input.required<SecurityTransactionWithSecurity[]>();
  paginationMetadata = input<{
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  } | null>(null);
  currentPageSize = input<5 | 10 | 20>(5);

  searchChange = output<string>();
  editTransaction = output<SecurityTransactionWithSecurity>();
  deleteTransaction = output<SecurityTransactionWithSecurity>();
  pageChange = output<number>();
  pageSizeChange = output<5 | 10 | 20>();

  // Make TransactionType accessible in template
  readonly TransactionType = TransactionType;

  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchChange.emit(value);
  }

  onEdit(transaction: SecurityTransactionWithSecurity) {
    this.editTransaction.emit(transaction);
  }

  onDelete(transaction: SecurityTransactionWithSecurity) {
    this.deleteTransaction.emit(transaction);
  }

  formatCurrency(value: number, currency: string): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
    }).format(value);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(value);
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('de-DE');
  }

  getTransactionTypeLabel(type: TransactionType): string {
    return type === TransactionType.BUY ? 'Kauf' : 'Verkauf';
  }

  getTransactionTypeBadgeClass(type: TransactionType): string {
    return type === TransactionType.BUY
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  }

  calculateTotalAmount(transaction: SecurityTransactionWithSecurity): number {
    // Total = (quantity * pricePerShare) + fees
    return (transaction.quantity * transaction.pricePerShare) + transaction.fees;
  }

  onPageSizeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const size = parseInt(select.value, 10) as 5 | 10 | 20;
    this.pageSizeChange.emit(size);
  }

  previousPage() {
    const metadata = this.paginationMetadata();
    if (metadata?.hasPreviousPage) {
      this.pageChange.emit(metadata.page - 1);
    }
  }

  nextPage() {
    const metadata = this.paginationMetadata();
    if (metadata?.hasNextPage) {
      this.pageChange.emit(metadata.page + 1);
    }
  }
}
