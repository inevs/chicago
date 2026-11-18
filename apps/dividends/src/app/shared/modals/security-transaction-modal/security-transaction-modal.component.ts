import { Component, input, output, signal, OnChanges, SimpleChanges, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { form, FormField, FormRoot, required, submit, validate } from '@angular/forms/signals';
import { FieldErrorsComponent } from '../../inputs/field-errors/field-errors.component';
import { DecimalInputComponent } from '../../inputs/decimal-input/decimal-input.component';
import { SecurityAutocompleteComponent } from '../../inputs/security-autocomplete/security-autocomplete.component';
import { Security, SecurityTransactionWithSecurity, TransactionType, Currency } from '@dividends/shared';

const DEFAULT_FALLBACK_CURRENCY = 'EUR';

export interface SecurityTransactionForm {
  id?: string;
  date: string;
  type: TransactionType;
  securityId: string;
  securityName: string;
  quantity: number;
  pricePerShare: number;
  fees: number;
  currency: string;
  exchangeRate: number;
  totalValue: number;
  note: string;
}

@Component({
  selector: 'app-security-transaction-modal',
  imports: [CommonModule, FormField, FormRoot, FieldErrorsComponent, DecimalInputComponent, SecurityAutocompleteComponent],
  templateUrl: './security-transaction-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./security-transaction-modal.component.scss'],
})
export class SecurityTransactionModalComponent implements OnChanges {
  show = input.required<boolean>();
  editTransaction = input<SecurityTransactionWithSecurity | null>(null);
  currencies = input.required<Currency[]>();
  defaultCurrency = input.required<Currency | null>();
  closeModal = output<void>();
  transactionSubmit = output<SecurityTransactionForm>();

  // Make TransactionType accessible in template
  readonly TransactionType = TransactionType;

  readonly inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md ' +
    'bg-white dark:bg-gray-700 text-gray-900 dark:text-white ' +
    'focus:ring-2 focus:ring-brand-500 focus:border-transparent';

  readonly defaultCurrencyCode = computed(() =>
    this.defaultCurrency()?.code ?? DEFAULT_FALLBACK_CURRENCY
  );

  formData = signal<SecurityTransactionForm>({
    date: new Date().toISOString().split('T')[0],
    type: TransactionType.BUY,
    securityId: '',
    securityName: '',
    quantity: 0,
    pricePerShare: 0,
    fees: 0,
    currency: DEFAULT_FALLBACK_CURRENCY,
    exchangeRate: 1.0,
    totalValue: 0,
    note: '',
  });

  readonly transactionForm = form(
    this.formData,
    (path) => {
      required(path.securityId, { message: 'Bitte wählen Sie ein Wertpapier aus der Liste aus' });
      required(path.date, { message: 'Bitte geben Sie ein Datum ein' });
      validate(path.quantity, ({ value }) =>
        value() > 0 ? undefined : { kind: 'min', message: 'Anzahl muss größer als 0 sein' }
      );
      validate(path.pricePerShare, ({ value }) =>
        value() > 0 ? undefined : { kind: 'min', message: 'Preis pro Anteil muss größer als 0 sein' }
      );
      validate(path.fees, ({ value }) =>
        value() >= 0 ? undefined : { kind: 'min', message: 'Gebühren dürfen nicht negativ sein' }
      );
      validate(path.exchangeRate, ({ value }) =>
        value() > 0 ? undefined : { kind: 'min', message: 'Kurs muss größer als 0 sein' }
      );
    },
    {
      submission: {
        action: async () => {
          this.transactionSubmit.emit({
            ...this.formData(),
            totalValue: this.calculatedTotal(),
          });
          this.resetForm();
          return undefined;
        },
      },
    }
  );

  constructor() {
    // Update currency in formData when defaultCurrency changes
    effect(() => {
      const currencyCode = this.defaultCurrencyCode();
      this.formData.update(data => ({
        ...data,
        currency: data.currency === DEFAULT_FALLBACK_CURRENCY ? currencyCode : data.currency
      }));
    });
  }

  // Auto-calculate total value when inputs change
  calculatedTotal = computed(() => {
    const data = this.formData();
    const subtotal = data.quantity * data.pricePerShare;
    const totalInCurrency = subtotal + data.fees;
    const rate = data.exchangeRate > 0 ? data.exchangeRate : 1;
    return totalInCurrency / rate;
  });

  ngOnChanges(changes: SimpleChanges) {
    // Populate form when editTransaction is provided
    if (changes['editTransaction']) {
      const tx = this.editTransaction();
      if (tx) {
        this.formData.set({
          id: tx.id,
          date: new Date(tx.date).toISOString().split('T')[0],
          type: tx.type,
          securityId: tx.securityId,
          securityName: tx.security?.name || '',
          quantity: tx.quantity,
          pricePerShare: tx.pricePerShare,
          fees: tx.fees,
          currency: tx.currency as 'EUR' | 'USD' | 'NOK' | 'GBP',
          exchangeRate: tx.exchangeRate,
          totalValue: tx.totalValue,
          note: tx.note || '',
        });
      } else {
        // Reset form when editTransaction becomes null
        this.resetForm();
      }
    }
  }

  onClose() {
    this.closeModal.emit();
    // Keep the entered values, but hide validation messages until the next interaction
    this.transactionForm().reset();
  }

  onSubmit(): Promise<boolean> {
    return submit(this.transactionForm);
  }

  resetForm() {
    this.transactionForm().reset({
      date: new Date().toISOString().split('T')[0],
      type: TransactionType.BUY,
      securityId: '',
      securityName: '',
      quantity: 0,
      pricePerShare: 0,
      fees: 0,
      currency: this.defaultCurrencyCode(),
      exchangeRate: 1.0,
      totalValue: 0,
      note: '',
    });
  }

  onSecuritySelected(security: Security) {
    const newCurrency = security.currency;
    const defaultCode = this.defaultCurrencyCode();
    this.formData.update(data => ({
      ...data,
      securityName: security.name,
      securityId: security.id,
      currency: newCurrency,
      // Set exchange rate to 1 if currency is default currency
      exchangeRate: newCurrency === defaultCode ? 1.0 : data.exchangeRate,
    }));
  }

  onCurrencyChange(currency: string) {
    const defaultCode = this.defaultCurrencyCode();
    this.formData.update(data => ({
      ...data,
      currency: currency,
      // Automatically set exchange rate to 1 when default currency is selected
      exchangeRate: currency === defaultCode ? 1.0 : data.exchangeRate,
    }));
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
}
