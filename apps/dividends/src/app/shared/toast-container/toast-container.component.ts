import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-toast-container',
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          [@slideIn]
          class="toast"
          [class.toast-success]="toast.type === 'success'"
          [class.toast-error]="toast.type === 'error'"
          [class.toast-warning]="toast.type === 'warning'"
          [class.toast-info]="toast.type === 'info'"
          role="alert"
        >
          <div class="toast-content">
            <div class="toast-icon">
              @switch (toast.type) {
                @case ('success') {
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                }
                @case ('error') {
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                }
                @case ('warning') {
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                }
                @case ('info') {
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              }
            </div>
            <p class="toast-message">{{ toast.message }}</p>
            <button
              (click)="toastService.remove(toast.id)"
              class="toast-close"
              aria-label="Schließen"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 28rem;
      pointer-events: none;
    }

    .toast {
      pointer-events: auto;
      border-radius: 0.5rem;
      padding: 1rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      backdrop-filter: blur(8px);
      border-width: 1px;
      transition: all 0.2s ease-in-out;
    }

    .toast:hover {
      transform: translateY(-2px);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }

    .toast-success {
      background-color: rgba(16, 185, 129, 0.95);
      border-color: rgba(5, 150, 105, 0.5);
      color: white;
    }

    .toast-error {
      background-color: rgba(239, 68, 68, 0.95);
      border-color: rgba(220, 38, 38, 0.5);
      color: white;
    }

    .toast-warning {
      background-color: rgba(245, 158, 11, 0.95);
      border-color: rgba(217, 119, 6, 0.5);
      color: white;
    }

    .toast-info {
      background-color: rgba(31, 106, 103, 0.95);
      border-color: rgba(26, 86, 84, 0.5);
      color: white;
    }

    .toast-content {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .toast-icon {
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    .toast-message {
      flex: 1;
      font-size: 0.875rem;
      line-height: 1.5;
      font-weight: 500;
    }

    .toast-close {
      flex-shrink: 0;
      padding: 0.25rem;
      border-radius: 0.25rem;
      transition: all 0.15s ease-in-out;
      opacity: 0.7;
      background: transparent;
      border: none;
      cursor: pointer;
      color: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .toast-close:hover {
      opacity: 1;
      background-color: rgba(0, 0, 0, 0.1);
    }

    .toast-close:focus {
      outline: none;
      ring: 2px;
      ring-color: rgba(255, 255, 255, 0.5);
    }

    /* Responsive adjustments */
    @media (max-width: 640px) {
      .toast-container {
        left: 1rem;
        right: 1rem;
        max-width: none;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.Eager,
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class ToastContainerComponent {
  protected readonly toastService = inject(ToastService);
}
