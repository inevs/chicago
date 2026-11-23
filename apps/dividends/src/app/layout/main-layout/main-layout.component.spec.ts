import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, Type, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MainLayoutComponent } from './main-layout.component';
import { TransactionModalComponent, TransactionForm } from '../../shared/modals/transaction-modal/transaction-modal.component';
import { SecurityModalComponent, SecurityForm } from '../../shared/modals/security-modal/security-modal.component';
import {
  SecurityTransactionModalComponent,
  SecurityTransactionForm,
} from '../../shared/modals/security-transaction-modal/security-transaction-modal.component';
import { CurrencyModalComponent, CurrencyForm } from '../../shared/modals/currency-modal/currency-modal.component';
import { ImportConfirmModalComponent } from '../../shared/modals/import-confirm-modal/import-confirm-modal.component';
import { AuthService } from '../../services/auth.service';
import { PortfolioStateService } from '../../services/portfolio-state.service';
import { TransactionFacadeService } from '../../services/transaction-facade.service';
import { UiStateService } from '../../services/ui-state.service';

describe('MainLayoutComponent', () => {
  let isAuthenticated: ReturnType<typeof signal<boolean>>;
  let portfolioState: { loadAllData: ReturnType<typeof vi.fn>; clearAllData: ReturnType<typeof vi.fn> };

  function createComponent(authenticated: boolean) {
    isAuthenticated = signal(authenticated);
    portfolioState = { loadAllData: vi.fn(), clearAllData: vi.fn() };

    TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [
        { provide: AuthService, useValue: { isAuthenticated } },
        { provide: PortfolioStateService, useValue: portfolioState },
        { provide: TransactionFacadeService, useValue: {} },
        { provide: UiStateService, useValue: {} },
      ],
    }).overrideComponent(MainLayoutComponent, {
      // Only the data loading logic is under test, not the child components
      set: { imports: [], template: '' },
    });

    const fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('loads all data on startup when the user is authenticated', () => {
    createComponent(true);

    expect(portfolioState.loadAllData).toHaveBeenCalledTimes(1);
    expect(portfolioState.clearAllData).not.toHaveBeenCalled();
  });

  it('does not load data on startup when the user is not authenticated', () => {
    createComponent(false);

    expect(portfolioState.loadAllData).not.toHaveBeenCalled();
    expect(portfolioState.clearAllData).toHaveBeenCalledTimes(1);
  });

  it('loads all data after a login', () => {
    const fixture = createComponent(false);

    isAuthenticated.set(true);
    fixture.detectChanges();

    expect(portfolioState.loadAllData).toHaveBeenCalledTimes(1);
  });

  it('clears all data after a logout and reloads it after the next login', () => {
    const fixture = createComponent(true);

    isAuthenticated.set(false);
    fixture.detectChanges();
    expect(portfolioState.clearAllData).toHaveBeenCalledTimes(1);

    isAuthenticated.set(true);
    fixture.detectChanges();
    expect(portfolioState.loadAllData).toHaveBeenCalledTimes(2);
  });
});

