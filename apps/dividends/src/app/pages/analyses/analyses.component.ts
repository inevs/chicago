import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioStateService } from '../../services/portfolio-state.service';
import { UiStateService } from '../../services/ui-state.service';
import { MonthlyDividendsChartComponent } from './monthly-dividends-chart/monthly-dividends-chart.component';
import { YearlyDividendsChartComponent } from './yearly-dividends-chart/yearly-dividends-chart.component';

@Component({
  selector: 'app-analyses',
  imports: [CommonModule, MonthlyDividendsChartComponent, YearlyDividendsChartComponent],
  templateUrl: './analyses.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
