import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';
import { DECIMAL_PARSE_ERROR_MESSAGE, DecimalInputComponent, parseDecimal } from './decimal-input.component';

@Component({
  imports: [DecimalInputComponent, FormField],
  template: `<app-decimal-input [formField]="testForm.amount" inputId="amount" placeholder="0.00" inputClass="my-input" />`,
})
class HostComponent {
  readonly model = signal({ amount: 1.5 });
  readonly testForm = form(this.model);
}

describe('parseDecimal', () => {
  it('should parse a period as decimal separator', () => {
    expect(parseDecimal('1.25')).toEqual({ value: 1.25 });
  });

  it('should parse a comma as decimal separator', () => {
    expect(parseDecimal('1,25')).toEqual({ value: 1.25 });
  });

  it('should treat an empty input as 0', () => {
    expect(parseDecimal('')).toEqual({ value: 0 });
    expect(parseDecimal('  ')).toEqual({ value: 0 });
  });

  it('should return a parse error for invalid input', () => {
    const result = parseDecimal('abc');
    expect(result.value).toBeUndefined();
    expect(result.error).toEqual({ kind: 'parse', message: DECIMAL_PARSE_ERROR_MESSAGE });
  });
});

describe('DecimalInputComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let input: HTMLInputElement;

  const type = (value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('input');
  });

  it('should render the model value and the passed attributes', () => {
    expect(input.value).toBe('1.5');
    expect(input.id).toBe('amount');
    expect(input.placeholder).toBe('0.00');
    expect(input.className).toBe('my-input');
    expect(input.getAttribute('inputmode')).toBe('decimal');
  });

  it('should write comma decimals into the model', () => {
    type('2,75');

    expect(host.model().amount).toBe(2.75);
  });

  it('should report a parse error on the field and keep the last valid value', () => {
    type('abc');

    expect(host.model().amount).toBe(1.5);
    expect(host.testForm.amount().errors().map((e) => e.message)).toContain(DECIMAL_PARSE_ERROR_MESSAGE);
  });

  it('should show model changes from outside', async () => {
    host.model.set({ amount: 42 });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(input.value).toBe('42');
  });

  it('should mark the field as touched on blur', () => {
    expect(host.testForm.amount().touched()).toBe(false);

    input.dispatchEvent(new Event('blur'));

    expect(host.testForm.amount().touched()).toBe(true);
  });
});
