import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { UiStateService } from '../../services/ui-state.service';
import { PortfolioStateService } from '../../services/portfolio-state.service';
import { TransactionFacadeService } from '../../services/transaction-facade.service';
import { TransactionModalComponent } from '../../shared/modals/transaction-modal/transaction-modal.component';
import { SecurityModalComponent } from '../../shared/modals/security-modal/security-modal.component';
import { SecurityTransactionModalComponent } from '../../shared/modals/security-transaction-modal/security-transaction-modal.component';
import { ImportConfirmModalComponent } from '../../shared/modals/import-confirm-modal/import-confirm-modal.component';
import { CurrencyModalComponent } from '../../shared/modals/currency-modal/currency-modal.component';
// Type-only import: a value import would pull the currency modal and
// @angular/forms back into the initial bundle.
import type { CurrencyForm } from '../../shared/modals/currency-modal/currency-modal.component';

/**
 * The modals that can be opened from anywhere in the app (via UiStateService).
 * Each modal is wrapped in a @defer block, so it is loaded on first use.
 */
@Component({
  selector: 'app-global-modals',
  imports: [
    TransactionModalComponent,
    SecurityModalComponent,
    SecurityTransactionModalComponent,
    ImportConfirmModalComponent,
    CurrencyModalComponent,
  ],
  templateUrl: './global-modals.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalModalsComponent {
  protected readonly uiState = inject(UiStateService);
  protected readonly portfolioState = inject(PortfolioStateService);
  protected readonly transactionFacade = inject(TransactionFacadeService);

  onCurrencySubmit(form: CurrencyForm) {
    this.transactionFacade.addCurrency(form);
  }
}
