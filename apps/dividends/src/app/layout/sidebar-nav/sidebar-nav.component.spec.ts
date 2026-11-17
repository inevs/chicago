import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { SidebarNavComponent } from './sidebar-nav.component';
import { UiStateService } from '../../services/ui-state.service';

describe('SidebarNavComponent', () => {
  let fixture: ComponentFixture<SidebarNavComponent>;
  let element: HTMLElement;

  const mockUiStateService = {
    sidebarCollapsed: signal(false),
    toggleSidebar: vi.fn(() =>
      mockUiStateService.sidebarCollapsed.update((collapsed) => !collapsed)
    ),
  };

  beforeEach(async () => {
    mockUiStateService.sidebarCollapsed.set(false);
    mockUiStateService.toggleSidebar.mockClear();

    await TestBed.configureTestingModule({
      imports: [SidebarNavComponent],
      providers: [
        provideRouter([]),
        { provide: UiStateService, useValue: mockUiStateService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarNavComponent);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('should render an svg icon for every navigation item', () => {
    const navItems = element.querySelectorAll('a.nav-item');
    expect(navItems.length).toBe(6);

    navItems.forEach((item) => {
      const icon = item.querySelector('svg.nav-icon');
      expect(icon).not.toBeNull();
      expect(icon?.childElementCount).toBeGreaterThan(0);
    });
  });

  it('should show nav labels when the sidebar is expanded', () => {
    const labels = Array.from(element.querySelectorAll('.nav-label')).map(
      (label) => label.textContent?.trim()
    );
    expect(labels).toEqual([
      'Übersicht',
      'Portfolio',
      'Alle Wertpapiere',
      'Dividenden',
      'Käufe & Verkäufe',
      'Analysen',
    ]);
  });

  it('should hide nav labels when the sidebar is collapsed', () => {
    mockUiStateService.sidebarCollapsed.set(true);
    fixture.detectChanges();

    expect(element.querySelectorAll('.nav-label').length).toBe(0);
    expect(element.querySelector('.logo-text')).toBeNull();
  });

  it('should switch the collapse icon when the sidebar is toggled', () => {
    const collapseIcon = () =>
      element.querySelector('svg.collapse-icon')?.innerHTML;

    const expandedIcon = collapseIcon();
    expect(expandedIcon).toBeTruthy();

    (element.querySelector('.collapse-btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(mockUiStateService.toggleSidebar).toHaveBeenCalledTimes(1);
    expect(collapseIcon()).toBeTruthy();
    expect(collapseIcon()).not.toBe(expandedIcon);
  });
});
