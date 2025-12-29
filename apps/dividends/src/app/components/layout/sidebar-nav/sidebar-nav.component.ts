import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AppStateService } from '../../../services/app-state.service';
import {
  LucideAngularModule,
  LayoutDashboard,
  Briefcase,
  FileText,
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
    { path: '/transaktionen', label: 'Transaktionen', icon: FileText },
    { path: '/analysen', label: 'Analysen', icon: LineChart },
  ];

  toggleSidebar() {
    this.appState.toggleSidebar();
  }
}
