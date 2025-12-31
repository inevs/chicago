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
  private timeouts = new Map<string, number>();

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
      const timeoutId = window.setTimeout(() => {
        this.remove(id);
      }, duration);

      // Track timeout for cleanup
      this.timeouts.set(id, timeoutId);
    }
  }

  /**
   * Remove a specific toast by ID
   */
  remove(id: string) {
    // Clear any pending timeout for this toast
    const timeoutId = this.timeouts.get(id);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      this.timeouts.delete(id);
    }

    // Remove toast from the list
    this.toasts.update(toasts => toasts.filter(t => t.id !== id));
  }

  /**
   * Clear all toasts
   */
  clear() {
    // Clear all pending timeouts
    this.timeouts.forEach(timeoutId => window.clearTimeout(timeoutId));
    this.timeouts.clear();

    // Clear all toasts
    this.toasts.set([]);
  }
}
