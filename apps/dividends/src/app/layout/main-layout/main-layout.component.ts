import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { UiStateService } from '../../services/ui-state.service';
import { PortfolioStateService } from '../../services/portfolio-state.service';
import { TransactionFacadeService } from '../../services/transaction-facade.service';
import { SidebarNavComponent } from '../sidebar-nav/sidebar-nav.component';
import { HeaderNavComponent } from '../header-nav/header-nav.component';
import { TransactionModalComponent } from '../../shared/modals/transaction-modal/transaction-modal.component';
import { SecurityModalComponent } from '../../shared/modals/security-modal/security-modal.component';
import { SecurityTransactionModalComponent } from '../../shared/modals/security-transaction-modal/security-transaction-modal.component';
import { ImportConfirmModalComponent } from '../../shared/modals/import-confirm-modal/import-confirm-modal.component';
import { CurrencyModalComponent, CurrencyForm } from '../../shared/modals/currency-modal/currency-modal.component';
import { ToastContainerComponent } from '../../shared/toast-container/toast-container.component';

@Component({
  selector: 'app-main-layout',
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarNavComponent,
    HeaderNavComponent,
    TransactionModalComponent,
    SecurityModalComponent,
    SecurityTransactionModalComponent,
    ImportConfirmModalComponent,
    CurrencyModalComponent,
    ToastContainerComponent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
})
export class MainLayoutComponent implements OnInit {
  protected readonly uiState = inject(UiStateService);
  protected readonly portfolioState = inject(PortfolioStateService);
  protected readonly transactionFacade = inject(TransactionFacadeService);

  ngOnInit() {
    // Load all data on app initialization
    this.portfolioState.loadAllData();
  }

  onCurrencySubmit(form: CurrencyForm) {
    this.transactionFacade.addCurrency(form);
  }
}
