import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UiStateService } from '../../services/ui-state.service';
import {
  LucideDynamicIcon,
  LucideIcon,
  LucideLayoutDashboard,
  LucideBriefcase,
  LucideDollarSign,
  LucideArrowLeftRight,
  LucideChartLine,
  LucideChevronLeft,
  LucideChevronRight,
  LucideLibrary,
} from '@lucide/angular';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

@Component({
  selector: 'app-sidebar-nav',
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideDynamicIcon],
  templateUrl: './sidebar-nav.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./sidebar-nav.component.scss'],
})
export class SidebarNavComponent {
  protected readonly uiState = inject(UiStateService);

  // Expose for template access
  protected get appState() {
    return this.uiState;
  }

  // Lucide icons
  protected readonly ChevronLeft = LucideChevronLeft;
  protected readonly ChevronRight = LucideChevronRight;

  navItems: NavItem[] = [
    { path: '/uebersicht', label: 'Übersicht', icon: LucideLayoutDashboard },
    { path: '/portfolio', label: 'Portfolio', icon: LucideBriefcase },
    { path: '/alle-wertpapiere', label: 'Alle Wertpapiere', icon: LucideLibrary },
    { path: '/dividenden', label: 'Dividenden', icon: LucideDollarSign },
    { path: '/wertpapiere', label: 'Käufe & Verkäufe', icon: LucideArrowLeftRight },
    { path: '/analysen', label: 'Analysen', icon: LucideChartLine },
  ];

  toggleSidebar() {
    this.uiState.toggleSidebar();
  }

  onNavItemClick() {
    // Close sidebar on mobile/tablet when nav item is clicked
    if (window.innerWidth <= 1024 && !this.uiState.sidebarCollapsed()) {
      this.uiState.toggleSidebar();
    }
  }
}
