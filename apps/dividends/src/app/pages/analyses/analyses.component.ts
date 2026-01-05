import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioStateService } from '../../services/portfolio-state.service';
import { MonthlyDividendsChartComponent } from './monthly-dividends-chart/monthly-dividends-chart.component';

@Component({
  selector: 'app-analyses',
  imports: [CommonModule, MonthlyDividendsChartComponent],
  templateUrl: './analyses.component.html',
  styleUrls: ['./analyses.component.scss'],
})
export class AnalysesComponent {
  protected readonly portfolioState = inject(PortfolioStateService);

  // Expose for template access
  protected get appState() {
    return this.portfolioState;
  }
}
