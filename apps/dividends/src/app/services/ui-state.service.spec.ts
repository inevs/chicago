import { TestBed } from '@angular/core/testing';
import { UiStateService } from './ui-state.service';
import { DividendTransaction, TimeRange } from '../models/dividend.model';
import { SecurityTransactionWithSecurity, Security } from '@dividends/shared';

describe('UiStateService', () => {
  let service: UiStateService;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset DOM
    document.documentElement.classList.remove('dark');

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(UiStateService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Theme Management', () => {
    it('should initialize with light mode by default', () => {
      expect(service.isDarkMode()).toBe(false);
    });

    it('should respect saved theme from localStorage', () => {
      localStorage.setItem('theme', 'dark');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const newService = TestBed.inject(UiStateService);
      expect(newService.isDarkMode()).toBe(true);
    });

    it('should respect system preference when no saved theme', () => {
      // Mock matchMedia to return dark mode preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: true,
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const newService = TestBed.inject(UiStateService);
      expect(newService.isDarkMode()).toBe(true);
    });

    it('should toggle theme', () => {
      expect(service.isDarkMode()).toBe(false);
      service.toggleTheme();
      expect(service.isDarkMode()).toBe(true);
      service.toggleTheme();
      expect(service.isDarkMode()).toBe(false);
    });

    it('should set dark mode', () => {
      service.setDarkMode(true);
      expect(service.isDarkMode()).toBe(true);
      service.setDarkMode(false);
      expect(service.isDarkMode()).toBe(false);
    });

    it('should persist theme to localStorage', (done) => {
      service.setDarkMode(true);
      setTimeout(() => {
        expect(localStorage.getItem('theme')).toBe('dark');
        done();
      }, 100);
    });

    it('should add dark class to document when dark mode is enabled', (done) => {
      service.setDarkMode(true);
      setTimeout(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        done();
      }, 100);
    });
  });

  describe('Sidebar Management', () => {
    it('should initialize with sidebar expanded by default', () => {
      expect(service.sidebarCollapsed()).toBe(false);
    });

    it('should toggle sidebar', () => {
      expect(service.sidebarCollapsed()).toBe(false);
      service.toggleSidebar();
      expect(service.sidebarCollapsed()).toBe(true);
      service.toggleSidebar();
      expect(service.sidebarCollapsed()).toBe(false);
    });

    it('should persist sidebar state to localStorage', (done) => {
      service.toggleSidebar();
      setTimeout(() => {
        expect(localStorage.getItem('sidebarCollapsed')).toBe('true');
        done();
      }, 100);
    });

    it('should restore sidebar state from localStorage', () => {
      localStorage.setItem('sidebarCollapsed', 'true');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const newService = TestBed.inject(UiStateService);
      expect(newService.sidebarCollapsed()).toBe(true);
    });
  });

  describe('Time Range Management', () => {
    it('should initialize with ALL time range by default', () => {
      expect(service.selectedTimeRange()).toBe('ALL');
    });

    it('should set time range', () => {
      service.setTimeRange(<TimeRange>'1M');
      expect(service.selectedTimeRange()).toBe('1M');
      service.setTimeRange(<TimeRange>'1Y');
      expect(service.selectedTimeRange()).toBe('1Y');
    });
  });

  describe('Modal Management', () => {
    it('should initialize with all modals closed', () => {
      expect(service.showTransactionModal()).toBe(false);
      expect(service.showSecurityModal()).toBe(false);
      expect(service.showSecurityTransactionModal()).toBe(false);
      expect(service.showCurrencyModal()).toBe(false);
      expect(service.showImportConfirmModal()).toBe(false);
      expect(service.showMenu()).toBe(false);
    });

    it('should toggle transaction modal', () => {
      service.toggleTransactionModal();
      expect(service.showTransactionModal()).toBe(true);
      service.toggleTransactionModal();
      expect(service.showTransactionModal()).toBe(false);
    });

    it('should close menu when toggling transaction modal', () => {
      service.showMenu.set(true);
      service.toggleTransactionModal();
      expect(service.showMenu()).toBe(false);
    });

    it('should clear editing transaction when closing modal', () => {
      const mockTransaction = { id: '1' } as DividendTransaction;
      service.editingTransaction.set(mockTransaction);
      service.showTransactionModal.set(true);
      service.toggleTransactionModal();
      expect(service.editingTransaction()).toBeNull();
    });

    it('should toggle security modal', () => {
      service.toggleSecurityModal();
      expect(service.showSecurityModal()).toBe(true);
      service.toggleSecurityModal();
      expect(service.showSecurityModal()).toBe(false);
    });

    it('should toggle security transaction modal', () => {
      service.toggleSecurityTransactionModal();
      expect(service.showSecurityTransactionModal()).toBe(true);
      service.toggleSecurityTransactionModal();
      expect(service.showSecurityTransactionModal()).toBe(false);
    });

    it('should toggle currency modal', () => {
      service.toggleCurrencyModal();
      expect(service.showCurrencyModal()).toBe(true);
      service.toggleCurrencyModal();
      expect(service.showCurrencyModal()).toBe(false);
    });

    it('should toggle menu', () => {
      service.toggleMenu();
      expect(service.showMenu()).toBe(true);
      service.toggleMenu();
      expect(service.showMenu()).toBe(false);
    });
  });

  describe('Editing/Deleting State Management', () => {
    it('should set editing transaction and open modal', () => {
      const mockTransaction = { id: '1' } as DividendTransaction;
      service.setEditingTransaction(mockTransaction);
      expect(service.editingTransaction()).toBe(mockTransaction);
      expect(service.showTransactionModal()).toBe(true);
    });

    it('should set deleting transaction', () => {
      const mockTransaction = { id: '1' } as DividendTransaction;
      service.setDeletingTransaction(mockTransaction);
      expect(service.deletingTransaction()).toBe(mockTransaction);
    });

    it('should set editing security and open modal', () => {
      const mockSecurity = { id: '1', name: 'Test' } as Security;
      service.setEditingSecurity(mockSecurity);
      expect(service.editingSecurity()).toBe(mockSecurity);
      expect(service.showSecurityModal()).toBe(true);
    });

    it('should set editing security transaction and open modal', () => {
      const mockTransaction = { id: '1' } as SecurityTransactionWithSecurity;
      service.setEditingSecurityTransaction(mockTransaction);
      expect(service.editingSecurityTransaction()).toBe(mockTransaction);
      expect(service.showSecurityTransactionModal()).toBe(true);
    });

    it('should set deleting security transaction', () => {
      const mockTransaction = { id: '1' } as SecurityTransactionWithSecurity;
      service.setDeletingSecurityTransaction(mockTransaction);
      expect(service.deletingSecurityTransaction()).toBe(mockTransaction);
    });

    it('should set pending import file and open modal', () => {
      const mockFile = new File(['test'], 'test.json', { type: 'application/json' });
      service.setPendingImportFile(mockFile);
      expect(service.pendingImportFile()).toBe(mockFile);
      expect(service.showImportConfirmModal()).toBe(true);
    });

    it('should close import confirm modal and clear pending file', () => {
      const mockFile = new File(['test'], 'test.json', { type: 'application/json' });
      service.setPendingImportFile(mockFile);
      service.closeImportConfirmModal();
      expect(service.showImportConfirmModal()).toBe(false);
      expect(service.pendingImportFile()).toBeNull();
    });
  });

  describe('Utility Methods', () => {
    it('should format currency correctly', () => {
      const formatted = service.formatCurrency(1234.56);
      expect(formatted).toContain('1.234,56');
      expect(formatted).toContain('€');
    });

    it('should format date correctly', () => {
      const formatted = service.formatDate('2024-01-15');
      expect(formatted).toMatch(/15\.1\.2024/);
    });
  });
});
