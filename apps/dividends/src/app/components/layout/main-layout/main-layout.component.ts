import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AppStateService } from '../../../services/app-state.service';
import { SidebarNavComponent } from '../sidebar-nav/sidebar-nav.component';
import { HeaderNavComponent } from '../../dashboard/header-nav/header-nav.component';
import { TransactionModalComponent } from '../../dashboard/transaction-modal/transaction-modal.component';
import { SecurityModalComponent } from '../../dashboard/security-modal/security-modal.component';
import { SecurityTransactionModalComponent } from '../../dashboard/security-transaction-modal/security-transaction-modal.component';

@Component({
  selector: 'app-main-layout',
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarNavComponent,
    HeaderNavComponent,
    TransactionModalComponent,
    SecurityModalComponent,
    SecurityTransactionModalComponent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
})
export class MainLayoutComponent implements OnInit {
  protected readonly appState = inject(AppStateService);

  ngOnInit() {
    // Load all data on app initialization
    this.appState.loadAllData();
  }
}
