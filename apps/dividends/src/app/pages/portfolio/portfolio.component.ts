import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioStateService } from '../../services/portfolio-state.service';
import { TransactionFacadeService } from '../../services/transaction-facade.service';
import { SecuritiesSummaryComponent } from './securities-summary/securities-summary.component';

@Component({
  selector: 'app-portfolio',
  imports: [CommonModule, SecuritiesSummaryComponent],
  templateUrl: './portfolio.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./portfolio.component.scss'],
})
export class PortfolioComponent {
  protected readonly portfolioState = inject(PortfolioStateService);
  private readonly transactionFacade = inject(TransactionFacadeService);

  // Expose for template access
  protected get appState() {
    return this.portfolioState;
  }

  onEditSecurity(securityId: string): void {
    this.transactionFacade.openEditSecurityModal(securityId);
  }
}
