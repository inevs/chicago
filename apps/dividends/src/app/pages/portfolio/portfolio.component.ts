import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../services/app-state.service';
import { SecuritiesSummaryComponent } from './securities-summary/securities-summary.component';

@Component({
  selector: 'app-portfolio',
  imports: [CommonModule, SecuritiesSummaryComponent],
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.scss'],
})
export class PortfolioComponent {
  protected readonly appState = inject(AppStateService);
}
