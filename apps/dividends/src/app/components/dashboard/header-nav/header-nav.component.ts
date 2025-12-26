import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimeRange } from '../../../models/dividend.model';

@Component({
  selector: 'app-header-nav',
  imports: [CommonModule],
  templateUrl: './header-nav.component.html',
  styleUrls: ['./header-nav.component.scss'],
})
export class HeaderNavComponent {
  currentRange = input.required<TimeRange>();
  isDarkMode = input.required<boolean>();
  showMenu = input.required<boolean>();

  rangeChange = output<TimeRange>();
  themeToggle = output<void>();
  menuToggle = output<void>();
  newTransactionClick = output<void>();
  newSecurityClick = output<void>();
  newSecurityTransactionClick = output<void>();

  onRangeChange(range: TimeRange) {
    this.rangeChange.emit(range);
  }

  onThemeToggle() {
    this.themeToggle.emit();
  }

  onMenuToggle() {
    this.menuToggle.emit();
  }

  onNewTransactionClick() {
    this.newTransactionClick.emit();
  }

  onNewSecurityClick() {
    this.newSecurityClick.emit();
  }

  onNewSecurityTransactionClick() {
    this.newSecurityTransactionClick.emit();
  }
}
