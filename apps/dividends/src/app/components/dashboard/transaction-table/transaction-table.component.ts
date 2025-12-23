import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DividendTransaction } from '../../../models/dividend.model';

@Component({
  selector: 'app-transaction-table',
  imports: [CommonModule],
  templateUrl: './transaction-table.component.html',
  styleUrls: ['./transaction-table.component.scss'],
})
export class TransactionTableComponent {
  transactions = input.required<DividendTransaction[]>();
  paginationMetadata = input<{
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  } | null>(null);
  currentPageSize = input<5 | 10 | 20>(10);

  searchChange = output<string>();
  editTransaction = output<DividendTransaction>();
  deleteTransaction = output<DividendTransaction>();
  pageChange = output<number>();
  pageSizeChange = output<5 | 10 | 20>();

  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchChange.emit(value);
  }

  onEdit(transaction: DividendTransaction) {
    this.editTransaction.emit(transaction);
  }

  onDelete(transaction: DividendTransaction) {
    this.deleteTransaction.emit(transaction);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('de-DE');
  }

  calculateYoC(transaction: DividendTransaction): number | null {
    if (!transaction.buyPrice || transaction.buyPrice <= 0) return null;
    const safeRate = transaction.rate && transaction.rate > 0 ? transaction.rate : 1;
    const divInEur = transaction.dividend / safeRate;
    return (divInEur / transaction.buyPrice) * 100;
  }

  calculateTaxInEur(transaction: DividendTransaction): number {
    const safeRate = transaction.rate && transaction.rate > 0 ? transaction.rate : 1;
    return transaction.taxes / safeRate;
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
