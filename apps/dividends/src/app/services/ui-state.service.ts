import { Injectable, signal, effect } from '@angular/core';
import { TimeRange, DividendTransaction } from '../models/dividend.model';
import { SecurityTransactionWithSecurity, Security } from '@dividends/shared';

export type ModalType = 'transaction' | 'security' | 'securityTransaction' | 'currency' | 'importConfirm' | 'menu' | null;

@Injectable({
  providedIn: 'root',
})
export class UiStateService {
  // Theme State
  isDarkMode = signal(false);

  // Sidebar State
  sidebarCollapsed = signal(false);

  // Time Range State
  selectedTimeRange = signal<TimeRange>('ALL');

  // Modal State
  showTransactionModal = signal(false);
  showSecurityModal = signal(false);
  showSecurityTransactionModal = signal(false);
  showCurrencyModal = signal(false);
  showImportConfirmModal = signal(false);
  showMenu = signal(false);

  // Editing/Deleting State
  editingTransaction = signal<DividendTransaction | null>(null);
  deletingTransaction = signal<DividendTransaction | null>(null);
  editingSecurity = signal<Security | null>(null);
  editingSecurityTransaction = signal<SecurityTransactionWithSecurity | null>(null);
  deletingSecurityTransaction = signal<SecurityTransactionWithSecurity | null>(null);
  pendingImportFile = signal<File | null>(null);

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

  // Theme Methods
  setDarkMode(isDark: boolean) {
    this.isDarkMode.set(isDark);
  }

  toggleTheme() {
    this.isDarkMode.update(current => !current);
  }

  // Sidebar Methods
  toggleSidebar() {
    this.sidebarCollapsed.update(current => !current);
  }

  // Time Range Methods
  setTimeRange(range: TimeRange) {
    this.selectedTimeRange.set(range);
  }

  // Modal Methods
  toggleTransactionModal() {
    const isClosing = this.showTransactionModal();
    if (isClosing) {
      this.editingTransaction.set(null);
    }
    this.showTransactionModal.update(show => !show);
    this.showMenu.set(false);
  }

  toggleSecurityModal() {
    const isClosing = this.showSecurityModal();
    if (isClosing) {
      this.editingSecurity.set(null);
    }
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

  // Editing/Deleting Methods
  setEditingTransaction(transaction: DividendTransaction | null) {
    this.editingTransaction.set(transaction);
    if (transaction) {
      this.showTransactionModal.set(true);
    }
  }

  setDeletingTransaction(transaction: DividendTransaction | null) {
    this.deletingTransaction.set(transaction);
  }

  setEditingSecurity(security: Security | null) {
    this.editingSecurity.set(security);
    if (security) {
      this.showSecurityModal.set(true);
    }
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

  setPendingImportFile(file: File | null) {
    this.pendingImportFile.set(file);
    if (file) {
      this.showImportConfirmModal.set(true);
    }
  }

  closeImportConfirmModal() {
    this.showImportConfirmModal.set(false);
    this.pendingImportFile.set(null);
  }

  // Utility Methods
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
