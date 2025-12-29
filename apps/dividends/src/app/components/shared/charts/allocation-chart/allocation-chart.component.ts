import { Component, OnDestroy, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { DividendTransaction } from '../../../../models/dividend.model';

Chart.register(...registerables);

@Component({
  selector: 'app-allocation-chart',
  imports: [CommonModule],
  templateUrl: './allocation-chart.component.html',
  styleUrls: ['./allocation-chart.component.scss'],
})
export class AllocationChartComponent implements OnDestroy {
  transactions = input.required<DividendTransaction[]>();
  isDarkMode = input.required<boolean>();

  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      const data = this.transactions();
      const isDark = this.isDarkMode();
      if (data.length >= 0) {
        setTimeout(() => this.renderChart(data, isDark), 0);
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

  private renderChart(data: DividendTransaction[], isDark: boolean) {
    const companies: Record<string, number> = {};
    const textColor = isDark ? '#cbd5e1' : '#64748b';

    data.forEach((t) => {
      companies[t.name] = (companies[t.name] || 0) + t.finalPayment;
    });

    this.renderAllocationChart(companies, isDark, textColor);
  }

  private renderAllocationChart(
    companies: Record<string, number>,
    isDark: boolean,
    textColor: string
  ) {
    const canvas = document.getElementById('allocationChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.chart) {
      this.chart.destroy();
    }

    // Sort companies by value (descending: highest to lowest)
    const sortedCompanies = Object.entries(companies)
      .sort((a, b) => b[1] - a[1]);

    const colors = [
      '#16A34A', // Emerald (our accent)
      '#3B82F6', // Blue
      '#6366F1', // Indigo
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#F59E0B', // Amber
      '#14B8A6', // Teal
      '#EF4444', // Red
      '#F97316', // Orange
      '#84CC16', // Lime
    ];

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: sortedCompanies.map(([name]) => name),
        datasets: [
          {
            data: sortedCompanies.map(([, value]) => value),
            backgroundColor: sortedCompanies.map((_, i) => colors[i % colors.length]),
            borderColor: isDark ? '#18181B' : '#FAFAF9', // Match sidebar colors
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
              padding: 10,
            },
          },
          tooltip: {
            backgroundColor: isDark ? '#1e293b' : '#fff',
            titleColor: isDark ? '#fff' : '#0f172a',
            bodyColor: isDark ? '#cbd5e1' : '#334155',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed;
                return ` ${label}: ${value.toFixed(2)} €`;
              },
            },
          },
        },
      },
    };

    this.chart = new Chart(canvas, config);
  }
}
