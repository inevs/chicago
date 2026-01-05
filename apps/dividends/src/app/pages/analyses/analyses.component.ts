import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioStateService } from '../../services/portfolio-state.service';
import { UiStateService } from '../../services/ui-state.service';
import { MonthlyDividendsChartComponent } from './monthly-dividends-chart/monthly-dividends-chart.component';

@Component({
  selector: 'app-analyses',
  imports: [CommonModule, MonthlyDividendsChartComponent],
  templateUrl: './analyses.component.html',
  styleUrls: ['./analyses.component.scss'],
})
export class AnalysesComponent {
  protected readonly portfolioState = inject(PortfolioStateService);
  protected readonly uiState = inject(UiStateService);

  // Expose for template access
  protected get appState() {
    return {
      // Portfolio State
      filteredDividends: this.portfolioState.filteredDividends,
      // UI State
      isDarkMode: this.uiState.isDarkMode,
      selectedTimeRange: this.uiState.selectedTimeRange,
    };
  }
}
