import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  Currency,
  Security,
  SecurityTransactionWithSecurity,
  SecurityType,
  TransactionType,
} from '@dividends/shared';
import { SecurityAutocompleteComponent } from '../../inputs/security-autocomplete/security-autocomplete.component';
import { SecurityTransactionModalComponent } from './security-transaction-modal.component';

@Component({
  selector: 'app-security-autocomplete',
  template: '',
})
class MockSecurityAutocompleteComponent {
  @Input() value = '';
  @Output() securitySelected = new EventEmitter<Security>();
}

describe('SecurityTransactionModalComponent', () => {
  let component: SecurityTransactionModalComponent;
  let fixture: ComponentFixture<SecurityTransactionModalComponent>;

  const currencies: Currency[] = [
    { code: 'EUR', name: 'Euro' },
    { code: 'USD', name: 'US Dollar' },
  ];

  const usSecurity: Security = {
    id: 'sec-1',
    name: 'Apple Inc.',
    symbol: 'AAPL',
    isin: null,
    wkn: null,
    type: SecurityType.STOCK,
    exchange: 'NASDAQ',
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const query = <T extends HTMLElement>(selector: string): T =>
    fixture.nativeElement.querySelector(selector) as T;

  const type = (selector: string, value: string) => {
    const input = query<HTMLInputElement>(selector);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const messages = (): string[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.field-error') as NodeListOf<HTMLElement>).map(
      (el) => el.textContent?.trim() ?? ''
    );

  const fillValidForm = () => {
    component.onSecuritySelected({ ...usSecurity, currency: 'EUR' });
    component.transactionForm.quantity().value.set(10);
    component.transactionForm.pricePerShare().value.set(5);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecurityTransactionModalComponent],
    })
      .overrideComponent(SecurityTransactionModalComponent, {
        remove: { imports: [SecurityAutocompleteComponent] },
        add: { imports: [MockSecurityAutocompleteComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SecurityTransactionModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('show', true);
    fixture.componentRef.setInput('currencies', currencies);
    fixture.componentRef.setInput('defaultCurrency', currencies[0]);
    fixture.detectChanges();
  });

  it('should create with today as date and BUY as type', () => {
    expect(component.formData().date).toBe(new Date().toISOString().split('T')[0]);
    expect(component.formData().type).toBe(TransactionType.BUY);
  });

  describe('decimal inputs', () => {
    it('should accept a comma as decimal separator', () => {
      type('#quantity', '1,5');
      type('#pricePerShare', '100,25');
      type('#fees', '0,99');

      expect(component.formData().quantity).toBe(1.5);
      expect(component.formData().pricePerShare).toBe(100.25);
      expect(component.formData().fees).toBe(0.99);
    });

    it('should show a parse error for invalid numbers', () => {
      type('#quantity', 'abc');
      query<HTMLInputElement>('#quantity').dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      expect(messages()).toContain('Bitte eine gültige Zahl eingeben');
    });
  });

  describe('currency handling', () => {
    it('should take over currency and name from the selected security', () => {
      component.onSecuritySelected(usSecurity);
      fixture.detectChanges();

      expect(component.formData()).toEqual(
        expect.objectContaining({ securityId: 'sec-1', securityName: 'Apple Inc.', currency: 'USD' })
      );
      expect(query('#exchangeRate')).toBeTruthy();
    });

    it('should reset the exchange rate to 1 when the default currency is selected', () => {
      component.onCurrencyChange('USD');
      fixture.detectChanges();
      type('#exchangeRate', '1,1');
      expect(component.formData().exchangeRate).toBe(1.1);

      const select = query<HTMLSelectElement>('#currency');
      select.value = 'EUR';
      select.dispatchEvent(new Event('input'));
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(component.formData().currency).toBe('EUR');
      expect(component.formData().exchangeRate).toBe(1);
      expect(query('#exchangeRate')).toBeNull();
    });
  });

  describe('calculatedTotal', () => {
    it('should calculate (quantity * price + fees) / exchange rate', () => {
      component.formData.update((data) => ({
        ...data,
        quantity: 10,
        pricePerShare: 5,
        fees: 2,
        exchangeRate: 2,
      }));

      expect(component.calculatedTotal()).toBe(26);
    });

    it('should not divide by an exchange rate of 0', () => {
      component.formData.update((data) => ({ ...data, quantity: 1, pricePerShare: 10, exchangeRate: 0 }));

      expect(component.calculatedTotal()).toBe(10);
    });
  });

  describe('validation & submit', () => {
    it('should require security, quantity and price', () => {
      expect(component.transactionForm().valid()).toBe(false);
      expect(component.transactionForm.securityId().errors().map((e) => e.kind)).toContain('required');
      expect(component.transactionForm.quantity().errors().map((e) => e.kind)).toContain('min');
      expect(component.transactionForm.pricePerShare().errors().map((e) => e.kind)).toContain('min');

      fillValidForm();

      expect(component.transactionForm().valid()).toBe(true);
    });

    it('should reject an exchange rate of 0', () => {
      fillValidForm();
      component.transactionForm.exchangeRate().value.set(0);

      expect(component.transactionForm.exchangeRate().errors().map((e) => e.message)).toContain(
        'Kurs muss größer als 0 sein'
      );
    });

    it('should show field errors and not emit for an invalid form', async () => {
      const emitSpy = vi.spyOn(component.transactionSubmit, 'emit');

      const result = await component.onSubmit();
      fixture.detectChanges();

      expect(result).toBe(false);
      expect(emitSpy).not.toHaveBeenCalled();
      expect(messages()).toEqual([
        'Bitte wählen Sie ein Wertpapier aus der Liste aus',
        'Anzahl muss größer als 0 sein',
        'Preis pro Anteil muss größer als 0 sein',
      ]);
    });

    it('should emit the data with the calculated total and reset the form', async () => {
      const emitSpy = vi.spyOn(component.transactionSubmit, 'emit');
      fillValidForm();

      const result = await component.onSubmit();

      expect(result).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ securityId: 'sec-1', quantity: 10, pricePerShare: 5, totalValue: 50 })
      );
      expect(component.formData().securityId).toBe('');
      expect(component.transactionForm().touched()).toBe(false);
    });
  });

  it('should populate the form when editing a transaction', () => {
    const tx = {
      id: 'tx-1',
      date: new Date('2024-03-01T00:00:00Z'),
      type: TransactionType.SELL,
      securityId: 'sec-1',
      security: usSecurity,
      quantity: 3,
      pricePerShare: 150,
      fees: 1,
      currency: 'USD',
      exchangeRate: 1.08,
      totalValue: 417.59,
      note: 'Teilverkauf',
    } as unknown as SecurityTransactionWithSecurity;

    fixture.componentRef.setInput('editTransaction', tx);
    fixture.detectChanges();

    expect(component.formData()).toEqual(
      expect.objectContaining({
        id: 'tx-1',
        date: '2024-03-01',
        type: TransactionType.SELL,
        securityName: 'Apple Inc.',
        quantity: 3,
        exchangeRate: 1.08,
        note: 'Teilverkauf',
      })
    );
    expect(query<HTMLInputElement>('#quantity').value).toBe('3');
    expect(query<HTMLSelectElement>('#transactionType').value).toBe('SELL');
  });
});
