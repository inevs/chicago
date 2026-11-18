import { Injectable, signal, inject } from '@angular/core';
import { DividendTransaction, TimeRange, DashboardKPIs } from '../models/dividend.model';
import { DividendPaymentService } from './dividend-payment.service';
import { DividendPayment, UpdateDividendPaymentDto, SecurityTransactionWithSecurity, TransactionType } from '@dividends/shared';

@Injectable({
  providedIn: 'root',
})
export class DividendDataService {
  private readonly dividendPaymentService = inject(DividendPaymentService);
  private transactions = signal<DividendTransaction[]>([]);

  getTransactions() {
    return this.transactions.asReadonly();
  }

  clearTransactions() {
    this.transactions.set([]);
  }

  addTransaction(transaction: Omit<DividendTransaction, 'id'>) {
    const newTransaction = {
      ...transaction,
      id: Date.now(),
    };
    this.transactions.update((txs) => [...txs, newTransaction]);
  }

  updateTransaction(id: string, updatedPayment: DividendPayment & { security?: { name?: string } }) {
    const converted = this.convertToTransaction(updatedPayment);
    this.transactions.update((txs) =>
      txs.map((tx) => {
        const txId = typeof tx.id === 'string' ? tx.id : String(tx.id);
        return txId === id ? converted : tx;
      })
    );
  }

  deleteTransaction(id: string) {
    this.transactions.update((txs) =>
      txs.filter((tx) => {
        const txId = typeof tx.id === 'string' ? tx.id : String(tx.id);
        return txId !== id;
      })
    );
  }

  // Update transaction via backend
  updateTransactionViaBackend(id: string, dto: UpdateDividendPaymentDto) {
    this.dividendPaymentService.updateDividendPayment(id, dto).subscribe({
      next: (updatedPayment) => {
        this.updateTransaction(id, updatedPayment);
      },
      error: (error) => {
        console.error('Error updating dividend payment:', error);
        throw error;
      }
    });
  }

  // Delete transaction via backend
  deleteTransactionViaBackend(id: string) {
    this.dividendPaymentService.deleteDividendPayment(id).subscribe({
      next: () => {
        this.deleteTransaction(id);
      },
      error: (error) => {
        console.error('Error deleting dividend payment:', error);
        throw error;
      }
    });
  }

  // Load transactions from backend
  loadTransactionsFromBackend() {
    this.dividendPaymentService.getDividendPayments().subscribe({
      next: (payments) => {
        // Convert DividendPayment[] to DividendTransaction[]
        const converted = payments.map((payment: DividendPayment & { security?: { name?: string } }) =>
          this.convertToTransaction(payment)
        );
        this.transactions.set(converted);
      },
      error: (error) => {
        console.error('Error loading dividend payments:', error);
      }
    });
  }

  // Convert DividendPayment to DividendTransaction
  convertToTransaction(payment: DividendPayment & { security?: { name?: string } }): DividendTransaction {
    return {
      id: payment.id,
      date: new Date(payment.payoutDate).toISOString().split('T')[0],
      exDate: new Date(payment.exDate).toISOString().split('T')[0],
      name: payment.security?.name || 'Unknown',
      securityId: payment.securityId,
      amount: Number(payment.shares),
      dividend: Number(payment.dividendYield),
      taxes: Number(payment.taxAmount),
      currency: payment.originCurrency as 'EUR' | 'USD' | 'NOK' | 'GBP',
      rate: Number(payment.conversionRate),
      finalPayment: Number(payment.finalPayment),
      buyPrice: 0, // Set to 0 as buyPrice is not stored in backend
      note: payment.note,
    };
  }

  getFilteredTransactions(range: TimeRange, searchTerm = ''): DividendTransaction[] {
    const now = new Date();
    let cutoff: Date | null = null;

    if (range === 'M') {
      cutoff = new Date();
      cutoff.setMonth(now.getMonth() - 1);
    } else if (range === 'Y') {
      cutoff = new Date();
      cutoff.setFullYear(now.getFullYear() - 1);
    } else if (range === '5Y') {
      cutoff = new Date();
      cutoff.setFullYear(now.getFullYear() - 5);
    }

    let filtered = this.transactions();
    if (cutoff) {
      filtered = filtered.filter((t) => new Date(t.date) >= cutoff);
    }

    if (searchTerm) {
      filtered = filtered.filter((t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }

  calculateKPIs(
    transactions: DividendTransaction[],
    securityTransactions: SecurityTransactionWithSecurity[] = []
  ): DashboardKPIs {
    let totalNet = 0;
    let totalTaxesEur = 0;
    let yieldSum = 0;
    let yieldCount = 0;

    transactions.forEach((t) => {
      totalNet += t.finalPayment;
      const safeRate = t.rate && t.rate > 0 ? t.rate : 1;
      totalTaxesEur += t.taxes / safeRate;

      if (t.buyPrice && t.buyPrice > 0) {
        const divInEur = t.dividend / safeRate;
        const yoc = (divInEur / t.buyPrice) * 100;
        yieldSum += yoc;
        yieldCount++;
      }
    });

    const avgYield = yieldCount > 0 ? yieldSum / yieldCount : 0;

    // Calculate total investment from security transactions
    let totalInvestment = 0;
    securityTransactions.forEach((tx) => {
      if (tx.type === TransactionType.BUY) {
        const quantity = Number(tx.quantity) || 0;
        const pricePerShare = Number(tx.pricePerShare) || 0;
        const fees = Number(tx.fees) || 0;
        totalInvestment += quantity * pricePerShare + fees;
      }
    });

    // Calculate personal return as percentage
    const personalReturn = totalInvestment > 0 ? (totalNet / totalInvestment) * 100 : 0;

    return {
      totalNet,
      totalTaxes: totalTaxesEur,
      avgYield,
      count: transactions.length,
      personalReturn,
      totalInvestment,
    };
  }
}
