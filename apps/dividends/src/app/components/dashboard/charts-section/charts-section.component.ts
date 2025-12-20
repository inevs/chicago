import { Component, OnDestroy, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { DividendTransaction, TimeRange } from '../../../models/dividend.model';

Chart.register(...registerables);

@Component({
  selector: 'app-charts-section',
  imports: [CommonModule],
  templateUrl: './charts-section.component.html',
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
    const months: Record<string, number> = {};
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
