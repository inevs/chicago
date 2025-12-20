import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DividendDataService } from '../../services/dividend-data.service';
import { TimeRange } from '../../models/dividend.model';
import { HeaderNavComponent } from './header-nav/header-nav.component';
import { KpiCardsComponent } from './kpi-cards/kpi-cards.component';
import { ChartsSectionComponent } from './charts-section/charts-section.component';
import { TransactionTableComponent } from './transaction-table/transaction-table.component';
import { TransactionModalComponent, TransactionForm } from './transaction-modal/transaction-modal.component';
import { SecurityModalComponent, SecurityForm } from './security-modal/security-modal.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    HeaderNavComponent,
    KpiCardsComponent,
    ChartsSectionComponent,
    TransactionTableComponent,
    TransactionModalComponent,
    SecurityModalComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  currentRange = signal<TimeRange>('ALL');
  searchTerm = signal('');
  isDarkMode = signal(false);
  showModal = signal(false);
  showSecurityModal = signal(false);
  showMenu = signal(false);

  filteredTransactions = computed(() => {
    return this.dataService.getFilteredTransactions(
      this.currentRange(),
      this.searchTerm()
    );
  });

  kpis = computed(() => {
    return this.dataService.calculateKPIs(this.filteredTransactions());
  });

  sortedTransactions = computed(() => {
    return [...this.filteredTransactions()].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  });

  constructor(private dataService: DividendDataService) {}

  ngOnInit() {
    this.initTheme();
  }

  initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      this.isDarkMode.set(true);
      document.documentElement.classList.add('dark');
    } else {
      this.isDarkMode.set(false);
      document.documentElement.classList.remove('dark');
    }
  }

  toggleTheme() {
    const newDarkMode = !this.isDarkMode();
    this.isDarkMode.set(newDarkMode);

    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }

  setRange(range: TimeRange) {
    this.currentRange.set(range);
  }

  onSearchChange(searchTerm: string) {
    this.searchTerm.set(searchTerm);
  }

  toggleModal() {
    this.showModal.update((show) => !show);
    this.showMenu.set(false);
  }

  toggleSecurityModal() {
    this.showSecurityModal.update((show) => !show);
    this.showMenu.set(false);
  }

  toggleMenu() {
    this.showMenu.update((show) => !show);
  }

  handleTransactionSubmit(transaction: TransactionForm) {
    this.dataService.addTransaction(transaction);
    this.toggleModal();
  }

  handleSecuritySubmit(security: SecurityForm) {
    // TODO: Implement security creation logic
    console.log('New security:', security);
    this.toggleSecurityModal();
  }
}
