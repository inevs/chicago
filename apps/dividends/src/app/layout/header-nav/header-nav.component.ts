import { Component, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiStateService } from '../../services/ui-state.service';
import { PortfolioStateService } from '../../services/portfolio-state.service';
import { TransactionFacadeService } from '../../services/transaction-facade.service';
import { TimeRange } from '../../models/dividend.model';

@Component({
  selector: 'app-header-nav',
  imports: [CommonModule],
  templateUrl: './header-nav.component.html',
  styleUrls: ['./header-nav.component.scss'],
})
export class HeaderNavComponent {
  protected readonly uiState = inject(UiStateService);
  protected readonly portfolioState = inject(PortfolioStateService);
  private readonly transactionFacade = inject(TransactionFacadeService);

  // Expose for template access
  protected get appState() {
    return this.uiState;
  }

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  onRangeChange(range: TimeRange) {
    this.portfolioState.setTimeRange(range);
  }

  onThemeToggle() {
    this.uiState.toggleTheme();
  }

  onMenuToggle() {
    this.uiState.toggleMenu();
  }

  onNewTransactionClick() {
    this.uiState.toggleTransactionModal();
  }

  onNewSecurityClick() {
    this.uiState.toggleSecurityModal();
  }

  onNewSecurityTransactionClick() {
    this.uiState.toggleSecurityTransactionModal();
  }

  onNewCurrencyClick() {
    this.uiState.toggleCurrencyModal();
  }

  onExportDataClick() {
    this.transactionFacade.handleExportData();
  }

  onImportDataClick() {
    if (this.fileInput) {
      this.transactionFacade.handleImportData(this.fileInput);
    }
  }

  onFileSelected(event: Event) {
    this.transactionFacade.onFileSelected(event);
  }

  onMobileSidebarToggle() {
    this.uiState.toggleSidebar();
  }
}
