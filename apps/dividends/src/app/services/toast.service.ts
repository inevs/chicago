import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  toasts = signal<Toast[]>([]);
  private nextId = 0;

  /**
   * Show a success toast notification
   */
  success(message: string, duration = 5000) {
    this.show(message, 'success', duration);
  }

  /**
   * Show an error toast notification
   */
  error(message: string, duration = 7000) {
    this.show(message, 'error', duration);
  }

  /**
   * Show a warning toast notification
   */
  warning(message: string, duration = 6000) {
    this.show(message, 'warning', duration);
  }

  /**
   * Show an info toast notification
   */
  info(message: string, duration = 5000) {
    this.show(message, 'info', duration);
  }

  /**
   * Show a toast notification
   */
  private show(message: string, type: ToastType, duration: number) {
    const id = `toast-${this.nextId++}`;
    const toast: Toast = { id, message, type, duration };

    this.toasts.update(toasts => [...toasts, toast]);

    // Auto-remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  /**
   * Remove a specific toast by ID
   */
  remove(id: string) {
    this.toasts.update(toasts => toasts.filter(t => t.id !== id));
  }

  /**
   * Clear all toasts
   */
  clear() {
    this.toasts.set([]);
  }
}
