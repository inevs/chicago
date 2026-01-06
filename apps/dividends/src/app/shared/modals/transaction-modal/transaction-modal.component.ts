import { Component, input, output, signal, OnChanges, SimpleChanges, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SecurityAutocompleteComponent } from '../../inputs/security-autocomplete/security-autocomplete.component';
import { Security, Currency } from '@dividends/shared';
import { DividendTransaction } from '../../../models/dividend.model';
import { ToastService } from '../../../services/toast.service';

const DEFAULT_FALLBACK_CURRENCY = 'EUR';

export interface TransactionForm {
  id?: string;
  name: string;
  securityId: string;
  exDate: string;
  payoutDate: string;
  amount: number;
  dividend: number;
  currency: string;
  rate: number;
  taxes: number;
  finalPayment: number;
}

@Component({
  selector: 'app-transaction-modal',
  imports: [CommonModule, FormsModule, SecurityAutocompleteComponent],
  templateUrl: './transaction-modal.component.html',
  styleUrls: ['./transaction-modal.component.scss'],
})
export class TransactionModalComponent implements OnChanges {
  show = input.required<boolean>();
  editTransaction = input<DividendTransaction | null>(null);
  currencies = input.required<Currency[]>();
  defaultCurrency = input.required<Currency | null>();
  closeModal = output<void>();
  transactionSubmit = output<TransactionForm>();

  private readonly toastService = inject(ToastService);
  readonly defaultCurrencyCode = computed(() =>
    this.defaultCurrency()?.code ?? DEFAULT_FALLBACK_CURRENCY
  );

  formData = signal<TransactionForm>({
    name: '',
    securityId: '',
    exDate: '',
    payoutDate: '',
    amount: 0,
    dividend: 0,
    currency: DEFAULT_FALLBACK_CURRENCY,
    rate: 1.0,
    taxes: 0,
    finalPayment: 0,
  });

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

  ngOnChanges(changes: SimpleChanges) {
    // Populate form when editTransaction is provided
    if (changes['editTransaction']) {
      const tx = this.editTransaction();
      if (tx) {
        this.formData.set({
          id: typeof tx.id === 'string' ? tx.id : String(tx.id),
          name: tx.name,
          securityId: '', // Will be populated if we have the securityId from backend
          exDate: tx.date,
          payoutDate: tx.date, // Use same date if no separate payout date
          amount: tx.amount,
          dividend: tx.dividend,
          currency: tx.currency,
          rate: tx.rate,
          taxes: tx.taxes,
          finalPayment: tx.finalPayment,
        });
      } else {
        // Reset form when editTransaction becomes null
        this.resetForm();
      }
    }
  }

  onClose() {
    this.closeModal.emit();
  }

  onSubmit() {
    // Validation
    const data = this.formData();
    if (!data.securityId) {
      this.toastService.warning('Bitte wählen Sie ein Wertpapier aus der Liste aus');
      return;
    }
    if (!data.exDate) {
      this.toastService.warning('Bitte geben Sie ein Ex-Datum ein');
      return;
    }
    if (!data.payoutDate) {
      this.toastService.warning('Bitte geben Sie ein Auszahlungsdatum ein');
      return;
    }
    if (data.amount <= 0) {
      this.toastService.warning('Anzahl der Aktien muss größer als 0 sein');
      return;
    }

    this.transactionSubmit.emit(data);
    this.resetForm();
  }

  resetForm() {
    this.formData.set({
      name: '',
      securityId: '',
      exDate: '',
      payoutDate: '',
      amount: 0,
      dividend: 0,
      currency: this.defaultCurrencyCode(),
      rate: 1.0,
      taxes: 0,
      finalPayment: 0,
    });
  }

  updateFormData(field: keyof TransactionForm, value: unknown) {
    this.formData.update(data => ({ ...data, [field]: value }));
  }

  onCurrencyChange(currency: string) {
    const defaultCode = this.defaultCurrencyCode();
    this.formData.update(data => ({
      ...data,
      currency: currency,
      rate: currency === defaultCode ? 1.0 : data.rate
    }));
  }

  onSecuritySelected(security: Security) {
    const defaultCode = this.defaultCurrencyCode();
    this.formData.update(data => ({
      ...data,
      name: security.name,
      securityId: security.id,
      currency: security.currency,
      rate: security.currency === defaultCode ? 1.0 : data.rate
    }));
  }
}
