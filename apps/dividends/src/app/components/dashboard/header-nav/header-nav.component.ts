import { Component, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStateService } from '../../../services/app-state.service';
import { TimeRange } from '../../../models/dividend.model';

@Component({
  selector: 'app-header-nav',
  imports: [CommonModule],
  templateUrl: './header-nav.component.html',
  styleUrls: ['./header-nav.component.scss'],
})
export class HeaderNavComponent {
  protected readonly appState = inject(AppStateService);

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  onRangeChange(range: TimeRange) {
    this.appState.setTimeRange(range);
  }

  onThemeToggle() {
    this.appState.toggleTheme();
  }

  onMenuToggle() {
    this.appState.toggleMenu();
  }

  onNewTransactionClick() {
    this.appState.toggleTransactionModal();
  }

  onNewSecurityClick() {
    this.appState.toggleSecurityModal();
  }

  onNewSecurityTransactionClick() {
    this.appState.toggleSecurityTransactionModal();
  }

  onExportDataClick() {
    this.appState.handleExportData();
  }

  onImportDataClick() {
    if (this.fileInput) {
      this.appState.handleImportData(this.fileInput);
    }
  }

  onFileSelected(event: Event) {
    this.appState.onFileSelected(event);
  }

  onMobileSidebarToggle() {
    this.appState.toggleSidebar();
  }
}
