import { Component, input, output, signal, OnChanges, SimpleChanges, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SecurityAutocompleteComponent } from '../security-autocomplete/security-autocomplete.component';
import { Security, SecurityTransactionWithSecurity, TransactionType } from '@dividends/shared';

export interface SecurityTransactionForm {
  id?: string;
  date: string;
  type: TransactionType;
  securityId: string;
  securityName: string;
  quantity: number;
  pricePerShare: number;
  fees: number;
  currency: 'EUR' | 'USD' | 'NOK' | 'GBP';
  exchangeRate: number;
  totalValue: number;
  note: string;
}

@Component({
  selector: 'app-security-transaction-modal',
  imports: [CommonModule, FormsModule, SecurityAutocompleteComponent],
  templateUrl: './security-transaction-modal.component.html',
  styleUrls: ['./security-transaction-modal.component.scss'],
})
export class SecurityTransactionModalComponent implements OnChanges {
  show = input.required<boolean>();
  editTransaction = input<SecurityTransactionWithSecurity | null>(null);
  closeModal = output<void>();
  transactionSubmit = output<SecurityTransactionForm>();

  // Make TransactionType accessible in template
  readonly TransactionType = TransactionType;

  formData = signal<SecurityTransactionForm>({
    date: new Date().toISOString().split('T')[0],
    type: TransactionType.BUY,
    securityId: '',
    securityName: '',
    quantity: 0,
    pricePerShare: 0,
    fees: 0,
    currency: 'EUR',
    exchangeRate: 1.0,
    totalValue: 0,
    note: '',
  });

  // Auto-calculate total value when inputs change
  calculatedTotal = computed(() => {
    const data = this.formData();
    const subtotal = data.quantity * data.pricePerShare;
    const totalInCurrency = subtotal + data.fees;
    return totalInCurrency * data.exchangeRate;
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
  }

  onSubmit() {
    // Validation
    const data = this.formData();
    if (!data.securityId) {
      alert('Bitte wählen Sie ein Wertpapier aus der Liste aus');
      return;
    }
    if (!data.date) {
      alert('Bitte geben Sie ein Datum ein');
      return;
    }
    if (data.quantity <= 0) {
      alert('Anzahl muss größer als 0 sein');
      return;
    }
    if (data.pricePerShare <= 0) {
      alert('Preis pro Anteil muss größer als 0 sein');
      return;
    }

    // Update totalValue with calculated value
    const formDataWithTotal = {
      ...data,
      totalValue: this.calculatedTotal(),
    };

    this.transactionSubmit.emit(formDataWithTotal);
    this.resetForm();
  }

  resetForm() {
    this.formData.set({
      date: new Date().toISOString().split('T')[0],
      type: TransactionType.BUY,
      securityId: '',
      securityName: '',
      quantity: 0,
      pricePerShare: 0,
      fees: 0,
      currency: 'EUR',
      exchangeRate: 1.0,
      totalValue: 0,
      note: '',
    });
  }

  updateFormData(field: keyof SecurityTransactionForm, value: unknown) {
    this.formData.update(data => ({ ...data, [field]: value }));
  }

  // Helper to parse number input - accepts both comma and period as decimal separator
  parseNumberInput(value: string): number {
    if (!value) return 0;
    // Replace comma with period for German number format
    const normalized = value.toString().replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  }

  onSecuritySelected(security: Security) {
    this.formData.update(data => ({
      ...data,
      securityName: security.name,
      securityId: security.id,
      currency: security.currency as 'EUR' | 'USD' | 'NOK' | 'GBP',
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
