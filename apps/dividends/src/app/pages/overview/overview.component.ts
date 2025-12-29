import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../services/app-state.service';
import { KpiCardsComponent } from '../../components/dashboard/kpi-cards/kpi-cards.component';

@Component({
  selector: 'app-overview',
  imports: [CommonModule, KpiCardsComponent],
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
})
export class OverviewComponent {
  protected readonly appState = inject(AppStateService);
}
