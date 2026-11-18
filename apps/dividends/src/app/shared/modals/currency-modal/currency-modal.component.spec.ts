import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CurrencyModalComponent } from './currency-modal.component';

describe('CurrencyModalComponent', () => {
  let component: CurrencyModalComponent;
  let fixture: ComponentFixture<CurrencyModalComponent>;

  const query = <T extends HTMLElement>(selector: string): T =>
    fixture.nativeElement.querySelector(selector) as T;

  const messages = (): string[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.field-error') as NodeListOf<HTMLElement>).map(
      (el) => el.textContent?.trim() ?? ''
    );

  const fill = (code: string, name: string) => {
    component.currencyForm.code().value.set(code);
    component.currencyForm.name().value.set(name);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CurrencyModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CurrencyModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('show', true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should bind the inputs to the form model', () => {
    const codeInput = query<HTMLInputElement>('#currencyCode');
    codeInput.value = 'chf';
    codeInput.dispatchEvent(new Event('input'));

    const nameInput = query<HTMLInputElement>('#currencyName');
    nameInput.value = 'Schweizer Franken';
    nameInput.dispatchEvent(new Event('input'));

    expect(component.formData()).toEqual({ code: 'chf', name: 'Schweizer Franken' });
  });

  it('should render the maxlength attribute from the schema', () => {
    expect(query<HTMLInputElement>('#currencyCode').getAttribute('maxlength')).toBe('3');
  });

  describe('validation', () => {
    it('should require a code and a name', () => {
      expect(component.currencyForm.code().errors().map((e) => e.kind)).toContain('required');
      expect(component.currencyForm.name().errors().map((e) => e.kind)).toContain('required');
    });

    it('should reject codes that are not exactly 3 letters', () => {
      fill('CH', 'Franken');
      expect(component.currencyForm.code().errors().map((e) => e.kind)).toContain('pattern');

      fill('C1F', 'Franken');
      expect(component.currencyForm.code().errors().map((e) => e.kind)).toContain('pattern');

      fill('chf', 'Franken');
      expect(component.currencyForm.code().errors()).toEqual([]);
    });

    it('should reject a name that only contains whitespace', () => {
      fill('CHF', '   ');

      expect(component.currencyForm.name().errors().map((e) => e.kind)).toContain('required');
    });
  });

  describe('onSubmit', () => {
    it('should show field errors and not emit for an invalid form', async () => {
      const emitSpy = vi.spyOn(component.currencySubmit, 'emit');

      const result = await component.onSubmit();
      fixture.detectChanges();

      expect(result).toBe(false);
      expect(emitSpy).not.toHaveBeenCalled();
      expect(messages()).toContain('Bitte geben Sie einen ISO-Code ein (z.B. CHF, SEK, JPY)');
      expect(messages()).toContain(
        'Bitte geben Sie einen Namen ein (z.B. Schweizer Franken, Schwedische Krone)'
      );
    });

    it('should emit the normalized currency and reset the form', async () => {
      const emitSpy = vi.spyOn(component.currencySubmit, 'emit');
      fill('chf', '  Schweizer Franken ');

      const result = await component.onSubmit();

      expect(result).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith({ code: 'CHF', name: 'Schweizer Franken' });
      expect(component.formData()).toEqual({ code: '', name: '' });
      expect(component.currencyForm().touched()).toBe(false);
    });
  });

  it('should emit closeModal and reset the form on close', async () => {
    const closeSpy = vi.spyOn(component.closeModal, 'emit');
    fill('CHF', 'Franken');
    await component.onSubmit();
    fill('CH', '');

    component.onClose();

    expect(closeSpy).toHaveBeenCalled();
    expect(component.formData()).toEqual({ code: '', name: '' });
    expect(component.currencyForm().touched()).toBe(false);
  });
});
