import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface SecurityForm {
  name: string;
  isin: string;
  wkn: string;
  symbol: string;
  type: 'STOCK' | 'ETF' | 'BOND';
  exchange: string;
  currency: 'EUR' | 'USD' | 'NOK';
}

@Component({
  selector: 'app-security-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './security-modal.component.html',
  styleUrls: ['./security-modal.component.scss'],
})
export class SecurityModalComponent {
  show = input.required<boolean>();
  closeModal = output<void>();
  securitySubmit = output<SecurityForm>();

  formData = signal<SecurityForm>({
    name: '',
    isin: '',
    wkn: '',
    symbol: '',
    type: 'STOCK',
    exchange: '',
    currency: 'EUR',
  });

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
      currency: 'EUR',
    });
  }

  updateFormData(field: keyof SecurityForm, value: unknown) {
    this.formData.update(data => ({ ...data, [field]: value }));
  }
}
