import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { FormValueControl, ParseResult, transformedValue } from '@angular/forms/signals';

export const DECIMAL_PARSE_ERROR_MESSAGE = 'Bitte eine gültige Zahl eingeben';

/**
 * Parses a decimal number that may use a comma or a period as decimal separator.
 * An empty input is treated as 0.
 */
export function parseDecimal(raw: string): ParseResult<number> {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { value: 0 };
  }
  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isNaN(parsed)
    ? { error: { kind: 'parse', message: DECIMAL_PARSE_ERROR_MESSAGE } }
    : { value: parsed };
}

/**
 * Text input for decimal numbers that accepts a comma as decimal separator
 * (German number format). Bind it with `[formField]` to a number field.
 */
@Component({
  selector: 'app-decimal-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      type="text"
      inputmode="decimal"
      [id]="inputId()"
      [value]="rawValue()"
      (input)="rawValue.set($any($event.target).value)"
      (blur)="touch.emit()"
      [placeholder]="placeholder()"
      [class]="inputClass()"
    />
  `,
})
export class DecimalInputComponent implements FormValueControl<number> {
  readonly value = model.required<number>();
  readonly touch = output<void>();

  readonly inputId = input<string>('');
  readonly placeholder = input<string>('');
  readonly inputClass = input<string>('');

  protected readonly rawValue = transformedValue(this.value, {
    parse: parseDecimal,
    format: (value: number) => value?.toString() ?? '',
  });
}
