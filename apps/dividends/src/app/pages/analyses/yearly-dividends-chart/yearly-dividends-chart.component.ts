import { Component, OnDestroy, effect, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration } from 'chart.js';
import { setupChartDefaults, chartAccent } from '../../../shared/charts/chart-defaults';
import { DividendTransaction, TimeRange } from '../../../models/dividend.model';

setupChartDefaults();

@Component({
  selector: 'app-yearly-dividends-chart',
  imports: [CommonModule],
  templateUrl: './yearly-dividends-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./yearly-dividends-chart.component.scss'],
})
export class YearlyDividendsChartComponent implements OnDestroy {
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
    const yearsMap: Map<string, { date: Date; amount: number }> = new Map();
    const textColor = isDark ? '#cbd5e1' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    data.forEach((t) => {
      const date = new Date(t.date);
      const year = date.getFullYear().toString();

      const existing = yearsMap.get(year);
      if (existing) {
        existing.amount += t.finalPayment;
      } else {
        yearsMap.set(year, { date, amount: t.finalPayment });
      }
    });

    // Sort by year (ascending: oldest to newest)
    const sortedYears = Array.from(yearsMap.entries())
      .sort((a, b) => a[1].date.getTime() - b[1].date.getTime());

    const years: Record<string, number> = {};
    sortedYears.forEach(([label, data]) => {
      years[label] = data.amount;
    });

    this.renderYearlyChart(years, isDark, textColor, gridColor);
  }

  private renderYearlyChart(
    years: Record<string, number>,
    isDark: boolean,
    textColor: string,
    gridColor: string
  ) {
    const canvas = document.getElementById('yearlyDividendsChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: Object.keys(years),
        datasets: [
          {
            label: 'Netto Dividende (€)',
            data: Object.values(years),
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
