import { Component, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { DividendDataService } from '../../services/dividend-data.service';
import { TimeRange, DividendTransaction } from '../../models/dividend.model';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  currentRange = signal<TimeRange>('ALL');
  searchTerm = signal('');
  isDarkMode = signal(false);
  showModal = signal(false);
  showSecurityModal = signal(false);
  showMenu = signal(false);

  filteredTransactions = computed(() => {
    return this.dataService.getFilteredTransactions(
      this.currentRange(),
      this.searchTerm()
    );
  });

  kpis = computed(() => {
    return this.dataService.calculateKPIs(this.filteredTransactions());
  });

  sortedTransactions = computed(() => {
    return [...this.filteredTransactions()].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  });

  private monthlyChart: Chart | null = null;
  private allocationChart: Chart | null = null;

  newTransaction = {
    name: '',
    date: '',
    amount: 0,
    dividend: 0,
    currency: 'EUR' as 'EUR' | 'USD' | 'NOK',
    rate: 1.0,
    taxes: 0,
    buyPrice: 0,
    finalPayment: 0,
  };

  newSecurity = {
    name: '',
    isin: '',
    wkn: '',
    symbol: '',
    type: 'STOCK' as 'STOCK' | 'ETF' | 'BOND',
    exchange: '',
    currency: 'EUR' as 'EUR' | 'USD' | 'NOK',
  };

  constructor(private dataService: DividendDataService) {
    // Effect to re-render charts when filtered data or theme changes
    effect(() => {
      const data = this.filteredTransactions();
      const isDark = this.isDarkMode();
      if (data.length >= 0) {
        setTimeout(() => this.renderCharts(data, isDark), 0);
      }
    });
  }

  ngOnInit() {
    this.initTheme();
  }

  initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      this.isDarkMode.set(true);
      document.documentElement.classList.add('dark');
    } else {
      this.isDarkMode.set(false);
      document.documentElement.classList.remove('dark');
    }
  }

  toggleTheme() {
    const newDarkMode = !this.isDarkMode();
    this.isDarkMode.set(newDarkMode);

    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }

  setRange(range: TimeRange) {
    this.currentRange.set(range);
  }

  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  toggleModal() {
    this.showModal.update((show) => !show);
    this.showMenu.set(false);
  }

  toggleSecurityModal() {
    this.showSecurityModal.update((show) => !show);
    this.showMenu.set(false);
  }

  toggleMenu() {
    this.showMenu.update((show) => !show);
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

  handleFormSubmit() {
    this.dataService.addTransaction(this.newTransaction);
    this.toggleModal();
    this.resetForm();
  }

  resetForm() {
    this.newTransaction = {
      name: '',
      date: '',
      amount: 0,
      dividend: 0,
      currency: 'EUR',
      rate: 1.0,
      taxes: 0,
      buyPrice: 0,
      finalPayment: 0,
    };
  }

  handleSecurityFormSubmit() {
    // TODO: Implement security creation logic
    console.log('New security:', this.newSecurity);
    this.toggleSecurityModal();
    this.resetSecurityForm();
  }

  resetSecurityForm() {
    this.newSecurity = {
      name: '',
      isin: '',
      wkn: '',
      symbol: '',
      type: 'STOCK',
      exchange: '',
      currency: 'EUR',
    };
  }

  private renderCharts(data: DividendTransaction[], isDark: boolean) {
    const months: Record<string, number> = {};
    const companies: Record<string, number> = {};

    const textColor = isDark ? '#cbd5e1' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    data.forEach((t) => {
      const date = new Date(t.date);
      let timeKey: string;

      if (this.currentRange() === 'ALL' || this.currentRange() === '5Y') {
        timeKey = date.toLocaleDateString('de-DE', {
          month: 'short',
          year: '2-digit',
        });
      } else {
        timeKey = date.toLocaleDateString('de-DE', { month: 'long' });
      }

      months[timeKey] = (months[timeKey] || 0) + t.finalPayment;
      companies[t.name] = (companies[t.name] || 0) + t.finalPayment;
    });

    this.renderMonthlyChart(months, isDark, textColor, gridColor);
    this.renderAllocationChart(companies, isDark, textColor);
  }

  private renderMonthlyChart(
    months: Record<string, number>,
    isDark: boolean,
    textColor: string,
    gridColor: string
  ) {
    const canvas = document.getElementById('monthlyChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.monthlyChart) {
      this.monthlyChart.destroy();
    }

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: Object.keys(months),
        datasets: [
          {
            label: 'Netto Dividende (€)',
            data: Object.values(months),
            backgroundColor: '#3b82f6',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#1e293b' : '#fff',
            titleColor: isDark ? '#fff' : '#0f172a',
            bodyColor: isDark ? '#cbd5e1' : '#334155',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            borderWidth: 1,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: { color: textColor },
          },
          x: {
            grid: { display: false },
            ticks: { color: textColor },
          },
        },
      },
    };

    this.monthlyChart = new Chart(canvas, config);
  }

  private renderAllocationChart(
    companies: Record<string, number>,
    isDark: boolean,
    textColor: string
  ) {
    const canvas = document.getElementById('allocationChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.allocationChart) {
      this.allocationChart.destroy();
    }

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: Object.keys(companies),
        datasets: [
          {
            data: Object.values(companies),
            backgroundColor: [
              '#10B981',
              '#3B82F6',
              '#6366F1',
              '#8B5CF6',
              '#EC4899',
              '#F59E0B',
              '#14B8A6',
            ],
            borderColor: isDark ? '#1e293b' : '#fff',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 12,
              font: { size: 11 },
              color: textColor,
            },
          },
          tooltip: {
            backgroundColor: isDark ? '#1e293b' : '#fff',
            titleColor: isDark ? '#fff' : '#0f172a',
            bodyColor: isDark ? '#cbd5e1' : '#334155',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            borderWidth: 1,
          },
        },
      },
    };

    this.allocationChart = new Chart(canvas, config);
  }
}
