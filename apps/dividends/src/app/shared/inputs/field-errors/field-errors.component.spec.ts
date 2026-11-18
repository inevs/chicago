import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form, minLength, required } from '@angular/forms/signals';
import { FieldErrorsComponent } from './field-errors.component';

@Component({
  imports: [FieldErrorsComponent],
  template: `<app-field-errors [state]="testForm.name()" />`,
})
class HostComponent {
  readonly model = signal({ name: '' });
  readonly testForm = form(this.model, (path) => {
    required(path.name, { message: 'Name fehlt' });
    minLength(path.name, 3, { message: 'Name zu kurz' });
  });
}

describe('FieldErrorsComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const messages = (): string[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.field-error') as NodeListOf<HTMLElement>).map(
      (el) => el.textContent?.trim() ?? ''
    );

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should not show errors while the field is untouched', () => {
    expect(host.testForm.name().invalid()).toBe(true);
    expect(messages()).toEqual([]);
  });

  it('should show the error messages once the field is touched', () => {
    host.testForm.name().markAsTouched();
    fixture.detectChanges();

    expect(messages()).toEqual(['Name fehlt']);
  });

  it('should update the messages when the value changes', () => {
    host.testForm.name().markAsTouched();
    host.testForm.name().value.set('ab');
    fixture.detectChanges();

    expect(messages()).toEqual(['Name zu kurz']);

    host.testForm.name().value.set('abc');
    fixture.detectChanges();

    expect(messages()).toEqual([]);
  });
});
