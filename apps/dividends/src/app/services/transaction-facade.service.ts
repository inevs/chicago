import { Injectable, inject, ElementRef } from '@angular/core';
import { DividendPaymentService } from './dividend-payment.service';
import { SecurityTransactionService } from './security-transaction.service';
import { SecurityService } from './security.service';
import { CurrencyService } from './currency.service';
import { DataService } from './data.service';
import { ToastService } from './toast.service';
import { UiStateService } from './ui-state.service';
import { PortfolioStateService } from './portfolio-state.service';
import {
  CreateDividendPaymentDto,
  UpdateDividendPaymentDto,
  CreateSecurityTransactionDto,
  UpdateSecurityTransactionDto,
  CreateCurrencyDto,
} from '@dividends/shared';
import { TransactionForm } from '../shared/modals/transaction-modal/transaction-modal.component';
import { SecurityForm } from '../shared/modals/security-modal/security-modal.component';
import { SecurityTransactionForm } from '../shared/modals/security-transaction-modal/security-transaction-modal.component';
import { ImportMode } from '../shared/modals/import-confirm-modal/import-confirm-modal.component';

@Injectable({
  providedIn: 'root',
})
export class TransactionFacadeService {
  private readonly dividendPaymentService = inject(DividendPaymentService);
  private readonly securityTransactionService = inject(SecurityTransactionService);
  private readonly securityService = inject(SecurityService);
  private readonly currencyService = inject(CurrencyService);
  private readonly dataService = inject(DataService);
  private readonly toastService = inject(ToastService);
  private readonly uiState = inject(UiStateService);
  private readonly portfolioState = inject(PortfolioStateService);

  // Dividend Payment Methods
  handleTransactionSubmit(transaction: TransactionForm) {
    // Validation
    if (!transaction.securityId) {
      this.toastService.warning('Bitte wählen Sie ein Wertpapier aus der Liste aus');
      return;
    }

    const editingTx = this.uiState.editingTransaction();

    if (editingTx && transaction.id) {
      this.updateDividendPayment(transaction);
    } else {
      this.createDividendPayment(transaction);
    }
  }

  private createDividendPayment(transaction: TransactionForm) {
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
      note: transaction.note || undefined,
    };

