import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../services/app-state.service';
import { KpiCardsComponent } from './kpi-cards/kpi-cards.component';
import { AllocationChartComponent } from './allocation-chart/allocation-chart.component';

@Component({
  selector: 'app-overview',
  imports: [CommonModule, KpiCardsComponent, AllocationChartComponent],
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
})
export class OverviewComponent {
  protected readonly appState = inject(AppStateService);
}
