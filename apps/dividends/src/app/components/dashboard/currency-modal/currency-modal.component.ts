import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface CurrencyForm {
  code: string; // ISO 4217 code (3 letters, uppercase)
  name: string; // Display name
}

@Component({
  selector: 'app-currency-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './currency-modal.component.html',
  styleUrls: ['./currency-modal.component.scss'],
})
export class CurrencyModalComponent {
  show = input.required<boolean>();
  closeModal = output<void>();
  currencySubmit = output<CurrencyForm>();

  formData = signal<CurrencyForm>({
    code: '',
    name: '',
  });

  onClose() {
    this.closeModal.emit();
    this.resetForm();
  }

  onSubmit() {
    const data = this.formData();

    // Validation
    if (!data.code || data.code.length !== 3) {
      alert('ISO-Code muss genau 3 Buchstaben lang sein (z.B. CHF, SEK)');
      return;
    }

    if (!data.name.trim()) {
      alert('Bitte geben Sie einen Namen ein (z.B. Schweizer Franken)');
      return;
    }

    // Ensure code is uppercase
    const normalizedData = {
      code: data.code.toUpperCase(),
      name: data.name.trim(),
    };

    this.currencySubmit.emit(normalizedData);
    this.resetForm();
  }

  resetForm() {
    this.formData.set({
      code: '',
      name: '',
    });
  }

  updateFormData(field: keyof CurrencyForm, value: string) {
    this.formData.update((data) => ({ ...data, [field]: value }));
  }

  // Auto-uppercase code as user types
  onCodeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const upperValue = input.value.toUpperCase();
    this.updateFormData('code', upperValue);
  }
}
