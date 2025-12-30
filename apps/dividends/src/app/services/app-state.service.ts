import { Injectable, signal, computed, inject, effect, ElementRef } from '@angular/core';
import { DividendDataService } from './dividend-data.service';
import { SecurityTransactionService } from './security-transaction.service';
import { DividendPaymentService } from './dividend-payment.service';
import { SecurityService } from './security.service';
import { DataService } from './data.service';
import { CurrencyService } from './currency.service';
import { TimeRange, DividendTransaction } from '../models/dividend.model';
import { SecurityTransactionWithSecurity, CreateDividendPaymentDto, UpdateDividendPaymentDto, CreateSecurityTransactionDto, UpdateSecurityTransactionDto, Currency, CreateCurrencyDto } from '@dividends/shared';
import { TransactionForm } from '../components/dashboard/transaction-modal/transaction-modal.component';
import { SecurityForm } from '../components/dashboard/security-modal/security-modal.component';
import { SecurityTransactionForm } from '../components/dashboard/security-transaction-modal/security-transaction-modal.component';
import { ImportMode } from '../components/dashboard/import-confirm-modal/import-confirm-modal.component';

@Injectable({
  providedIn: 'root',
})
export class AppStateService {
  private readonly dividendDataService = inject(DividendDataService);
  private readonly securityTransactionService = inject(SecurityTransactionService);
  private readonly dividendPaymentService = inject(DividendPaymentService);
  private readonly securityService = inject(SecurityService);
  private readonly dataService = inject(DataService);
  private readonly currencyService = inject(CurrencyService);

  // UI State
  isDarkMode = signal(false);
  sidebarCollapsed = signal(false);
  selectedTimeRange = signal<TimeRange>('ALL');

  // Modal State
  showTransactionModal = signal(false);
  showSecurityModal = signal(false);
  showSecurityTransactionModal = signal(false);
  showCurrencyModal = signal(false);
  showImportConfirmModal = signal(false);
  showMenu = signal(false);

  editingTransaction = signal<DividendTransaction | null>(null);
  deletingTransaction = signal<DividendTransaction | null>(null);
  editingSecurityTransaction = signal<SecurityTransactionWithSecurity | null>(null);
  deletingSecurityTransaction = signal<SecurityTransactionWithSecurity | null>(null);
  pendingImportFile = signal<File | null>(null);

  // Data State
  securityTransactions = signal<SecurityTransactionWithSecurity[]>([]);
  currencies = signal<Currency[]>([]);
  defaultCurrency = signal<Currency | null>(null);

  // Computed State
  filteredDividends = computed(() => {
    return this.dividendDataService.getFilteredTransactions(
      this.selectedTimeRange(),
      ''
    );
  });

  kpis = computed(() => {
    return this.dividendDataService.calculateKPIs(
      this.filteredDividends(),
      this.securityTransactions()
    );
  });

  constructor() {
    this.initializeFromLocalStorage();
    this.setupPersistence();
  }

  // Initialize state from localStorage
  private initializeFromLocalStorage() {
    const savedTheme = localStorage.getItem('theme');
    const savedSidebarState = localStorage.getItem('sidebarCollapsed');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Theme
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      this.setDarkMode(true);
    }

