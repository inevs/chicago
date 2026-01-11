import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AllSecuritiesComponent } from './all-securities.component';
import { PortfolioStateService } from '../../services/portfolio-state.service';
import { TransactionFacadeService } from '../../services/transaction-facade.service';
import { UiStateService } from '../../services/ui-state.service';
import { Security, SecurityType } from '@dividends/shared';
import { signal } from '@angular/core';

describe('AllSecuritiesComponent', () => {
  let component: AllSecuritiesComponent;
  let fixture: ComponentFixture<AllSecuritiesComponent>;
  let mockPortfolioState: Partial<PortfolioStateService>;
  let mockTransactionFacade: Partial<TransactionFacadeService>;
  let mockUiState: Partial<UiStateService>;

  const mockSecurities: Security[] = [
    {
      id: '1',
      name: 'Apple Inc.',
      symbol: 'AAPL',
      isin: 'US0378331005',
      wkn: '865985',
      type: SecurityType.STOCK,
      exchange: 'NASDAQ',
      currency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      name: 'Vanguard S&P 500 ETF',
      symbol: 'VOO',
      isin: 'US9229083632',
      wkn: 'A1JX52',
      type: SecurityType.ETF,
      exchange: 'NYSE',
      currency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '3',
      name: 'US Treasury Bond',
      symbol: 'UST',
      isin: null,
      wkn: null,
      type: SecurityType.BOND,
      exchange: 'NYSE',
      currency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(async () => {
    mockPortfolioState = {
      securities: signal(mockSecurities),
    };

    mockTransactionFacade = {
      openEditSecurityModal: jest.fn(),
    };

    mockUiState = {};

    await TestBed.configureTestingModule({
      imports: [AllSecuritiesComponent],
      providers: [
        { provide: PortfolioStateService, useValue: mockPortfolioState },
        { provide: TransactionFacadeService, useValue: mockTransactionFacade },
        { provide: UiStateService, useValue: mockUiState },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AllSecuritiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display all securities', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('tbody tr');
    expect(rows.length).toBe(mockSecurities.length);
  });

  it('should filter securities by search query (name)', () => {
    component.searchQuery.set('Apple');
    fixture.detectChanges();

    const filtered = component.filteredSecurities();
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Apple Inc.');
  });

  it('should filter securities by search query (symbol)', () => {
    component.searchQuery.set('VOO');
    fixture.detectChanges();

    const filtered = component.filteredSecurities();
    expect(filtered.length).toBe(1);
    expect(filtered[0].symbol).toBe('VOO');
  });

  it('should filter securities by search query (ISIN)', () => {
    component.searchQuery.set('US0378331005');
    fixture.detectChanges();

    const filtered = component.filteredSecurities();
    expect(filtered.length).toBe(1);
    expect(filtered[0].isin).toBe('US0378331005');
  });

  it('should filter securities by search query (WKN)', () => {
    component.searchQuery.set('865985');
    fixture.detectChanges();

    const filtered = component.filteredSecurities();
    expect(filtered.length).toBe(1);
    expect(filtered[0].wkn).toBe('865985');
  });

  it('should sort securities by symbol ascending', () => {
    // Default is already 'symbol' ascending, so we get the initial sort
    // Alphabetical order: AAPL < UST < VOO
    const filtered = component.filteredSecurities();
    expect(filtered[0].symbol).toBe('AAPL');
    expect(filtered[1].symbol).toBe('UST');
    expect(filtered[2].symbol).toBe('VOO');
  });

  it('should sort securities by symbol descending', () => {
    // First sort call toggles to descending (since default is already symbol ascending)
    component.sort('symbol');
    fixture.detectChanges();

    const filtered = component.filteredSecurities();
    expect(filtered[0].symbol).toBe('VOO');
    expect(filtered[1].symbol).toBe('UST');
    expect(filtered[2].symbol).toBe('AAPL');
  });

  it('should sort securities by name', () => {
    component.sort('name');
    fixture.detectChanges();

    const filtered = component.filteredSecurities();
    expect(filtered[0].name).toBe('Apple Inc.');
    expect(filtered[1].name).toBe('US Treasury Bond');
    expect(filtered[2].name).toBe('Vanguard S&P 500 ETF');
  });

  it('should call openEditSecurityModal when row is clicked', () => {
    component.onRowClick(mockSecurities[0]);
    expect(mockTransactionFacade.openEditSecurityModal).toHaveBeenCalledWith('1');
  });

  it('should return correct badge class for STOCK type', () => {
    const badgeClass = component.getSecurityTypeBadgeClass(SecurityType.STOCK);
    expect(badgeClass).toBe('bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300');
  });

  it('should return correct badge class for ETF type', () => {
    const badgeClass = component.getSecurityTypeBadgeClass(SecurityType.ETF);
    expect(badgeClass).toBe('bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300');
  });

  it('should return correct badge class for BOND type', () => {
    const badgeClass = component.getSecurityTypeBadgeClass(SecurityType.BOND);
    expect(badgeClass).toBe('bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300');
  });

  it('should return correct label for STOCK type', () => {
    const label = component.getSecurityTypeLabel(SecurityType.STOCK);
    expect(label).toBe('Aktie');
  });

  it('should return correct label for ETF type', () => {
    const label = component.getSecurityTypeLabel(SecurityType.ETF);
    expect(label).toBe('ETF');
  });

  it('should return correct label for BOND type', () => {
    const label = component.getSecurityTypeLabel(SecurityType.BOND);
    expect(label).toBe('Anleihe');
  });

  it('should display "-" for null ISIN and WKN', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('tbody tr');
    // UST (US Treasury Bond) is at index 1 after sorting (AAPL, UST, VOO)
    const ustRow = rows[1];

    // ISIN and WKN cells should display "-" for null values
    expect(ustRow.textContent).toContain('-');
  });
});
