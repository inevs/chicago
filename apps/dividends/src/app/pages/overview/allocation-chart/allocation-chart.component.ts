import { Component, OnDestroy, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { SecurityTransactionWithSecurity, SecurityPrice, TransactionType } from '@dividends/shared';
import { LatestExchangeRate } from '../../../services/exchange-rate.service';

Chart.register(...registerables);

@Component({
  selector: 'app-allocation-chart',
  imports: [CommonModule],
  templateUrl: './allocation-chart.component.html',
  styleUrls: ['./allocation-chart.component.scss'],
})
export class AllocationChartComponent implements OnDestroy {
  securityTransactions = input.required<SecurityTransactionWithSecurity[]>();
  latestPrices = input.required<SecurityPrice[]>();
  exchangeRates = input.required<LatestExchangeRate[]>();
  isDarkMode = input.required<boolean>();

  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      const data = this.securityTransactions();
      const prices = this.latestPrices();
      const rates = this.exchangeRates();
      const isDark = this.isDarkMode();
      if (data.length >= 0) {
        setTimeout(() => this.renderChart(data, prices, rates, isDark), 0);
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

  private renderChart(data: SecurityTransactionWithSecurity[], prices: SecurityPrice[], rates: LatestExchangeRate[], isDark: boolean) {
    const textColor = isDark ? '#cbd5e1' : '#64748b';

    // Build price map by security ID
    const priceMap = new Map<string, SecurityPrice>();
    prices.forEach(price => {
      priceMap.set(price.securityId, price);
    });

    // Build exchange rate map
    const exchangeRateMap = new Map<string, number>();
    rates.forEach(rate => {
      exchangeRateMap.set(rate.currency, rate.rate);
    });

    // Calculate holdings value per security
    const securitiesMap = new Map<string, {
      securityId: string;
      quantity: number;
    }>();

    // Aggregate security transactions (BUY/SELL)
    data.forEach(tx => {
      const securityName = tx.security?.name;
      const securityId = tx.security?.id;
      if (!securityName || !securityId) return;

      const current = securitiesMap.get(securityName) || {
        securityId,
        quantity: 0,
      };

      const quantity = Number(tx.quantity) || 0;

      if (tx.type === TransactionType.BUY) {
        current.quantity += quantity;
      } else if (tx.type === TransactionType.SELL) {
        current.quantity -= quantity;
      }

      securitiesMap.set(securityName, current);
    });

    // Convert to current value in EUR using latest prices (only securities with holdings > 0)
    const EPSILON = 0.0001;
    const companies: Record<string, number> = {};

    securitiesMap.forEach((data, name) => {
      if (data.quantity > EPSILON) {
        const price = priceMap.get(data.securityId);
        if (price) {
          const currentPrice = Number(price.close);
          // Current value = current quantity × current price
          let currentValue = data.quantity * currentPrice;

          // Convert to EUR if needed
          if (price.currency === 'EUR') {
            // Already in EUR
            if (currentValue > 0) {
              companies[name] = currentValue;
            }
          } else {
            // Convert using exchange rate
            const exchangeRate = exchangeRateMap.get(price.currency);
            if (exchangeRate) {
              // Exchange rate is from EUR to currency, so we need to divide
              const currentValueEur = currentValue / exchangeRate;
              if (currentValueEur > 0) {
                companies[name] = currentValueEur;
              }
            }
            // If no exchange rate, skip this security
          }
        }
      }
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
