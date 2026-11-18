import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Currency, Security, SecurityType } from '@dividends/shared';
import { SecurityModalComponent } from './security-modal.component';

describe('SecurityModalComponent', () => {
  let component: SecurityModalComponent;
  let fixture: ComponentFixture<SecurityModalComponent>;

  const currencies: Currency[] = [
    { code: 'EUR', name: 'Euro' },
    { code: 'USD', name: 'US Dollar' },
  ];

  const security: Security = {
    id: 'sec-1',
    name: 'Apple Inc.',
    symbol: 'AAPL',
    isin: 'US0378331005',
    wkn: null,
    type: SecurityType.STOCK,
    exchange: 'NASDAQ',
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const query = <T extends HTMLElement>(selector: string): T =>
    fixture.nativeElement.querySelector(selector) as T;

  const fillRequired = () => {
    component.securityForm.name().value.set('Apple Inc.');
    component.securityForm.symbol().value.set('AAPL');
    component.securityForm.exchange().value.set('NASDAQ');
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecurityModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SecurityModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('show', true);
    fixture.componentRef.setInput('currencies', currencies);
    fixture.componentRef.setInput('defaultCurrency', currencies[0]);
    fixture.detectChanges();
  });

  it('should create in create mode with the default currency', () => {
    expect(component.isEditMode()).toBe(false);
    expect(component.formData().currency).toBe('EUR');
  });

  it('should pre-populate the form when editing a security', () => {
    fixture.componentRef.setInput('security', security);
    fixture.detectChanges();

    expect(component.isEditMode()).toBe(true);
    expect(component.formData()).toEqual({
      id: 'sec-1',
      name: 'Apple Inc.',
      isin: 'US0378331005',
      wkn: '',
      symbol: 'AAPL',
      type: 'STOCK',
      exchange: 'NASDAQ',
      currency: 'USD',
    });
    expect(query<HTMLInputElement>('#securityName').value).toBe('Apple Inc.');
  });

  it('should bind inputs and selects to the form model', () => {
    const nameInput = query<HTMLInputElement>('#securityName');
    nameInput.value = 'Microsoft';
    nameInput.dispatchEvent(new Event('input'));

    const typeSelect = query<HTMLSelectElement>('#securityType');
    typeSelect.value = 'ETF';
    typeSelect.dispatchEvent(new Event('input'));
    typeSelect.dispatchEvent(new Event('change'));

    expect(component.formData().name).toBe('Microsoft');
    expect(component.formData().type).toBe('ETF');
  });

  it('should require name, symbol and exchange', () => {
    expect(component.securityForm().valid()).toBe(false);
    expect(component.securityForm.name().errors().map((e) => e.kind)).toContain('required');
    expect(component.securityForm.symbol().errors().map((e) => e.kind)).toContain('required');
    expect(component.securityForm.exchange().errors().map((e) => e.kind)).toContain('required');
    expect(component.securityForm.isin().errors()).toEqual([]);
    expect(component.securityForm.wkn().errors()).toEqual([]);

    fillRequired();

    expect(component.securityForm().valid()).toBe(true);
  });

  it('should show field errors and not emit when submitting an invalid form', async () => {
    const emitSpy = vi.spyOn(component.securitySubmit, 'emit');

    const result = await component.onSubmit();
    fixture.detectChanges();

    expect(result).toBe(false);
    expect(emitSpy).not.toHaveBeenCalled();
    const messages = Array.from(
      fixture.nativeElement.querySelectorAll('.field-error') as NodeListOf<HTMLElement>
    ).map((el) => el.textContent?.trim());
    expect(messages).toEqual([
      'Bitte geben Sie einen Namen ein',
      'Bitte geben Sie ein Ticker-Symbol ein',
      'Bitte geben Sie einen Handelsplatz ein',
    ]);
  });

  it('should emit the security and reset the form on valid submit', async () => {
    const emitSpy = vi.spyOn(component.securitySubmit, 'emit');
    fillRequired();

    const result = await component.onSubmit();

    expect(result).toBe(true);
    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Apple Inc.', symbol: 'AAPL', exchange: 'NASDAQ', currency: 'EUR' })
    );
    expect(component.formData().name).toBe('');
    expect(component.securityForm().touched()).toBe(false);
  });

  it('should hide validation messages but keep values when closed', async () => {
    component.securityForm.name().value.set('Draft');
    await component.onSubmit();
    expect(component.securityForm.symbol().touched()).toBe(true);

    component.onClose();

    expect(component.securityForm.symbol().touched()).toBe(false);
    expect(component.formData().name).toBe('Draft');
  });
});
