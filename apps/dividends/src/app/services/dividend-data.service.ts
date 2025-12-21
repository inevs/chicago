import { Injectable, signal } from '@angular/core';
import { DividendTransaction, TimeRange, DashboardKPIs } from '../models/dividend.model';

@Injectable({
  providedIn: 'root',
})
export class DividendDataService {
  private transactions = signal<DividendTransaction[]>([
    {
      id: 1,
      date: '2024-03-14',
      name: 'Microsoft Corp.',
      amount: 22,
      dividend: 0.75,
      taxes: 2.48,
      currency: 'USD',
      rate: 1.0909,
      finalPayment: 12.78,
      buyPrice: 240.5,
    },
    {
      id: 2,
      date: '2024-03-26',
      name: 'MPC Container Ships',
      amount: 1000,
      dividend: 1.3734,
      taxes: 343.35,
      currency: 'NOK',
      rate: 11.649,
      finalPayment: 88.42,
      buyPrice: 1.45,
    },
    {
      id: 3,
      date: '2024-05-13',
      name: 'Allianz SE',
      amount: 25,
      dividend: 13.8,
      taxes: 0,
      currency: 'EUR',
      rate: 1.0,
      finalPayment: 345.0,
      buyPrice: 210.0,
    },
    {
      id: 4,
      date: '2024-05-14',
      name: 'Mercedes-Benz Group',
      amount: 118,
      dividend: 5.3,
      taxes: 0,
      currency: 'EUR',
      rate: 1.0,
      finalPayment: 625.4,
      buyPrice: 62.5,
    },
    {
      id: 5,
      date: '2024-06-13',
      name: 'Microsoft Corp.',
      amount: 22,
      dividend: 0.75,
      taxes: 2.48,
      currency: 'USD',
      rate: 1.0825,
      finalPayment: 12.95,
      buyPrice: 240.5,
    },
    {
      id: 6,
      date: '2024-06-27',
      name: 'MPC Container Ships',
      amount: 1000,
      dividend: 1.3729,
      taxes: 343.23,
      currency: 'NOK',
      rate: 11.421,
      finalPayment: 90.16,
      buyPrice: 1.45,
    },
    {
      id: 7,
      date: '2024-06-28',
      name: 'Flex LNG Ltd.',
      amount: 100,
      dividend: 7.92,
      taxes: 0,
      currency: 'NOK',
      rate: 11.294,
      finalPayment: 70.16,
      buyPrice: 28.5,
    },
    {
      id: 8,
      date: '2024-09-12',
      name: 'Microsoft Corp.',
      amount: 22,
      dividend: 0.75,
      taxes: 2.48,
      currency: 'USD',
      rate: 1.1052,
      finalPayment: 12.69,
      buyPrice: 240.5,
    },
    {
      id: 9,
      date: '2024-09-24',
      name: 'MPC Container Ships',
      amount: 1000,
      dividend: 1.0583,
      taxes: 264.58,
      currency: 'NOK',
      rate: 11.633,
      finalPayment: 68.23,
      buyPrice: 1.45,
    },
    {
      id: 10,
      date: '2024-10-31',
      name: 'JPMorgan Chase & Co.',
      amount: 757,
      dividend: 1.25,
      taxes: 0.14,
      currency: 'USD',
      rate: 1.0899,
      finalPayment: 868.07,
      buyPrice: 145.0,
    },
    {
      id: 11,
      date: '2024-11-07',
      name: 'ASML Holding N.V.',
      amount: 412,
      dividend: 1.64,
      taxes: 0.1,
      currency: 'USD',
      rate: 1.0794,
      finalPayment: 626.4,
      buyPrice: 580.0,
    },
    {
      id: 12,
      date: '2023-11-01',
      name: 'Test Old Data',
      amount: 10,
      dividend: 5.0,
      taxes: 0,
      currency: 'EUR',
      rate: 1.0,
      finalPayment: 50.0,
      buyPrice: 100.0,
    },
  ]);

  getTransactions() {
    return this.transactions.asReadonly();
  }

  addTransaction(transaction: Omit<DividendTransaction, 'id'>) {
    const newTransaction = {
      ...transaction,
      id: Date.now(),
    };
    this.transactions.update((txs) => [...txs, newTransaction]);
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

  calculateKPIs(transactions: DividendTransaction[]): DashboardKPIs {
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

    return {
      totalNet,
      totalTaxes: totalTaxesEur,
      avgYield,
      count: transactions.length,
    };
  }
}
