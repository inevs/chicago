import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReadonlyFieldState } from '@angular/forms/signals';

/**
 * Shows the validation messages of a Signal Forms field once the field was touched
 * (on blur or when the form is submitted).
 */
@Component({
  selector: 'app-field-errors',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (state().touched() && state().invalid()) {
      <div class="mt-1 space-y-0.5" role="alert">
        @for (error of state().errors(); track $index) {
          <p class="field-error text-xs text-red-600 dark:text-red-400">
            {{ error.message ?? 'Ungültige Eingabe' }}
          </p>
        }
      </div>
    }
  `,
})
export class FieldErrorsComponent {
  readonly state = input.required<ReadonlyFieldState<unknown>>();
}
