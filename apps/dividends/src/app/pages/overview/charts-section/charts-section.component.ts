import { Component, OnDestroy, effect, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration } from 'chart.js';
import { setupChartDefaults } from '../../../shared/charts/chart-defaults';
import { DividendTransaction, TimeRange } from '../../../models/dividend.model';

setupChartDefaults();

@Component({
  selector: 'app-charts-section',
  imports: [CommonModule],
  templateUrl: './charts-section.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./charts-section.component.scss'],
})
export class ChartsSectionComponent implements OnDestroy {
  transactions = input.required<DividendTransaction[]>();
  isDarkMode = input.required<boolean>();
  currentRange = input.required<TimeRange>();

  private monthlyChart: Chart | null = null;
  private allocationChart: Chart | null = null;

  constructor() {
    effect(() => {
      const data = this.transactions();
      const isDark = this.isDarkMode();
      const range = this.currentRange();
      if (data.length >= 0) {
        setTimeout(() => this.renderCharts(data, isDark, range), 0);
      }
    });
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  private destroyCharts() {
    if (this.monthlyChart) {
      this.monthlyChart.destroy();
      this.monthlyChart = null;
    }
    if (this.allocationChart) {
      this.allocationChart.destroy();
      this.allocationChart = null;
    }
  }

  private renderCharts(data: DividendTransaction[], isDark: boolean, range: TimeRange) {
    const monthsMap: Map<string, { date: Date; amount: number }> = new Map();
    const companies: Record<string, number> = {};

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

      companies[t.name] = (companies[t.name] || 0) + t.finalPayment;
    });

    // Sort by actual date (ascending: oldest to newest)
    const sortedMonths = Array.from(monthsMap.entries())
      .sort((a, b) => a[1].date.getTime() - b[1].date.getTime());

    const months: Record<string, number> = {};
    sortedMonths.forEach(([label, data]) => {
      months[label] = data.amount;
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

    // Data is already sorted in renderCharts
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

    // Sort companies by value (descending: highest to lowest)
    const sortedCompanies = Object.entries(companies)
      .sort((a, b) => b[1] - a[1]);

    const colors = [
      '#10B981',
      '#3B82F6',
      '#6366F1',
      '#8B5CF6',
      '#EC4899',
      '#F59E0B',
      '#14B8A6',
      '#EF4444',
      '#F97316',
      '#84CC16',
    ];

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: sortedCompanies.map(([name]) => name),
        datasets: [
          {
            data: sortedCompanies.map(([, value]) => value),
            backgroundColor: sortedCompanies.map((_, i) => colors[i % colors.length]),
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

  private parseMonthLabel(label: string): Date {
    // Map of German month names (both short and long forms)
    const germanMonths: Record<string, number> = {
      'Jan': 0, 'Januar': 0,
      'Feb': 1, 'Februar': 1,
      'Mär': 2, 'März': 2,
      'Apr': 3, 'April': 3,
      'Mai': 4,
      'Jun': 5, 'Juni': 5,
      'Jul': 6, 'Juli': 6,
      'Aug': 7, 'August': 7,
      'Sep': 8, 'Sept': 8, 'September': 8,
      'Okt': 9, 'Oktober': 9,
      'Nov': 10, 'November': 10,
      'Dez': 11, 'Dezember': 11
    };

    // Try to parse labels like "Juni 18", "Dez 23", "Januar 24", etc.
    const monthYearMatch = label.match(/^(\w+)\.?\s+(\d{2})$/);
    if (monthYearMatch) {
      const [, monthStr, yearStr] = monthYearMatch;
      const monthIndex = germanMonths[monthStr];
      if (monthIndex !== undefined) {
        return new Date(2000 + parseInt(yearStr), monthIndex, 1);
      }
    }

    // Try to parse full month names without year (like "Januar", "Februar")
    const monthIndex = germanMonths[label];
    if (monthIndex !== undefined) {
      return new Date(new Date().getFullYear(), monthIndex, 1);
    }

    // Fallback: return current date
    return new Date();
  }
}
