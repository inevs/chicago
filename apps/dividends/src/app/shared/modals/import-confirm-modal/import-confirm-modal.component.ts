import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ImportMode = 'replace' | 'merge' | 'cancel';

@Component({
  selector: 'app-import-confirm-modal',
  imports: [CommonModule],
  templateUrl: './import-confirm-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./import-confirm-modal.component.scss'],
})
export class ImportConfirmModalComponent {
  show = input.required<boolean>();
  confirm = output<ImportMode>();

  onReplace() {
    this.confirm.emit('replace');
  }

  onMerge() {
    this.confirm.emit('merge');
  }

  onCancel() {
    this.confirm.emit('cancel');
  }
}
