import { Component, inject, ViewChild, ElementRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { UiStateService } from '../../services/ui-state.service';
import { PortfolioStateService } from '../../services/portfolio-state.service';
import { TransactionFacadeService } from '../../services/transaction-facade.service';
import { TimeRange } from '../../models/dividend.model';

interface MenuOption {
  label: string;
  icon: string;
  action: () => void;
  color: string;
}

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
  private readonly router = inject(Router);

  // Track current route
  protected readonly currentRoute = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  // Computed menu options based on current route
  protected readonly menuOptions = computed<MenuOption[]>(() => {
    const route = this.currentRoute();

    if (route.includes('/portfolio')) {
      return [
        {
          label: 'Neues Wertpapier',
          icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
          action: () => this.onNewSecurityClick(),
          color: 'blue'
        },
        {
          label: 'Wertpapiere importieren (CSV)',
          icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
          action: () => this.onImportSecuritiesCsvClick(),
          color: 'green'
        },
        {
          label: 'Neue Währung',
          icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
          action: () => this.onNewCurrencyClick(),
          color: 'purple'
        }
      ];
    } else if (route.includes('/alle-wertpapiere')) {
      return [
        {
          label: 'Neues Wertpapier',
          icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
          action: () => this.onNewSecurityClick(),
          color: 'blue'
        },
        {
          label: 'Wertpapiere importieren (CSV)',
          icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
          action: () => this.onImportSecuritiesCsvClick(),
          color: 'green'
        }
      ];
    } else if (route.includes('/dividenden')) {
      return [
        {
          label: 'Neue Buchung',
          icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
          action: () => this.onNewTransactionClick(),
          color: 'blue'
        }
      ];
    } else if (route.includes('/wertpapiere')) {
      return [
        {
          label: 'Neue Wertpapier-Transaktion',
          icon: 'M8 7h12M8 12h12m-12 5h12M3 7h.01M3 12h.01M3 17h.01',
          action: () => this.onNewSecurityTransactionClick(),
          color: 'blue'
        }
      ];
    }

    // Default: show all options for other routes
    return [
      {
        label: 'Neues Wertpapier',
        icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
        action: () => this.onNewSecurityClick(),
        color: 'blue'
      },
      {
        label: 'Neue Buchung',
        icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        action: () => this.onNewTransactionClick(),
        color: 'blue'
      },
      {
        label: 'Neue Wertpapier-Transaktion',
        icon: 'M8 7h12M8 12h12m-12 5h12M3 7h.01M3 12h.01M3 17h.01',
        action: () => this.onNewSecurityTransactionClick(),
        color: 'blue'
      },
      {
        label: 'Neue Währung',
        icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        action: () => this.onNewCurrencyClick(),
        color: 'purple'
      }
    ];
  });

  // Expose for template access
  protected get appState() {
    return this.uiState;
  }

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('csvFileInput') csvFileInput?: ElementRef<HTMLInputElement>;

  onRangeChange(range: TimeRange) {
    this.uiState.setTimeRange(range);
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

  onImportSecuritiesCsvClick() {
    if (this.csvFileInput) {
      this.transactionFacade.handleImportSecuritiesCsv(this.csvFileInput);
    }
  }

  onCsvFileSelected(event: Event) {
    this.transactionFacade.onCsvFileSelected(event);
  }

  onMobileSidebarToggle() {
    this.uiState.toggleSidebar();
  }
}
