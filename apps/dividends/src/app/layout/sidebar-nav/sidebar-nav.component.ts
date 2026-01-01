import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AppStateService } from '../../services/app-state.service';
import {
  LucideAngularModule,
  LayoutDashboard,
  Briefcase,
  DollarSign,
  ArrowLeftRight,
  LineChart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-angular';

interface NavItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
}

@Component({
  selector: 'app-sidebar-nav',
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './sidebar-nav.component.html',
  styleUrls: ['./sidebar-nav.component.scss'],
})
export class SidebarNavComponent {
  protected readonly appState = inject(AppStateService);

  // Lucide icons
  protected readonly ChevronLeft = ChevronLeft;
  protected readonly ChevronRight = ChevronRight;

  navItems: NavItem[] = [
    { path: '/uebersicht', label: 'Übersicht', icon: LayoutDashboard },
    { path: '/portfolio', label: 'Portfolio', icon: Briefcase },
    { path: '/dividenden', label: 'Dividenden', icon: DollarSign },
    { path: '/wertpapiere', label: 'Käufe & Verkäufe', icon: ArrowLeftRight },
    { path: '/analysen', label: 'Analysen', icon: LineChart },
  ];

  toggleSidebar() {
    this.appState.toggleSidebar();
  }

  onNavItemClick() {
    // Close sidebar on mobile/tablet when nav item is clicked
    if (window.innerWidth <= 1024 && !this.appState.sidebarCollapsed()) {
      this.appState.toggleSidebar();
    }
  }
}
