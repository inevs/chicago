import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioStateService } from '../../services/portfolio-state.service';
import { UiStateService } from '../../services/ui-state.service';
import { KpiCardsComponent } from './kpi-cards/kpi-cards.component';
import { AllocationChartComponent } from './allocation-chart/allocation-chart.component';

@Component({
  selector: 'app-overview',
  imports: [CommonModule, KpiCardsComponent, AllocationChartComponent],
  templateUrl: './overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./overview.component.scss'],
})
export class OverviewComponent {
  protected readonly portfolioState = inject(PortfolioStateService);
  protected readonly uiState = inject(UiStateService);

  // Expose for template access
  protected get appState() {
    return {
      // Portfolio State
      kpis: this.portfolioState.kpis,
      securityTransactions: this.portfolioState.securityTransactions,
      securityPrices: this.portfolioState.securityPrices,
      exchangeRates: this.portfolioState.exchangeRates,
      // UI State
      isDarkMode: this.uiState.isDarkMode,
    };
  }
}
