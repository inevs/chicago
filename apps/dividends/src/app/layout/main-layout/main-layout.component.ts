import { Component, inject, ChangeDetectionStrategy, effect, untracked } from '@angular/core';
import { AuthService } from '../../services/auth.service';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./main-layout.component.scss'],
})
export class MainLayoutComponent {
  protected readonly uiState = inject(UiStateService);
  protected readonly portfolioState = inject(PortfolioStateService);
  protected readonly transactionFacade = inject(TransactionFacadeService);
  private readonly authService = inject(AuthService);

  constructor() {
    // This component is the app's root layout and is created only once, so
    // data must be (re)loaded whenever the user logs in, not only on startup.
    // On logout the data is cleared so nothing of the previous session remains.
    effect(() => {
      const authenticated = this.authService.isAuthenticated();
      untracked(() => {
        if (authenticated) {
          this.portfolioState.loadAllData();
        } else {
          this.portfolioState.clearAllData();
        }
      });
    });
  }

  onCurrencySubmit(form: CurrencyForm) {
    this.transactionFacade.addCurrency(form);
  }
}
