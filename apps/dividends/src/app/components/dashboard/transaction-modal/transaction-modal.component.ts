import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SecurityAutocompleteComponent } from '../security-autocomplete/security-autocomplete.component';
import { Security } from '@dividends/shared';

export interface TransactionForm {
  name: string;
  date: string;
  amount: number;
  dividend: number;
  currency: 'EUR' | 'USD' | 'NOK';
  rate: number;
  taxes: number;
  buyPrice: number;
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
    date: '',
    amount: 0,
    dividend: 0,
    currency: 'EUR',
    rate: 1.0,
    taxes: 0,
    buyPrice: 0,
    finalPayment: 0,
  });

  onClose() {
    this.closeModal.emit();
  }

  onSubmit() {
    this.transactionSubmit.emit(this.formData());
    this.resetForm();
  }

  resetForm() {
    this.formData.set({
      name: '',
      date: '',
      amount: 0,
      dividend: 0,
      currency: 'EUR',
      rate: 1.0,
      taxes: 0,
      buyPrice: 0,
      finalPayment: 0,
    });
  }

  updateFormData(field: keyof TransactionForm, value: unknown) {
    this.formData.update(data => ({ ...data, [field]: value }));
  }

  onSecuritySelected(security: Security) {
    this.formData.update(data => ({ ...data, name: security.name }));
  }
}
