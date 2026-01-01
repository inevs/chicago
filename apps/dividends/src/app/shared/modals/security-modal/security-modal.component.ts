import { Component, input, output, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Currency } from '@dividends/shared';

const DEFAULT_FALLBACK_CURRENCY = 'EUR';

export interface SecurityForm {
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
  imports: [CommonModule, FormsModule],
  templateUrl: './security-modal.component.html',
  styleUrls: ['./security-modal.component.scss'],
})
export class SecurityModalComponent {
  show = input.required<boolean>();
  currencies = input.required<Currency[]>();
  defaultCurrency = input.required<Currency | null>();
  closeModal = output<void>();
  securitySubmit = output<SecurityForm>();

  private readonly defaultCurrencyCode = computed(() =>
    this.defaultCurrency()?.code ?? DEFAULT_FALLBACK_CURRENCY
  );

  formData = signal<SecurityForm>({
    name: '',
    isin: '',
    wkn: '',
    symbol: '',
    type: 'STOCK',
    exchange: '',
    currency: DEFAULT_FALLBACK_CURRENCY,
  });

  constructor() {
    // Update currency in formData when defaultCurrency changes
    effect(() => {
      const currencyCode = this.defaultCurrencyCode();
      this.formData.update(data => ({ ...data, currency: currencyCode }));
    });
  }

  onClose() {
    this.closeModal.emit();
  }

  onSubmit() {
    this.securitySubmit.emit(this.formData());
    this.resetForm();
  }

  resetForm() {
    this.formData.set({
      name: '',
      isin: '',
      wkn: '',
      symbol: '',
      type: 'STOCK',
      exchange: '',
      currency: this.defaultCurrencyCode(),
    });
  }

  updateFormData(field: keyof SecurityForm, value: unknown) {
    this.formData.update(data => ({ ...data, [field]: value }));
  }
}
