import { Component, input, output, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SecurityAutocompleteComponent } from '../security-autocomplete/security-autocomplete.component';
import { Security } from '@dividends/shared';
import { DividendTransaction } from '../../../models/dividend.model';

export interface TransactionForm {
  id?: string;
  name: string;
  securityId: string;
  exDate: string;
  payoutDate: string;
  amount: number;
  dividend: number;
  currency: 'EUR' | 'USD' | 'NOK' | 'GBP';
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
  closeModal = output<void>();
  transactionSubmit = output<TransactionForm>();

  formData = signal<TransactionForm>({
    name: '',
    securityId: '',
    exDate: '',
    payoutDate: '',
    amount: 0,
    dividend: 0,
    currency: 'EUR',
    rate: 1.0,
    taxes: 0,
    finalPayment: 0,
  });

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
      alert('Bitte wählen Sie ein Wertpapier aus der Liste aus');
      return;
    }
    if (!data.exDate) {
      alert('Bitte geben Sie ein Ex-Datum ein');
      return;
    }
    if (!data.payoutDate) {
      alert('Bitte geben Sie ein Auszahlungsdatum ein');
      return;
    }
    if (data.amount <= 0) {
      alert('Anzahl der Aktien muss größer als 0 sein');
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
      currency: 'EUR',
      rate: 1.0,
      taxes: 0,
      finalPayment: 0,
    });
  }

  updateFormData(field: keyof TransactionForm, value: unknown) {
    this.formData.update(data => ({ ...data, [field]: value }));
  }

  onSecuritySelected(security: Security) {
    this.formData.update(data => ({
      ...data,
      name: security.name,
      securityId: security.id
    }));
  }
}