describe('MainLayoutComponent global modals', () => {
  const currencies = [{ code: 'EUR', name: 'Euro' }];
  const defaultCurrency = currencies[0];

  let uiState: Record<string, unknown> & {
    showTransactionModal: WritableSignal<boolean>;
    showSecurityModal: WritableSignal<boolean>;
    showSecurityTransactionModal: WritableSignal<boolean>;
    showCurrencyModal: WritableSignal<boolean>;
    showImportConfirmModal: WritableSignal<boolean>;
  };
  let transactionFacade: Record<string, ReturnType<typeof vi.fn>>;

  async function createComponent() {
    uiState = {
      isDarkMode: signal(false),
      sidebarCollapsed: signal(false),
      selectedTimeRange: signal('ALL'),
      showMenu: signal(false),
      showTransactionModal: signal(false),
      showSecurityModal: signal(false),
      showSecurityTransactionModal: signal(false),
      showCurrencyModal: signal(false),
      showImportConfirmModal: signal(false),
      editingTransaction: signal(null),
      editingSecurity: signal(null),
      editingSecurityTransaction: signal(null),
      deletingTransaction: signal(null),
      deletingSecurityTransaction: signal(null),
      toggleTransactionModal: vi.fn(),
      toggleSecurityModal: vi.fn(),
      toggleSecurityTransactionModal: vi.fn(),
      toggleCurrencyModal: vi.fn(),
    };
    transactionFacade = {
      handleTransactionSubmit: vi.fn(),
      handleSecuritySubmit: vi.fn(),
      handleSecurityTransactionSubmit: vi.fn(),
      handleImportConfirm: vi.fn(),
      addCurrency: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isAuthenticated: signal(false) } },
        {
          provide: PortfolioStateService,
          useValue: {
            loadAllData: vi.fn(),
            clearAllData: vi.fn(),
            currencies: signal(currencies),
            defaultCurrency: signal(defaultCurrency),
            getSharesAtDate: vi.fn(() => 0),
          },
        },
        { provide: TransactionFacadeService, useValue: transactionFacade },
        { provide: UiStateService, useValue: uiState },
      ],
    });

    const fixture = TestBed.createComponent(MainLayoutComponent);
    await fixture.whenStable();
    return fixture;
  }

  async function openModal<T>(
    fixture: ComponentFixture<MainLayoutComponent>,
    flag: WritableSignal<boolean>,
    modal: Type<T>
  ): Promise<T> {
    flag.set(true);
    await fixture.whenStable();
    const debugElement = fixture.debugElement.query(By.directive(modal));
    expect(debugElement).not.toBeNull();
    return debugElement.componentInstance as T;
  }

  it('shows the transaction modal with the currencies and forwards its events', async () => {
    const fixture = await createComponent();

    const modal = await openModal(fixture, uiState.showTransactionModal, TransactionModalComponent);

    expect(modal.show()).toBe(true);
    expect(modal.currencies()).toEqual(currencies);
    expect(modal.defaultCurrency()).toEqual(defaultCurrency);
    const form = { amount: 1 } as unknown as TransactionForm;
    modal.transactionSubmit.emit(form);
    expect(transactionFacade['handleTransactionSubmit']).toHaveBeenCalledWith(form);
    modal.closeModal.emit();
    expect(uiState['toggleTransactionModal']).toHaveBeenCalled();
  });

  it('shows the security modal with the currencies and forwards its events', async () => {
    const fixture = await createComponent();

    const modal = await openModal(fixture, uiState.showSecurityModal, SecurityModalComponent);

    expect(modal.show()).toBe(true);
    expect(modal.currencies()).toEqual(currencies);
    expect(modal.defaultCurrency()).toEqual(defaultCurrency);
    const form = { name: 'ACME' } as unknown as SecurityForm;
    modal.securitySubmit.emit(form);
    expect(transactionFacade['handleSecuritySubmit']).toHaveBeenCalledWith(form);
    modal.closeModal.emit();
    expect(uiState['toggleSecurityModal']).toHaveBeenCalled();
  });

  it('shows the security transaction modal with the currencies and forwards its events', async () => {
    const fixture = await createComponent();

    const modal = await openModal(
      fixture,
      uiState.showSecurityTransactionModal,
      SecurityTransactionModalComponent
    );

    expect(modal.show()).toBe(true);
    expect(modal.currencies()).toEqual(currencies);
    expect(modal.defaultCurrency()).toEqual(defaultCurrency);
    const form = { shares: 1 } as unknown as SecurityTransactionForm;
    modal.transactionSubmit.emit(form);
    expect(transactionFacade['handleSecurityTransactionSubmit']).toHaveBeenCalledWith(form);
    modal.closeModal.emit();
    expect(uiState['toggleSecurityTransactionModal']).toHaveBeenCalled();
  });

  it('shows the currency modal and forwards its events', async () => {
    const fixture = await createComponent();

    const modal = await openModal(fixture, uiState.showCurrencyModal, CurrencyModalComponent);

    expect(modal.show()).toBe(true);
    const form: CurrencyForm = { code: 'USD', name: 'US-Dollar' };
    modal.currencySubmit.emit(form);
    expect(transactionFacade['addCurrency']).toHaveBeenCalledWith(form);
    modal.closeModal.emit();
    expect(uiState['toggleCurrencyModal']).toHaveBeenCalled();
  });

  it('shows the import confirm modal and forwards the chosen import mode', async () => {
    const fixture = await createComponent();

    const modal = await openModal(fixture, uiState.showImportConfirmModal, ImportConfirmModalComponent);

    expect(modal.show()).toBe(true);
    modal.confirm.emit('merge');
    expect(transactionFacade['handleImportConfirm']).toHaveBeenCalledWith('merge');
  });
});
