import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface KPIData {
  totalNet: number;
  totalTaxes: number;
  avgYield: number;
  count: number;
  personalReturn: number;
  totalInvestment: number;
}

@Component({
  selector: 'app-kpi-cards',
  imports: [CommonModule],
  templateUrl: './kpi-cards.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./kpi-cards.component.scss'],
})
export class KpiCardsComponent {
  kpis = input.required<KPIData>();

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
}