    this.dividendPaymentService.createDividendPayment(dto).subscribe({
      next: (createdPayment) => {
        console.log('Dividend payment created successfully:', createdPayment);
        this.portfolioState.loadDividends();
        this.uiState.toggleTransactionModal();
      },
      error: (error) => {
        console.error('Error creating dividend payment:', error);
        this.toastService.error(`Fehler beim Erstellen der Dividendenzahlung: ${error.message}`);
      },
    });
  }

  private updateDividendPayment(transaction: TransactionForm) {
    if (!transaction.id) return;

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
      note: transaction.note || undefined,
    };

    this.dividendPaymentService.updateDividendPayment(transaction.id, dto).subscribe({
      next: (updatedPayment) => {
        console.log('Dividend payment updated successfully:', updatedPayment);
        this.portfolioState.loadDividends();
        this.uiState.toggleTransactionModal();
        this.uiState.setEditingTransaction(null);
      },
      error: (error) => {
        console.error('Error updating dividend payment:', error);
        this.toastService.error(`Fehler beim Aktualisieren der Dividendenzahlung: ${error.message}`);
      },
    });
  }

  confirmDeleteTransaction() {
    const transaction = this.uiState.deletingTransaction();
    if (!transaction || !transaction.id) return;

    const id = typeof transaction.id === 'string' ? transaction.id : String(transaction.id);

    this.dividendPaymentService.deleteDividendPayment(id).subscribe({
      next: () => {
        console.log('Dividend payment deleted successfully');
        this.portfolioState.loadDividends();
        this.uiState.setDeletingTransaction(null);
      },
      error: (error) => {
        console.error('Error deleting dividend payment:', error);
        this.toastService.error(`Fehler beim Löschen der Dividendenzahlung: ${error.message}`);
      },
    });
  }

  cancelDeleteTransaction() {
    this.uiState.setDeletingTransaction(null);
  }

  // Security Methods
  handleSecuritySubmit(security: SecurityForm) {
    if (security.id) {
      this.updateSecurity(security);
    } else {
      this.createSecurity(security);
    }
  }

  private createSecurity(security: SecurityForm) {
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
        this.toastService.success('Wertpapier erfolgreich angelegt');
        this.uiState.toggleSecurityModal();
      },
      error: (error) => {
        console.error('Error creating security:', error);
        this.toastService.error(`Fehler beim Erstellen des Wertpapiers: ${error.message}`);
      },
    });
  }

  private updateSecurity(security: SecurityForm) {
    if (!security.id) return;

    const updateRequest = {
      name: security.name,
      symbol: security.symbol,
      isin: security.isin || undefined,
      wkn: security.wkn || undefined,
      type: security.type,
      exchange: security.exchange,
      currency: security.currency,
    };

    this.securityService.updateSecurity(security.id, updateRequest).subscribe({
      next: (updatedSecurity) => {
        console.log('Security updated successfully:', updatedSecurity);
        this.toastService.success('Wertpapier erfolgreich aktualisiert');
        this.portfolioState.loadDividends();
        this.uiState.toggleSecurityModal();
      },
      error: (error) => {
        console.error('Error updating security:', error);
        this.toastService.error(`Fehler beim Aktualisieren des Wertpapiers: ${error.message}`);
      },
    });
  }

  openEditSecurityModal(securityId: string) {
    this.securityService.getSecurity(securityId).subscribe({
      next: (security) => {
        this.uiState.setEditingSecurity(security);
      },
      error: (error) => {
        console.error('Error fetching security:', error);
        this.toastService.error(`Fehler beim Laden des Wertpapiers: ${error.message}`);
      },
    });
  }

  // Security Transaction Methods
  handleSecurityTransactionSubmit(transaction: SecurityTransactionForm) {
    // Validation
    if (!transaction.securityId) {
      this.toastService.warning('Bitte wählen Sie ein Wertpapier aus der Liste aus');
      return;
    }

    const editingTx = this.uiState.editingSecurityTransaction();

    if (editingTx && transaction.id) {
      this.updateSecurityTransaction(transaction);
    } else {
      this.createSecurityTransaction(transaction);
    }
  }

  private createSecurityTransaction(transaction: SecurityTransactionForm) {
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
        this.portfolioState.loadSecurityTransactions();
        this.uiState.toggleSecurityTransactionModal();
      },
      error: (error) => {
        console.error('Error creating security transaction:', error);
        this.toastService.error(`Fehler beim Erstellen der Wertpapier-Transaktion: ${error.message}`);
      },
    });
  }

  private updateSecurityTransaction(transaction: SecurityTransactionForm) {
    if (!transaction.id) return;

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
        this.portfolioState.loadSecurityTransactions();
        this.uiState.toggleSecurityTransactionModal();
        this.uiState.setEditingSecurityTransaction(null);
      },
      error: (error) => {
        console.error('Error updating security transaction:', error);
        this.toastService.error(`Fehler beim Aktualisieren der Wertpapier-Transaktion: ${error.message}`);
      },
    });
  }

  confirmDeleteSecurityTransaction() {
    const transaction = this.uiState.deletingSecurityTransaction();
    if (!transaction || !transaction.id) return;

    this.securityTransactionService.deleteSecurityTransaction(transaction.id).subscribe({
      next: () => {
        console.log('Security transaction deleted successfully');
        this.portfolioState.loadSecurityTransactions();
        this.uiState.setDeletingSecurityTransaction(null);
      },
      error: (error) => {
        console.error('Error deleting security transaction:', error);
        this.toastService.error(`Fehler beim Löschen der Wertpapier-Transaktion: ${error.message}`);
      },
    });
  }

  cancelDeleteSecurityTransaction() {
    this.uiState.setDeletingSecurityTransaction(null);
  }

  // Currency Methods
  addCurrency(dto: CreateCurrencyDto) {
    this.currencyService.createCurrency(dto).subscribe({
      next: (currency) => {
        this.portfolioState.currencies.update((list) =>
          [...list, currency].sort((a, b) => a.code.localeCompare(b.code))
        );
        console.log('Currency added successfully:', currency);
        this.uiState.toggleCurrencyModal();
        this.toastService.success(`Währung ${currency.code} (${currency.name}) wurde erfolgreich hinzugefügt!`);
      },
      error: (error) => {
        console.error('Error adding currency:', error);
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

        this.toastService.error(errorMessage);
      },
    });
  }

  // Import/Export Methods
  handleExportData() {
    this.uiState.showMenu.set(false);
    this.dataService.exportData().subscribe({
      next: (blob) => {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `dividends-backup-${timestamp}.json`;
        this.dataService.downloadExport(blob, filename);
        console.log('Data exported successfully');
      },
      error: (error) => {
        console.error('Error exporting data:', error);
        this.toastService.error(`Fehler beim Exportieren: ${error.message}`);
      },
    });
  }

  handleImportData(fileInput: ElementRef<HTMLInputElement>) {
    this.uiState.showMenu.set(false);
    fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.uiState.setPendingImportFile(file);

    // Reset file input
    input.value = '';
  }

  handleImportSecuritiesCsv(fileInput: ElementRef<HTMLInputElement>) {
    this.uiState.showMenu.set(false);
    fileInput.nativeElement.click();
  }

  onCsvFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      this.toastService.error('Bitte wählen Sie eine CSV-Datei aus');
      input.value = '';
      return;
    }

    // Show loading toast
    this.toastService.info('Importiere Wertpapiere...', 0);

    this.securityService.importSecuritiesCsv(file).subscribe({
      next: (result) => {
        this.toastService.clear();

        // Success message
        if (result.created > 0) {
          this.toastService.success(
            `${result.created} Wertpapier(e) erfolgreich importiert! (${result.skipped} übersprungen, ${result.errors} Fehler)`,
            8000
          );
        } else if (result.total === result.skipped) {
          this.toastService.warning(
            `Alle ${result.total} Wertpapiere wurden übersprungen (bereits vorhanden)`,
            6000
          );
        } else {
          this.toastService.error(
            `Import fehlgeschlagen: ${result.errors} Fehler von ${result.total} Zeilen`,
            7000
          );
        }

        // Show price sync info
        if (result.pricesSyncTriggered && result.created > 0) {
          this.toastService.info(
            'Kursdaten werden im Hintergrund synchronisiert...',
            5000
          );
        }

        // Reload portfolio data to show new securities
        this.portfolioState.loadAllData();
      },
      error: (error) => {
        this.toastService.clear();
        this.toastService.error(
          `Fehler beim CSV-Import: ${error.message}`,
          7000
        );
      },
      complete: () => {
        // Reset file input
        input.value = '';
      }
    });
  }

  handleImportSecurityTransactionsCsv(fileInput: ElementRef<HTMLInputElement>) {
    this.uiState.showMenu.set(false);
    fileInput.nativeElement.click();
  }

  onTransactionCsvFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      this.toastService.error('Bitte wählen Sie eine CSV-Datei aus');
      input.value = '';
      return;
    }

    // Show loading toast (duration: 0 = persistent)
    this.toastService.info('Importiere Transaktionen...', 0);

    this.securityTransactionService.importSecurityTransactionsCsv(file).subscribe({
      next: (result) => {
        this.toastService.clear();

        // Success message with counts
        if (result.created > 0) {
          this.toastService.success(
            `${result.created} Transaktion(en) erfolgreich importiert! (${result.skipped} übersprungen, ${result.errors} Fehler)`,
            8000
          );
        } else if (result.total === result.skipped) {
          this.toastService.warning(
            `Alle ${result.total} Transaktionen wurden übersprungen (Wertpapiere nicht gefunden)`,
            6000
          );
        } else {
          this.toastService.error(
            `Import fehlgeschlagen: ${result.errors} Fehler von ${result.total} Zeilen`,
            7000
          );
        }

        // Reload security transactions
        this.portfolioState.loadSecurityTransactions();
      },
      error: (error) => {
        this.toastService.clear();
        this.toastService.error(
          `Fehler beim CSV-Import: ${error.message}`,
          7000
        );
      },
      complete: () => {
        // Reset file input
        input.value = '';
      }
    });
  }

  handleImportDividendsCsv(fileInput: ElementRef<HTMLInputElement>) {
    this.uiState.showMenu.set(false);
    fileInput.nativeElement.click();
  }

  onDividendCsvFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      this.toastService.error('Bitte wählen Sie eine CSV-Datei aus');
      input.value = '';
      return;
    }

    // Show loading toast (duration: 0 = persistent)
    this.toastService.info('Importiere Dividenden...', 0);

    this.dividendPaymentService.importDividendsCsv(file).subscribe({
      next: (result) => {
        this.toastService.clear();

        // Success message with counts
        if (result.created > 0) {
          this.toastService.success(
            `${result.created} Dividendenzahlung(en) erfolgreich importiert! (${result.skipped} übersprungen, ${result.errors} Fehler)`,
            8000
          );
        } else if (result.total === result.skipped) {
          this.toastService.warning(
            `Alle ${result.total} Dividendenzahlungen wurden übersprungen (Wertpapiere nicht gefunden)`,
            6000
          );
        } else {
          this.toastService.error(
            `Import fehlgeschlagen: ${result.errors} Fehler von ${result.total} Zeilen`,
            7000
          );
        }

        // Reload dividends
        this.portfolioState.loadDividends();
      },
      error: (error) => {
        this.toastService.clear();
        this.toastService.error(
          `Fehler beim CSV-Import: ${error.message}`,
          7000
        );
      },
      complete: () => {
        // Reset file input
        input.value = '';
      }
    });
  }

  handleImportConfirm(mode: ImportMode) {
    if (mode === 'cancel') {
      this.uiState.closeImportConfirmModal();
      return;
    }

    const file = this.uiState.pendingImportFile();
    if (!file) return;

    const shouldReplace = mode === 'replace';

    this.dataService.importData(file, shouldReplace).subscribe({
      next: (result) => {
        console.log('Data imported successfully:', result);
        this.toastService.success(
          `Import erfolgreich! Waehrungen: ${result.currenciesImported}, ` +
          `Wertpapiere: ${result.securitiesImported}, ` +
          `Dividenden: ${result.dividendPaymentsImported}, ` +
          `Transaktionen: ${result.securityTransactionsImported}, ` +
          `Kurse: ${result.securityPricesImported}`,
          8000
        );

        this.portfolioState.loadAllData();
        this.uiState.closeImportConfirmModal();
      },
      error: (error) => {
        console.error('Error importing data:', error);
        this.toastService.error(`Fehler beim Importieren: ${error.message}`);
        this.uiState.closeImportConfirmModal();
      },
    });
  }
}
