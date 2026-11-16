import { Component, input, output, signal, OnChanges, SimpleChanges, computed, effect, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SecurityAutocompleteComponent } from '../../inputs/security-autocomplete/security-autocomplete.component';
import { Security, Currency } from '@dividends/shared';
import { DividendTransaction } from '../../../models/dividend.model';
import { PortfolioStateService } from '../../../services/portfolio-state.service';
import { ExchangeRateService } from '../../../services/exchange-rate.service';
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
  note?: string;
}

@Component({
  selector: 'app-transaction-modal',
  imports: [CommonModule, FormsModule, SecurityAutocompleteComponent],
  templateUrl: './transaction-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
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
  private readonly portfolioState = inject(PortfolioStateService);
  private readonly exchangeRateService = inject(ExchangeRateService);

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
    note: '',
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
          securityId: tx.securityId || '', // Will be populated if we have the securityId from backend
          exDate: tx.exDate || tx.date, // Use exDate if available, fallback to date
          payoutDate: tx.date, // date field is the payoutDate
          amount: tx.amount,
          dividend: tx.dividend,
          currency: tx.currency,
          rate: tx.rate,
          taxes: tx.taxes,
          finalPayment: tx.finalPayment,
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
      note: '',
    });
  }

  updateFormData(field: keyof TransactionForm, value: unknown) {
    this.formData.update(data => ({ ...data, [field]: value }));
  }

  updateFormDataWithCalculation(field: keyof TransactionForm, value: unknown) {
    this.formData.update(data => {
      const newData = { ...data, [field]: value };
      if (['amount', 'dividend', 'taxes', 'rate'].includes(field)) {
        newData.finalPayment = this.calculateFinalPayment(newData);
      }
      return newData;
    });
  }

  private calculateFinalPayment(data: TransactionForm): number {
    const gross = data.amount * data.dividend;
    const netOrig = gross - data.taxes;
    const rate = data.rate && data.rate !== 0 ? data.rate : 1;
    // Round to 2 decimal places to avoid floating point issues
    return Math.round((netOrig / rate) * 100) / 100;
  }

  parseNumberInput(value: string): number {
    if (!value) return 0;
    const normalized = value.toString().replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  }

  onCurrencyChange(currency: string) {
    const defaultCode = this.defaultCurrencyCode();
    this.formData.update(data => {
      const newData = {
        ...data,
        currency: currency,
        rate: currency === defaultCode ? 1.0 : data.rate
      };
      newData.finalPayment = this.calculateFinalPayment(newData);
      return newData;
    });
    this.updateExchangeRateFromService();
  }

  onSecuritySelected(security: Security) {
    const defaultCode = this.defaultCurrencyCode();
    this.formData.update(data => {
      const newData = {
        ...data,
        name: security.name,
        securityId: security.id,
        currency: security.currency,
        rate: security.currency === defaultCode ? 1.0 : data.rate
      };
      // We don't necessarily want to recalculate here as amount/dividend might be 0,
      // but if they are set, it makes sense to update the final payment with new rate/currency.
      newData.finalPayment = this.calculateFinalPayment(newData);
      return newData;
    });
    this.updateSharesFromHoldings();
    this.updateExchangeRateFromService();
  }

  onExDateChange(date: string) {
    this.updateFormData('exDate', date);
    this.updateSharesFromHoldings();
  }

  onPayoutDateChange(date: string) {
    this.updateFormData('payoutDate', date);
    this.updateExchangeRateFromService();
  }

  private updateExchangeRateFromService() {
    const data = this.formData();
    const defaultCode = this.defaultCurrencyCode();

    if (data.currency && data.currency !== defaultCode && data.payoutDate) {
      this.exchangeRateService.getExchangeRate(defaultCode, data.currency, data.payoutDate).subscribe({
        next: (response) => {
          if (response && response.rate) {
            this.updateFormDataWithCalculation('rate', response.rate);
          }
        },
        error: (err) => console.warn('Could not fetch exchange rate:', err),
      });
    }
  }

  private updateSharesFromHoldings() {
    const data = this.formData();
    if (data.securityId && data.exDate) {
      const shares = this.portfolioState.getSharesAtDate(data.securityId, data.exDate);
      if (shares > 0) {
        this.updateFormDataWithCalculation('amount', shares);
      }
    }
  }
}