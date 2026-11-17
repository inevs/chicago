import type { Mocked } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { TransactionFacadeService } from './transaction-facade.service';
import { DividendPaymentService } from './dividend-payment.service';
import { SecurityTransactionService } from './security-transaction.service';
import { SecurityService } from './security.service';
import { CurrencyService } from './currency.service';
import { DataService } from './data.service';
import { ToastService } from './toast.service';
import { UiStateService } from './ui-state.service';
import { PortfolioStateService } from './portfolio-state.service';
import { TransactionForm } from '../shared/modals/transaction-modal/transaction-modal.component';
import { SecurityForm } from '../shared/modals/security-modal/security-modal.component';
import { SecurityTransactionForm } from '../shared/modals/security-transaction-modal/security-transaction-modal.component';
import { DividendTransaction } from '../models/dividend.model';
import {
  Security,
  SecurityTransactionWithSecurity,
  TransactionType,
} from '@dividends/shared';

describe('TransactionFacadeService', () => {
  let service: TransactionFacadeService;
  let mockDividendPaymentService: Mocked<Partial<DividendPaymentService>>;
  let mockSecurityTransactionService: Mocked<
    Partial<SecurityTransactionService>
  >;
  let mockSecurityService: Mocked<Partial<SecurityService>>;
  let mockCurrencyService: Mocked<Partial<CurrencyService>>;
  let mockDataService: Mocked<Partial<DataService>>;
  let mockToastService: Mocked<Partial<ToastService>>;
  let mockUiState: Mocked<Partial<UiStateService>>;
  let mockPortfolioState: Mocked<Partial<PortfolioStateService>>;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {
      /* ignore */
    });
    vi.spyOn(console, 'log').mockImplementation(() => {
      /* ignore */
    });

    mockDividendPaymentService = {
      createDividendPayment: vi.fn().mockReturnValue(of({})),
      updateDividendPayment: vi.fn().mockReturnValue(of({})),
      deleteDividendPayment: vi.fn().mockReturnValue(of({})),
    };

    mockSecurityTransactionService = {
      createSecurityTransaction: vi.fn().mockReturnValue(of({})),
      updateSecurityTransaction: vi.fn().mockReturnValue(of({})),
      deleteSecurityTransaction: vi.fn().mockReturnValue(of({})),
    };

    mockSecurityService = {
      createSecurity: vi.fn().mockReturnValue(of({})),
      updateSecurity: vi.fn().mockReturnValue(of({})),
      getSecurity: vi.fn().mockReturnValue(of({})),
    };

    mockCurrencyService = {
      createCurrency: vi.fn().mockReturnValue(
        of({
          id: '1',
          code: 'USD',
          name: 'US Dollar',
          symbol: '$',
          isDefault: false,
        })
      ),
    };

    mockDataService = {
      exportData: vi.fn().mockReturnValue(of(new Blob())),
      importData: vi.fn().mockReturnValue(
        of({
          currenciesImported: 1,
          securitiesImported: 1,
          dividendPaymentsImported: 1,
          securityTransactionsImported: 1,
          securityPricesImported: 1,
        })
      ),
      downloadExport: vi.fn(),
    };

    mockToastService = {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    };

    mockUiState = {
      editingTransaction: vi.fn().mockReturnValue(null),
      setEditingTransaction: vi.fn(),
      setDeletingTransaction: vi.fn(),
      deletingTransaction: vi.fn().mockReturnValue(null),
      editingSecurityTransaction: vi.fn().mockReturnValue(null),
      setEditingSecurityTransaction: vi.fn(),
      deletingSecurityTransaction: vi.fn().mockReturnValue(null),
      setDeletingSecurityTransaction: vi.fn(),
      setEditingSecurity: vi.fn(),
      toggleTransactionModal: vi.fn(),
      toggleSecurityModal: vi.fn(),
      toggleSecurityTransactionModal: vi.fn(),
      toggleCurrencyModal: vi.fn(),
      setPendingImportFile: vi.fn(),
      pendingImportFile: vi.fn().mockReturnValue(null),
      closeImportConfirmModal: vi.fn(),
      showMenu: {
        set: vi.fn(),
      },
    } as unknown as Mocked<Partial<UiStateService>>;

    mockPortfolioState = {
      loadAllData: vi.fn(),
      loadDividends: vi.fn(),
      loadSecurityTransactions: vi.fn(),
      currencies: {
        update: vi.fn(),
      },
    } as unknown as Mocked<Partial<PortfolioStateService>>;

    TestBed.configureTestingModule({
      providers: [
        TransactionFacadeService,
        {
          provide: DividendPaymentService,
          useValue: mockDividendPaymentService,
        },
        {
          provide: SecurityTransactionService,
          useValue: mockSecurityTransactionService,
        },
        { provide: SecurityService, useValue: mockSecurityService },
        { provide: CurrencyService, useValue: mockCurrencyService },
        { provide: DataService, useValue: mockDataService },
        { provide: ToastService, useValue: mockToastService },
        { provide: UiStateService, useValue: mockUiState },
        { provide: PortfolioStateService, useValue: mockPortfolioState },
      ],
    });

    service = TestBed.inject(TransactionFacadeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Dividend Payment Methods', () => {
    const mockTransactionForm: TransactionForm = {
      id: undefined,
      name: 'Test Security',
      securityId: 'sec1',
      exDate: '2024-01-01',
      payoutDate: '2024-01-15',
      amount: 10,
      dividend: 1.5,
      taxes: 0.3,
      currency: 'USD',
      rate: 1.1,
      finalPayment: 15.0,
      note: undefined,
    };

    it('should show warning if security is not selected', () => {
      const form = { ...mockTransactionForm, securityId: '' };
      service.handleTransactionSubmit(form);
      expect(mockToastService.warning).toHaveBeenCalledWith(
        'Bitte wählen Sie ein Wertpapier aus der Liste aus'
      );
    });

    it('should create new dividend payment', () => {
      service.handleTransactionSubmit(mockTransactionForm);

      expect(
        mockDividendPaymentService.createDividendPayment
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          securityId: 'sec1',
          shares: 10,
          dividendYield: 1.5,
        })
      );
      expect(mockPortfolioState.loadDividends).toHaveBeenCalled();
      expect(mockUiState.toggleTransactionModal).toHaveBeenCalled();
    });

    it('should update existing dividend payment', () => {
      const editForm = { ...mockTransactionForm, id: '1' };
      mockUiState.editingTransaction = signal({
        id: '1',
      } as DividendTransaction);

      service.handleTransactionSubmit(editForm);

      expect(
        mockDividendPaymentService.updateDividendPayment
      ).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          securityId: 'sec1',
        })
      );
      expect(mockUiState.setEditingTransaction).toHaveBeenCalledWith(null);
    });

    it('should handle error when creating dividend payment', () => {
      const error = new Error('Create failed');
      mockDividendPaymentService.createDividendPayment = vi
        .fn()
        .mockReturnValue(throwError(() => error));

      service.handleTransactionSubmit(mockTransactionForm);

      expect(mockToastService.error).toHaveBeenCalledWith(
        expect.stringContaining('Fehler beim Erstellen')
      );
    });

    it('should confirm delete transaction', () => {
      mockUiState.deletingTransaction = signal({
        id: '1',
      } as DividendTransaction);

      service.confirmDeleteTransaction();

      expect(
        mockDividendPaymentService.deleteDividendPayment
      ).toHaveBeenCalledWith('1');
      expect(mockPortfolioState.loadDividends).toHaveBeenCalled();
      expect(mockUiState.setDeletingTransaction).toHaveBeenCalledWith(null);
    });

    it('should cancel delete transaction', () => {
      service.cancelDeleteTransaction();
      expect(mockUiState.setDeletingTransaction).toHaveBeenCalledWith(null);
    });
  });

  describe('Security Methods', () => {
    const mockSecurityForm: SecurityForm = {
      id: undefined,
      name: 'Test Security',
      symbol: 'TEST',
      isin: 'US1234567890',
      wkn: '123456',
      type: 'STOCK',
      exchange: 'NYSE',
      currency: 'USD',
    };

    it('should create new security', () => {
      service.handleSecuritySubmit(mockSecurityForm);

      expect(mockSecurityService.createSecurity).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Security',
          symbol: 'TEST',
        })
      );
      expect(mockToastService.success).toHaveBeenCalledWith(
        'Wertpapier erfolgreich angelegt'
      );
      expect(mockUiState.toggleSecurityModal).toHaveBeenCalled();
    });

    it('should update existing security', () => {
      const editForm = { ...mockSecurityForm, id: 'sec1' };
      service.handleSecuritySubmit(editForm);

      expect(mockSecurityService.updateSecurity).toHaveBeenCalledWith(
        'sec1',
        expect.objectContaining({
          name: 'Test Security',
        })
      );
      expect(mockToastService.success).toHaveBeenCalledWith(
        'Wertpapier erfolgreich aktualisiert'
      );
    });

    it('should open edit security modal', () => {
      const mockSecurity = { id: 'sec1', name: 'Test' } as Security;
      mockSecurityService.getSecurity = vi
        .fn()
        .mockReturnValue(of(mockSecurity));

      service.openEditSecurityModal('sec1');

      expect(mockSecurityService.getSecurity).toHaveBeenCalledWith('sec1');
      expect(mockUiState.setEditingSecurity).toHaveBeenCalledWith(mockSecurity);
    });

    it('should handle error when fetching security for edit', () => {
      const error = new Error('Fetch failed');
      mockSecurityService.getSecurity = vi
        .fn()
        .mockReturnValue(throwError(() => error));

      service.openEditSecurityModal('sec1');

      expect(mockToastService.error).toHaveBeenCalledWith(
        expect.stringContaining('Fehler beim Laden')
      );
    });
  });

  describe('Security Transaction Methods', () => {
    const mockSecurityTransactionForm: SecurityTransactionForm = {
      id: undefined,
      securityId: 'sec1',
      securityName: 'Test Security',
      date: '2024-01-01',
      type: TransactionType.BUY,
      quantity: 10,
      pricePerShare: 100,
      fees: 5,
      currency: 'USD',
      exchangeRate: 1.1,
      totalValue: 1005,
      note: 'Test',
    };

    it('should show warning if security is not selected', () => {
      const form = { ...mockSecurityTransactionForm, securityId: '' };
      service.handleSecurityTransactionSubmit(form);
      expect(mockToastService.warning).toHaveBeenCalledWith(
        'Bitte wählen Sie ein Wertpapier aus der Liste aus'
      );
    });

    it('should create new security transaction', () => {
      service.handleSecurityTransactionSubmit(mockSecurityTransactionForm);

      expect(
        mockSecurityTransactionService.createSecurityTransaction
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          securityId: 'sec1',
          type: 'BUY',
          quantity: 10,
        })
      );
      expect(mockPortfolioState.loadSecurityTransactions).toHaveBeenCalled();
      expect(mockUiState.toggleSecurityTransactionModal).toHaveBeenCalled();
    });

    it('should update existing security transaction', () => {
      const editForm = { ...mockSecurityTransactionForm, id: '1' };
      mockUiState.editingSecurityTransaction = signal({
        id: '1',
      } as SecurityTransactionWithSecurity);

      service.handleSecurityTransactionSubmit(editForm);

      expect(
        mockSecurityTransactionService.updateSecurityTransaction
      ).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          securityId: 'sec1',
        })
      );
      expect(mockUiState.setEditingSecurityTransaction).toHaveBeenCalledWith(
        null
      );
    });

    it('should confirm delete security transaction', () => {
      mockUiState.deletingSecurityTransaction = signal({
        id: '1',
      } as SecurityTransactionWithSecurity);

      service.confirmDeleteSecurityTransaction();

      expect(
        mockSecurityTransactionService.deleteSecurityTransaction
      ).toHaveBeenCalledWith('1');
      expect(mockPortfolioState.loadSecurityTransactions).toHaveBeenCalled();
      expect(mockUiState.setDeletingSecurityTransaction).toHaveBeenCalledWith(
        null
      );
    });

    it('should cancel delete security transaction', () => {
      service.cancelDeleteSecurityTransaction();
      expect(mockUiState.setDeletingSecurityTransaction).toHaveBeenCalledWith(
        null
      );
    });
  });

  describe('Currency Methods', () => {
    it('should add currency successfully', () => {
      const dto = { code: 'USD', name: 'US Dollar' };
      service.addCurrency(dto);

      expect(mockCurrencyService.createCurrency).toHaveBeenCalledWith(dto);
      expect(mockPortfolioState.currencies?.update).toHaveBeenCalled();
      expect(mockToastService.success).toHaveBeenCalledWith(
        expect.stringContaining('USD')
      );
      expect(mockUiState.toggleCurrencyModal).toHaveBeenCalled();
    });

    it('should handle error when adding currency', () => {
      const error = { error: { message: 'Currency exists' }, message: 'Error' };
      mockCurrencyService.createCurrency = vi
        .fn()
        .mockReturnValue(throwError(() => error));

      service.addCurrency({ code: 'USD', name: 'US Dollar' });

      expect(mockToastService.error).toHaveBeenCalled();
    });
  });

  describe('Import/Export Methods', () => {
    it('should export data successfully', () => {
      service.handleExportData();

      expect(mockUiState.showMenu?.set).toHaveBeenCalledWith(false);
      expect(mockDataService.exportData).toHaveBeenCalled();
      expect(mockDataService.downloadExport).toHaveBeenCalled();
    });

    it('should handle error when exporting data', () => {
      const error = new Error('Export failed');
      mockDataService.exportData = vi
        .fn()
        .mockReturnValue(throwError(() => error));

      service.handleExportData();

      expect(mockToastService.error).toHaveBeenCalledWith(
        expect.stringContaining('Fehler beim Exportieren')
      );
    });

    it('should handle file selected for import', () => {
      const mockFile = new File(['test'], 'test.json', {
        type: 'application/json',
      });
      const target = { files: [mockFile], value: 'test.json' };
      const mockEvent = { target } as unknown as Event;

      service.onFileSelected(mockEvent);

      expect(mockUiState.setPendingImportFile).toHaveBeenCalledWith(mockFile);
      expect(target.value).toBe('');
    });

    it('should import data in replace mode', () => {
      const mockFile = new File(['test'], 'test.json', {
        type: 'application/json',
      });
      mockUiState.pendingImportFile = signal(mockFile);

      service.handleImportConfirm('replace');

      expect(mockDataService.importData).toHaveBeenCalledWith(mockFile, true);
      expect(mockPortfolioState.loadAllData).toHaveBeenCalled();
      expect(mockToastService.success).toHaveBeenCalled();
      expect(mockUiState.closeImportConfirmModal).toHaveBeenCalled();
    });

    it('should import data in merge mode', () => {
      const mockFile = new File(['test'], 'test.json', {
        type: 'application/json',
      });
      mockUiState.pendingImportFile = signal(mockFile);

      service.handleImportConfirm('merge');

      expect(mockDataService.importData).toHaveBeenCalledWith(mockFile, false);
    });

    it('should cancel import', () => {
      service.handleImportConfirm('cancel');

      expect(mockUiState.closeImportConfirmModal).toHaveBeenCalled();
      expect(mockDataService.importData).not.toHaveBeenCalled();
    });

    it('should handle error when importing data', () => {
      const mockFile = new File(['test'], 'test.json', {
        type: 'application/json',
      });
      mockUiState.pendingImportFile = signal(mockFile);

      const error = new Error('Import failed');
      mockDataService.importData = vi
        .fn()
        .mockReturnValue(throwError(() => error));

      service.handleImportConfirm('merge');

      expect(mockToastService.error).toHaveBeenCalledWith(
        expect.stringContaining('Fehler beim Importieren')
      );
      expect(mockUiState.closeImportConfirmModal).toHaveBeenCalled();
    });
  });
});
