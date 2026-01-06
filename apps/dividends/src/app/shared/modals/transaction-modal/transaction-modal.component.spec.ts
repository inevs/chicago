import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TransactionModalComponent } from './transaction-modal.component';
import { ToastService } from '../../../services/toast.service';
import { PortfolioStateService } from '../../../services/portfolio-state.service';
import { ExchangeRateService } from '../../../services/exchange-rate.service';
import { SecurityAutocompleteComponent } from '../../inputs/security-autocomplete/security-autocomplete.component';
import { Currency, Security, SecurityType } from '@dividends/shared';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { of } from 'rxjs';

// Mock SecurityAutocompleteComponent
@Component({
  selector: 'app-security-autocomplete',
  template: '',
  standalone: true
})
class MockSecurityAutocompleteComponent {
  @Input() value = '';
  @Output() securitySelected = new EventEmitter<Security>();
}

describe('TransactionModalComponent', () => {
  let component: TransactionModalComponent;
  let fixture: ComponentFixture<TransactionModalComponent>;
  let portfolioStateService: PortfolioStateService;
  let exchangeRateService: ExchangeRateService;

  const mockToastService = {
    warning: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  };

  const mockPortfolioStateService = {
    getSharesAtDate: jest.fn().mockReturnValue(0),
  };

  const mockExchangeRateService = {
    getExchangeRate: jest.fn().mockReturnValue(of({ rate: 1.1 })),
  };

  const mockCurrencies: Currency[] = [
    { code: 'EUR', name: 'Euro' },
    { code: 'USD', name: 'US Dollar' },
    { code: 'GBP', name: 'British Pound' },
  ];

  const defaultCurrency: Currency = { code: 'EUR', name: 'Euro' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionModalComponent],
      providers: [
        { provide: ToastService, useValue: mockToastService },
        { provide: PortfolioStateService, useValue: mockPortfolioStateService },
        { provide: ExchangeRateService, useValue: mockExchangeRateService },
      ],
    })
    .overrideComponent(TransactionModalComponent, {
      remove: { imports: [SecurityAutocompleteComponent] },
      add: { imports: [MockSecurityAutocompleteComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransactionModalComponent);
    component = fixture.componentInstance;
    
    // Set required inputs
    fixture.componentRef.setInput('show', true);
    fixture.componentRef.setInput('currencies', mockCurrencies);
    fixture.componentRef.setInput('defaultCurrency', defaultCurrency);
    
    portfolioStateService = TestBed.inject(PortfolioStateService);
    exchangeRateService = TestBed.inject(ExchangeRateService);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Calculation Logic', () => {
    it('should calculate finalPayment when amount changes', () => {
      // Initialize with some values
      component.updateFormData('dividend', 10);
      component.updateFormData('rate', 1);
      component.updateFormData('taxes', 0);

      // Change amount
      component.updateFormDataWithCalculation('amount', 5);

      // 5 * 10 - 0 / 1 = 50
      expect(component.formData().finalPayment).toBe(50);
    });

    it('should calculate finalPayment when dividend changes', () => {
      component.updateFormData('amount', 5);
      component.updateFormData('rate', 1);
      component.updateFormData('taxes', 0);

      // Change dividend
      component.updateFormDataWithCalculation('dividend', 20);

      // 5 * 20 - 0 / 1 = 100
      expect(component.formData().finalPayment).toBe(100);
    });

    it('should calculate finalPayment when taxes changes', () => {
      component.updateFormData('amount', 10);
      component.updateFormData('dividend', 10);
      component.updateFormData('rate', 1);

      // Change taxes
      component.updateFormDataWithCalculation('taxes', 20);

      // 10 * 10 - 20 / 1 = 80
      expect(component.formData().finalPayment).toBe(80);
    });

    it('should calculate finalPayment when rate changes', () => {
      component.updateFormData('amount', 10);
      component.updateFormData('dividend', 10); // Gross 100
      component.updateFormData('taxes', 0);

      // Change rate
      component.updateFormDataWithCalculation('rate', 1.25);

      // 100 / 1.25 = 80
      expect(component.formData().finalPayment).toBe(80);
    });

    it('should calculate finalPayment with all fields', () => {
      // Amount 10 * Dividend 5 = 50 Gross
      // Taxes 5 => 45 Net Orig
      // Rate 1.5 => 30 Net EUR
      
      component.updateFormDataWithCalculation('amount', 10);
      component.updateFormDataWithCalculation('dividend', 5);
      component.updateFormDataWithCalculation('taxes', 5);
      component.updateFormDataWithCalculation('rate', 1.5);

      expect(component.formData().finalPayment).toBe(30);
    });
  });

  describe('Currency Handling & Exchange Rates', () => {
    it('should reset rate to 1.0 when default currency is selected', () => {
      // First set a non-default currency and rate
      component.onCurrencyChange('USD');
      component.updateFormDataWithCalculation('rate', 1.1);
      
      expect(component.formData().currency).toBe('USD');
      expect(component.formData().rate).toBe(1.1);

      // Switch back to default (EUR)
      component.onCurrencyChange('EUR');
      
      expect(component.formData().currency).toBe('EUR');
      expect(component.formData().rate).toBe(1.0);
    });

    it('should recalculate when currency changes', () => {
      component.updateFormData('amount', 10);
      component.updateFormData('dividend', 10); // 100 Gross
      component.updateFormData('taxes', 0);
      
      // Set rate to 2.0 initially (fake scenario)
      component.updateFormData('rate', 2.0);
      
      // Switch to EUR, should reset rate to 1.0 and calc: 100/1 = 100
      component.onCurrencyChange('EUR');
      
      expect(component.formData().finalPayment).toBe(100);
    });

    it('should fetch exchange rate when currency changes and payoutDate is set', () => {
      component.updateFormData('payoutDate', '2023-01-01');
      mockExchangeRateService.getExchangeRate.mockReturnValue(of({ rate: 1.23 }));

      component.onCurrencyChange('USD');

      expect(exchangeRateService.getExchangeRate).toHaveBeenCalledWith('EUR', 'USD', '2023-01-01');
      expect(component.formData().rate).toBe(1.23);
    });

    it('should fetch exchange rate when payoutDate changes and currency is set', () => {
      component.updateFormData('currency', 'GBP');
      mockExchangeRateService.getExchangeRate.mockReturnValue(of({ rate: 0.85 }));

      component.onPayoutDateChange('2023-02-02');

      expect(exchangeRateService.getExchangeRate).toHaveBeenCalledWith('EUR', 'GBP', '2023-02-02');
      expect(component.formData().rate).toBe(0.85);
    });
  });

  describe('Security Selection & Holdings', () => {
    it('should update currency and rate when security is selected', () => {
      const security: Security = {
        id: '1',
        name: 'US Stock',
        symbol: 'US',
        isin: null,
        wkn: null,
        type: SecurityType.STOCK,
        exchange: 'NYSE',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Set initial state
      component.updateFormData('amount', 10);
      component.updateFormData('dividend', 10);
      component.updateFormData('taxes', 0);
      component.updateFormData('rate', 1.0); // EUR default

      // Select USD security
      component.onSecuritySelected(security);

      expect(component.formData().currency).toBe('USD');
      // Rate should NOT change if it was already something valid, 
      // BUT current logic only resets to 1.0 if it IS default currency.
      // If switching to non-default, it keeps the previous rate (which was 1.0 here).
      expect(component.formData().rate).toBe(1.0);
      
      // Now update rate manually as user would
      component.updateFormDataWithCalculation('rate', 1.1);
      
      // Select EUR security
      const eurSecurity: Security = {
        ...security,
        name: 'EU Stock',
        currency: 'EUR'
      };
      
      component.onSecuritySelected(eurSecurity);
      
      expect(component.formData().currency).toBe('EUR');
      expect(component.formData().rate).toBe(1.0);
    });

    it('should update shares from holdings when security selected with exDate set', () => {
      const security: Security = {
        id: '123',
        name: 'My Stock',
        symbol: 'MST',
        isin: null,
        wkn: null,
        type: SecurityType.STOCK,
        exchange: 'XETRA',
        currency: 'EUR',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock holdings return 50 shares
      mockPortfolioStateService.getSharesAtDate.mockReturnValue(50);

      // Set exDate first
      component.updateFormData('exDate', '2023-01-01');
      
      component.onSecuritySelected(security);

      expect(portfolioStateService.getSharesAtDate).toHaveBeenCalledWith('123', '2023-01-01');
      expect(component.formData().amount).toBe(50);
    });

    it('should fetch exchange rate when security with non-default currency is selected', () => {
      const security: Security = {
        id: '123',
        name: 'US Stock',
        symbol: 'US',
        isin: null,
        wkn: null,
        type: SecurityType.STOCK,
        exchange: 'NYSE',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      component.updateFormData('payoutDate', '2023-01-01');
      mockExchangeRateService.getExchangeRate.mockReturnValue(of({ rate: 1.15 }));

      component.onSecuritySelected(security);

      expect(exchangeRateService.getExchangeRate).toHaveBeenCalledWith('EUR', 'USD', '2023-01-01');
      expect(component.formData().rate).toBe(1.15);
    });

    it('should update shares from holdings when exDate changes', () => {
      // Mock holdings return 100 shares
      mockPortfolioStateService.getSharesAtDate.mockReturnValue(100);
      
      // Set security first
      component.updateFormData('securityId', '456');

      component.onExDateChange('2023-06-01');

      expect(portfolioStateService.getSharesAtDate).toHaveBeenCalledWith('456', '2023-06-01');
      expect(component.formData().amount).toBe(100);
    });

    it('should recalculate final payment when holdings update amount', () => {
      mockPortfolioStateService.getSharesAtDate.mockReturnValue(10); // 10 shares
      
      // Dividend 5, Taxes 0, Rate 1
      component.updateFormData('dividend', 5);
      component.updateFormData('taxes', 0);
      component.updateFormData('rate', 1);
      component.updateFormData('securityId', '789');

      component.onExDateChange('2023-01-01');

      // 10 * 5 = 50
      expect(component.formData().finalPayment).toBe(50);
    });
  });

  describe('Input Parsing', () => {
    it('should handle comma as decimal separator', () => {
      expect(component.parseNumberInput('1,5')).toBe(1.5);
      expect(component.parseNumberInput('1.5')).toBe(1.5);
    });

    it('should return 0 for invalid inputs', () => {
      expect(component.parseNumberInput('')).toBe(0);
      expect(component.parseNumberInput('abc')).toBe(0);
    });
  });
});
