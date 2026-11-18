import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { form, FormField, FormRoot, maxLength, pattern, required, submit, validate } from '@angular/forms/signals';
import { FieldErrorsComponent } from '../../inputs/field-errors/field-errors.component';

export interface CurrencyForm {
  code: string; // ISO 4217 code (3 letters, uppercase)
  name: string; // Display name
}

const EMPTY_CURRENCY: CurrencyForm = { code: '', name: '' };

@Component({
  selector: 'app-currency-modal',
  imports: [CommonModule, FormField, FormRoot, FieldErrorsComponent],
  templateUrl: './currency-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./currency-modal.component.scss'],
})
export class CurrencyModalComponent {
  show = input.required<boolean>();
  closeModal = output<void>();
  currencySubmit = output<CurrencyForm>();

  readonly formData = signal<CurrencyForm>({ ...EMPTY_CURRENCY });

  readonly currencyForm = form(
    this.formData,
    (path) => {
      required(path.code, { message: 'Bitte geben Sie einen ISO-Code ein (z.B. CHF, SEK, JPY)' });
      // Also renders the maxlength attribute on the input
      maxLength(path.code, 3);
      pattern(path.code, /^[A-Za-z]{3}$/, {
        message: 'ISO-Code muss aus genau 3 Buchstaben bestehen (z.B. CHF, SEK, JPY)',
      });
      validate(path.name, ({ value }) =>
        value().trim()
          ? undefined
          : {
              kind: 'required',
              message: 'Bitte geben Sie einen Namen ein (z.B. Schweizer Franken, Schwedische Krone)',
            }
      );
    },
    {
      submission: {
        action: async () => {
          const data = this.formData();
          this.currencySubmit.emit({
            code: data.code.toUpperCase(),
            name: data.name.trim(),
          });
          this.resetForm();
          return undefined;
        },
      },
    }
  );

  onClose() {
    this.closeModal.emit();
    this.resetForm();
  }

  onSubmit(): Promise<boolean> {
    return submit(this.currencyForm);
  }

  resetForm() {
    this.currencyForm().reset({ ...EMPTY_CURRENCY });
  }
}
