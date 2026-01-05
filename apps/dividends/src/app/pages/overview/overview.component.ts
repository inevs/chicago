import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioStateService } from '../../services/portfolio-state.service';
import { KpiCardsComponent } from './kpi-cards/kpi-cards.component';
import { AllocationChartComponent } from './allocation-chart/allocation-chart.component';

@Component({
  selector: 'app-overview',
  imports: [CommonModule, KpiCardsComponent, AllocationChartComponent],
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
})
export class OverviewComponent {
  protected readonly portfolioState = inject(PortfolioStateService);

  // Expose for template access
  protected get appState() {
    return this.portfolioState;
  }
}
