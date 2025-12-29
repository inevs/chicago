import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../services/app-state.service';
import { MonthlyDividendsChartComponent } from '../../components/shared/charts/monthly-dividends-chart/monthly-dividends-chart.component';

@Component({
  selector: 'app-analyses',
  imports: [CommonModule, MonthlyDividendsChartComponent],
  templateUrl: './analyses.component.html',
  styleUrls: ['./analyses.component.scss'],
})
export class AnalysesComponent {
  protected readonly appState = inject(AppStateService);
}
