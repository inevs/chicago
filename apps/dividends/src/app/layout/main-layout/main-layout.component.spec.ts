import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MainLayoutComponent } from './main-layout.component';
import { AuthService } from '../../services/auth.service';
import { PortfolioStateService } from '../../services/portfolio-state.service';
import { TransactionFacadeService } from '../../services/transaction-facade.service';
import { UiStateService } from '../../services/ui-state.service';

describe('MainLayoutComponent', () => {
  let isAuthenticated: ReturnType<typeof signal<boolean>>;
  let portfolioState: { loadAllData: ReturnType<typeof vi.fn>; clearAllData: ReturnType<typeof vi.fn> };

  function createComponent(authenticated: boolean) {
    isAuthenticated = signal(authenticated);
    portfolioState = { loadAllData: vi.fn(), clearAllData: vi.fn() };

    TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [
        { provide: AuthService, useValue: { isAuthenticated } },
        { provide: PortfolioStateService, useValue: portfolioState },
        { provide: TransactionFacadeService, useValue: {} },
        { provide: UiStateService, useValue: {} },
      ],
    }).overrideComponent(MainLayoutComponent, {
      // Only the data loading logic is under test, not the child components
      set: { imports: [], template: '' },
    });

    const fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('loads all data on startup when the user is authenticated', () => {
    createComponent(true);

    expect(portfolioState.loadAllData).toHaveBeenCalledTimes(1);
    expect(portfolioState.clearAllData).not.toHaveBeenCalled();
  });

  it('does not load data on startup when the user is not authenticated', () => {
    createComponent(false);

    expect(portfolioState.loadAllData).not.toHaveBeenCalled();
    expect(portfolioState.clearAllData).toHaveBeenCalledTimes(1);
  });

  it('loads all data after a login', () => {
    const fixture = createComponent(false);

    isAuthenticated.set(true);
    fixture.detectChanges();

    expect(portfolioState.loadAllData).toHaveBeenCalledTimes(1);
  });

  it('clears all data after a logout and reloads it after the next login', () => {
    const fixture = createComponent(true);

    isAuthenticated.set(false);
    fixture.detectChanges();
    expect(portfolioState.clearAllData).toHaveBeenCalledTimes(1);

    isAuthenticated.set(true);
    fixture.detectChanges();
    expect(portfolioState.loadAllData).toHaveBeenCalledTimes(2);
  });
});
