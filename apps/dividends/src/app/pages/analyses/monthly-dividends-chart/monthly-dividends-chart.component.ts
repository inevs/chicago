import { Component, OnDestroy, effect, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration } from 'chart.js';
import { setupChartDefaults, chartAccent } from '../../../shared/charts/chart-defaults';
import { DividendTransaction, TimeRange } from '../../../models/dividend.model';

setupChartDefaults();

@Component({
  selector: 'app-monthly-dividends-chart',
  imports: [CommonModule],
  templateUrl: './monthly-dividends-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./monthly-dividends-chart.component.scss'],
})
export class MonthlyDividendsChartComponent implements OnDestroy {
  transactions = input.required<DividendTransaction[]>();
  isDarkMode = input.required<boolean>();
  currentRange = input.required<TimeRange>();

  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      const data = this.transactions();
      const isDark = this.isDarkMode();
      const range = this.currentRange();
      if (data.length >= 0) {
        setTimeout(() => this.renderChart(data, isDark, range), 0);
      }
    });
  }

  ngOnDestroy() {
    this.destroyChart();
  }

  private destroyChart() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  private renderChart(data: DividendTransaction[], isDark: boolean, range: TimeRange) {
    const monthsMap: Map<string, { date: Date; amount: number }> = new Map();
    const textColor = isDark ? '#cbd5e1' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    data.forEach((t) => {
      const date = new Date(t.date);
      let timeKey: string;

      if (range === 'ALL' || range === '5Y') {
        timeKey = date.toLocaleDateString('de-DE', {
          month: 'short',
          year: '2-digit',
        });
      } else {
        timeKey = date.toLocaleDateString('de-DE', { month: 'long' });
      }

      const existing = monthsMap.get(timeKey);
      if (existing) {
        existing.amount += t.finalPayment;
      } else {
        monthsMap.set(timeKey, { date, amount: t.finalPayment });
      }
    });

    // Sort by actual date (ascending: oldest to newest)
    const sortedMonths = Array.from(monthsMap.entries())
      .sort((a, b) => a[1].date.getTime() - b[1].date.getTime());

    const months: Record<string, number> = {};
    sortedMonths.forEach(([label, data]) => {
      months[label] = data.amount;
    });

    this.renderMonthlyChart(months, isDark, textColor, gridColor);
  }

  private renderMonthlyChart(
    months: Record<string, number>,
    isDark: boolean,
    textColor: string,
    gridColor: string
  ) {
    const canvas = document.getElementById('monthlyDividendsChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: Object.keys(months),
        datasets: [
          {
            label: 'Netto Dividende (€)',
            data: Object.values(months),
            backgroundColor: chartAccent(isDark),
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

    this.chart = new Chart(canvas, config);
  }
}
