import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SecurityAutocompleteComponent } from '../security-autocomplete/security-autocomplete.component';
import { Security } from '@dividends/shared';

export interface TransactionForm {
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
export class TransactionModalComponent {
  show = input.required<boolean>();
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
