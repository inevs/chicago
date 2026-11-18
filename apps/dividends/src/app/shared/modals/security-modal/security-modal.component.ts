import { Component, input, output, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { form, FormField, FormRoot, required, submit } from '@angular/forms/signals';
import { FieldErrorsComponent } from '../../inputs/field-errors/field-errors.component';
import { Currency, Security } from '@dividends/shared';

const DEFAULT_FALLBACK_CURRENCY = 'EUR';

export interface SecurityForm {
  id?: string;
  name: string;
  isin: string;
  wkn: string;
  symbol: string;
  type: 'STOCK' | 'ETF' | 'BOND';
  exchange: string;
  currency: string;
}

@Component({
  selector: 'app-security-modal',
  imports: [CommonModule, FormField, FormRoot, FieldErrorsComponent],
  templateUrl: './security-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./security-modal.component.scss'],
})
export class SecurityModalComponent {
  show = input.required<boolean>();
  currencies = input.required<Currency[]>();
  defaultCurrency = input.required<Currency | null>();
  security = input<Security | null>(null);
  closeModal = output<void>();
  securitySubmit = output<SecurityForm>();

  private readonly defaultCurrencyCode = computed(() =>
    this.defaultCurrency()?.code ?? DEFAULT_FALLBACK_CURRENCY
  );

  isEditMode = computed(() => this.security() !== null);

  formData = signal<SecurityForm>({
    name: '',
    isin: '',
    wkn: '',
    symbol: '',
    type: 'STOCK',
    exchange: '',
    currency: DEFAULT_FALLBACK_CURRENCY,
  });

  readonly securityForm = form(
    this.formData,
    (path) => {
      required(path.name, { message: 'Bitte geben Sie einen Namen ein' });
      required(path.symbol, { message: 'Bitte geben Sie ein Ticker-Symbol ein' });
      required(path.exchange, { message: 'Bitte geben Sie einen Handelsplatz ein' });
      required(path.currency, { message: 'Bitte wählen Sie eine Währung aus' });
    },
    {
      submission: {
        action: async () => {
          this.securitySubmit.emit(this.formData());
          this.resetForm();
          return undefined;
        },
      },
    }
  );

  constructor() {
    // Pre-populate form when editing a security
    effect(() => {
      const sec = this.security();
      if (sec) {
        this.formData.set({
          id: sec.id,
          name: sec.name,
          isin: sec.isin ?? '',
          wkn: sec.wkn ?? '',
          symbol: sec.symbol,
          type: sec.type,
          exchange: sec.exchange,
          currency: sec.currency,
        });
      } else {
        // Update currency in formData when defaultCurrency changes
        const currencyCode = this.defaultCurrencyCode();
        this.formData.update(data => ({ ...data, currency: currencyCode }));
      }
    });
  }

  onClose() {
    this.closeModal.emit();
    // Keep the entered values, but hide validation messages until the next interaction
    this.securityForm().reset();
  }

  onSubmit(): Promise<boolean> {
    return submit(this.securityForm);
  }

  resetForm() {
    this.securityForm().reset({
      id: undefined,
      name: '',
      isin: '',
      wkn: '',
      symbol: '',
      type: 'STOCK',
      exchange: '',
      currency: this.defaultCurrencyCode(),
    });
  }
}
