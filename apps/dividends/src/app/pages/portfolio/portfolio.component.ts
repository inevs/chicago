import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../services/app-state.service';
import { SecuritiesSummaryComponent } from '../../components/dashboard/securities-summary/securities-summary.component';
import { AllocationChartComponent } from '../../components/shared/charts/allocation-chart/allocation-chart.component';

@Component({
  selector: 'app-portfolio',
  imports: [CommonModule, SecuritiesSummaryComponent, AllocationChartComponent],
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.scss'],
})
export class PortfolioComponent {
  protected readonly appState = inject(AppStateService);
}