    // Sidebar
    if (savedSidebarState) {
      this.sidebarCollapsed.set(JSON.parse(savedSidebarState));
    }
  }

  // Setup localStorage persistence
  private setupPersistence() {
    effect(() => {
      const darkMode = this.isDarkMode();
      localStorage.setItem('theme', darkMode ? 'dark' : 'light');

      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });

    effect(() => {
      const collapsed = this.sidebarCollapsed();
      localStorage.setItem('sidebarCollapsed', JSON.stringify(collapsed));
    });
  }

  // Public Methods - Theme
  setDarkMode(isDark: boolean) {
    this.isDarkMode.set(isDark);
  }

  toggleTheme() {
    this.isDarkMode.update(current => !current);
  }

  // Public Methods - Sidebar
  toggleSidebar() {
    this.sidebarCollapsed.update(current => !current);
  }

  // Public Methods - Time Range
  setTimeRange(range: TimeRange) {
    this.selectedTimeRange.set(range);
  }

  // Public Methods - Data Loading
  loadAllData() {
    this.dividendDataService.loadTransactionsFromBackend();
    this.loadSecurityTransactions();
    this.loadCurrencies();
  }

  private loadSecurityTransactions() {
    this.securityTransactionService.getSecurityTransactions().subscribe({
      next: (transactions) => {
        this.securityTransactions.set(transactions);
      },
      error: (error) => {
        console.error('Error loading security transactions:', error);
      },
    });
  }

  private loadCurrencies() {
    this.currencyService.getCurrencies().subscribe({
      next: (currencies) => {
        this.currencies.set(currencies);
      },
      error: (error) => {
        console.error('Error loading currencies:', error);
      },
    });

    this.currencyService.getDefaultCurrency().subscribe({
      next: (currency) => {
        this.defaultCurrency.set(currency);
      },
      error: (error) => {
        console.error('Error loading default currency:', error);
      },
    });
  }

  addCurrency(dto: CreateCurrencyDto) {
    this.currencyService.createCurrency(dto).subscribe({
      next: (currency) => {
        this.currencies.update((list) => [...list, currency].sort((a, b) => a.code.localeCompare(b.code)));
        console.log('Currency added successfully:', currency);
        this.toggleCurrencyModal(); // Close modal on success
        // Show success message
        alert(`Währung ${currency.code} (${currency.name}) wurde erfolgreich hinzugefügt!`);
      },
      error: (error) => {
        console.error('Error adding currency:', error);
        // Extract validation errors from backend
        let errorMessage = 'Fehler beim Hinzufügen der Währung.';

        if (error.error?.message) {
          if (Array.isArray(error.error.message)) {
            errorMessage = error.error.message.join(', ');
          } else {
            errorMessage = error.error.message;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }

        alert(errorMessage);
      },
    });
  }

  // Public Methods - Modals
  toggleTransactionModal() {
    const isClosing = this.showTransactionModal();
    if (isClosing) {
      this.editingTransaction.set(null);
    }
    this.showTransactionModal.update(show => !show);
    this.showMenu.set(false);
  }

  toggleSecurityModal() {
    this.showSecurityModal.update(show => !show);
    this.showMenu.set(false);
  }

  toggleSecurityTransactionModal() {
    const isClosing = this.showSecurityTransactionModal();
    if (isClosing) {
      this.editingSecurityTransaction.set(null);
    }
    this.showSecurityTransactionModal.update(show => !show);
    this.showMenu.set(false);
  }

  toggleCurrencyModal() {
    this.showCurrencyModal.update(show => !show);
    this.showMenu.set(false);
  }

  toggleMenu() {
    this.showMenu.update(show => !show);
  }

  setEditingTransaction(transaction: DividendTransaction | null) {
    this.editingTransaction.set(transaction);
    if (transaction) {
      this.showTransactionModal.set(true);
    }
  }

  setDeletingTransaction(transaction: DividendTransaction | null) {
    this.deletingTransaction.set(transaction);
  }

  setEditingSecurityTransaction(transaction: SecurityTransactionWithSecurity | null) {
    this.editingSecurityTransaction.set(transaction);
    if (transaction) {
      this.showSecurityTransactionModal.set(true);
    }
  }

  setDeletingSecurityTransaction(transaction: SecurityTransactionWithSecurity | null) {
    this.deletingSecurityTransaction.set(transaction);
  }

  // Public Methods - Export/Import
  handleExportData() {
    this.showMenu.set(false);
    this.dataService.exportData().subscribe({
      next: (blob) => {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `dividends-backup-${timestamp}.json`;
        this.dataService.downloadExport(blob, filename);
        console.log('Data exported successfully');
      },
      error: (error) => {
        console.error('Error exporting data:', error);
        alert(`Fehler beim Exportieren: ${error.message}`);
      },
    });
  }

  handleImportData(fileInput: ElementRef<HTMLInputElement>) {
    this.showMenu.set(false);
    fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.pendingImportFile.set(file);
    this.showImportConfirmModal.set(true);

    // Reset file input
    input.value = '';
  }

  handleImportConfirm(mode: ImportMode) {
    this.showImportConfirmModal.set(false);

    if (mode === 'cancel') {
      this.pendingImportFile.set(null);
      return;
    }

    const file = this.pendingImportFile();
    if (!file) return;

    const shouldReplace = mode === 'replace';

    this.dataService.importData(file, shouldReplace).subscribe({
      next: (result) => {
        console.log('Data imported successfully:', result);
        alert(
          `Import erfolgreich!\n\n` +
          `Wertpapiere: ${result.securitiesImported}\n` +
          `Dividenden: ${result.dividendPaymentsImported}\n` +
          `Transaktionen: ${result.securityTransactionsImported}`
        );

        // Reload all data
        this.loadAllData();

        // Reset pending file
        this.pendingImportFile.set(null);
      },
      error: (error) => {
        console.error('Error importing data:', error);
        alert(`Fehler beim Importieren: ${error.message}`);
        this.pendingImportFile.set(null);
      },
    });
  }

  // Public Methods - Transaction Handlers
  handleTransactionSubmit(transaction: TransactionForm) {
    // Validation
    if (!transaction.securityId) {
      alert('Bitte wählen Sie ein Wertpapier aus der Liste aus');
      return;
    }

    const editingTx = this.editingTransaction();

    if (editingTx && transaction.id) {
      // UPDATE existing transaction
      const dto: UpdateDividendPaymentDto = {
        exDate: transaction.exDate,
        payoutDate: transaction.payoutDate,
        securityId: transaction.securityId,
        shares: transaction.amount,
        dividendYield: transaction.dividend,
        taxAmount: transaction.taxes,
        originCurrency: transaction.currency,
        destCurrency: 'EUR',
        conversionRate: transaction.rate,
        finalPayment: transaction.finalPayment,
        note: undefined,
      };

      this.dividendPaymentService.updateDividendPayment(transaction.id, dto).subscribe({
        next: (updatedPayment) => {
          console.log('Dividend payment updated successfully:', updatedPayment);
          this.loadAllData();
          this.toggleTransactionModal();
          this.editingTransaction.set(null);
        },
        error: (error) => {
          console.error('Error updating dividend payment:', error);
          alert(`Failed to update dividend payment: ${error.message}`);
        },
      });
    } else {
      // CREATE new transaction
      const dto: CreateDividendPaymentDto = {
        exDate: transaction.exDate,
        payoutDate: transaction.payoutDate,
        securityId: transaction.securityId,
        shares: transaction.amount,
        dividendYield: transaction.dividend,
        taxAmount: transaction.taxes,
        originCurrency: transaction.currency,
        destCurrency: 'EUR',
        conversionRate: transaction.rate,
        finalPayment: transaction.finalPayment,
        note: undefined,
      };

      this.dividendPaymentService.createDividendPayment(dto).subscribe({
        next: (createdPayment) => {
          console.log('Dividend payment created successfully:', createdPayment);
          this.loadAllData();
          this.toggleTransactionModal();
        },
        error: (error) => {
          console.error('Error creating dividend payment:', error);
          alert(`Failed to create dividend payment: ${error.message}`);
        },
      });
    }
  }

  handleSecuritySubmit(security: SecurityForm) {
    const createRequest = {
      name: security.name,
      symbol: security.symbol,
      isin: security.isin || undefined,
      wkn: security.wkn || undefined,
      type: security.type,
      exchange: security.exchange,
      currency: security.currency,
    };

    this.securityService.createSecurity(createRequest).subscribe({
      next: (createdSecurity) => {
        console.log('Security created successfully:', createdSecurity);
        this.toggleSecurityModal();
      },
      error: (error) => {
        console.error('Error creating security:', error);
        alert(`Failed to create security: ${error.message}`);
      },
    });
  }

  handleSecurityTransactionSubmit(transaction: SecurityTransactionForm) {
    // Validation
    if (!transaction.securityId) {
      alert('Bitte wählen Sie ein Wertpapier aus der Liste aus');
      return;
    }

    const editingTx = this.editingSecurityTransaction();

    if (editingTx && transaction.id) {
      // UPDATE existing transaction
      const dto: UpdateSecurityTransactionDto = {
        date: transaction.date,
        type: transaction.type,
        securityId: transaction.securityId,
        quantity: transaction.quantity,
        pricePerShare: transaction.pricePerShare,
        fees: transaction.fees,
        currency: transaction.currency,
        exchangeRate: transaction.exchangeRate,
        totalValue: transaction.totalValue,
        note: transaction.note || undefined,
      };

      this.securityTransactionService.updateSecurityTransaction(transaction.id, dto).subscribe({
        next: (updatedTransaction) => {
          console.log('Security transaction updated successfully:', updatedTransaction);
          this.loadAllData();
          this.toggleSecurityTransactionModal();
          this.editingSecurityTransaction.set(null);
        },
        error: (error) => {
          console.error('Error updating security transaction:', error);
          alert(`Failed to update security transaction: ${error.message}`);
        },
      });
    } else {
      // CREATE new transaction
      const dto: CreateSecurityTransactionDto = {
        date: transaction.date,
        type: transaction.type,
        securityId: transaction.securityId,
        quantity: transaction.quantity,
        pricePerShare: transaction.pricePerShare,
        fees: transaction.fees,
        currency: transaction.currency,
        exchangeRate: transaction.exchangeRate,
        totalValue: transaction.totalValue,
        note: transaction.note || undefined,
      };

      this.securityTransactionService.createSecurityTransaction(dto).subscribe({
        next: (createdTransaction) => {
          console.log('Security transaction created successfully:', createdTransaction);
          this.loadAllData();
          this.toggleSecurityTransactionModal();
        },
        error: (error) => {
          console.error('Error creating security transaction:', error);
          alert(`Failed to create security transaction: ${error.message}`);
        },
      });
    }
  }

  confirmDeleteTransaction() {
    const transaction = this.deletingTransaction();
    if (!transaction || !transaction.id) return;

    const id = typeof transaction.id === 'string' ? transaction.id : String(transaction.id);

    this.dividendPaymentService.deleteDividendPayment(id).subscribe({
      next: () => {
        console.log('Dividend payment deleted successfully');
        this.loadAllData();
        this.deletingTransaction.set(null);
      },
      error: (error) => {
        console.error('Error deleting dividend payment:', error);
        alert(`Failed to delete dividend payment: ${error.message}`);
      },
    });
  }

  cancelDeleteTransaction() {
    this.deletingTransaction.set(null);
  }

  confirmDeleteSecurityTransaction() {
    const transaction = this.deletingSecurityTransaction();
    if (!transaction || !transaction.id) return;

    this.securityTransactionService.deleteSecurityTransaction(transaction.id).subscribe({
      next: () => {
        console.log('Security transaction deleted successfully');
        this.loadAllData();
        this.deletingSecurityTransaction.set(null);
      },
      error: (error) => {
        console.error('Error deleting security transaction:', error);
        alert(`Failed to delete security transaction: ${error.message}`);
      },
    });
  }

  cancelDeleteSecurityTransaction() {
    this.deletingSecurityTransaction.set(null);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('de-DE');
  }
}
