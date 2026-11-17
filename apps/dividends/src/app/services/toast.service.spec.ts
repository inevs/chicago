import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

interface ToastServiceInternal {
  timeouts: Map<string, number>;
}

describe('ToastService', () => {
  let service: ToastService;
  let serviceInternal: ToastServiceInternal;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
    serviceInternal = service as unknown as ToastServiceInternal;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Toast Creation', () => {
    it('should create a success toast', () => {
      service.success('Test message');
      expect(service.toasts().length).toBe(1);
      expect(service.toasts()[0].type).toBe('success');
      expect(service.toasts()[0].message).toBe('Test message');
    });

    it('should create an error toast', () => {
      service.error('Error message');
      expect(service.toasts().length).toBe(1);
      expect(service.toasts()[0].type).toBe('error');
    });

    it('should create a warning toast', () => {
      service.warning('Warning message');
      expect(service.toasts().length).toBe(1);
      expect(service.toasts()[0].type).toBe('warning');
    });

    it('should create an info toast', () => {
      service.info('Info message');
      expect(service.toasts().length).toBe(1);
      expect(service.toasts()[0].type).toBe('info');
    });

    it('should create multiple toasts', () => {
      service.success('Message 1');
      service.error('Message 2');
      service.warning('Message 3');
      expect(service.toasts().length).toBe(3);
    });
  });

  describe('Auto-dismiss', () => {
    it('should auto-remove toast after default duration', () => {
      service.success('Test'); // Default 5000ms
      expect(service.toasts().length).toBe(1);

      vi.advanceTimersByTime(5000);
      expect(service.toasts().length).toBe(0);
    });

    it('should auto-remove toast after custom duration', () => {
      service.success('Test', 3000);
      expect(service.toasts().length).toBe(1);

      vi.advanceTimersByTime(3000);
      expect(service.toasts().length).toBe(0);
    });

    it('should not auto-remove toast with 0 duration', () => {
      service.success('Test', 0);
      expect(service.toasts().length).toBe(1);

      vi.advanceTimersByTime(10000);
      expect(service.toasts().length).toBe(1);
    });
  });

  describe('Manual Removal', () => {
    it('should remove toast by id', () => {
      service.success('Test 1');
      service.success('Test 2');
      const toastId = service.toasts()[0].id;

      service.remove(toastId);
      expect(service.toasts().length).toBe(1);
      expect(service.toasts()[0].message).toBe('Test 2');
    });

    it('should clear timeout when manually removing toast', () => {
      service.success('Test', 5000);
      const toastId = service.toasts()[0].id;

      // Manually remove before timeout
      service.remove(toastId);
      expect(service.toasts().length).toBe(0);

      // Timeout should not try to remove again
      vi.advanceTimersByTime(5000);
      expect(service.toasts().length).toBe(0);
    });

    it('should handle removing non-existent toast', () => {
      service.success('Test');
      expect(() => service.remove('non-existent-id')).not.toThrow();
      expect(service.toasts().length).toBe(1);
    });
  });

  describe('Clear All', () => {
    it('should clear all toasts', () => {
      service.success('Test 1');
      service.error('Test 2');
      service.warning('Test 3');
      expect(service.toasts().length).toBe(3);

      service.clear();
      expect(service.toasts().length).toBe(0);
    });

    it('should clear all pending timeouts', () => {
      service.success('Test 1', 5000);
      service.success('Test 2', 5000);
      service.success('Test 3', 5000);

      service.clear();
      expect(service.toasts().length).toBe(0);

      // Timeouts should not try to remove toasts
      vi.advanceTimersByTime(5000);
      expect(service.toasts().length).toBe(0);
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should not leak timeouts when manually removing toasts', () => {
      const initialTimeoutsCount = serviceInternal.timeouts.size;

      // Create toast with auto-dismiss
      service.success('Test', 5000);
      expect(serviceInternal.timeouts.size).toBe(initialTimeoutsCount + 1);

      // Manually remove before timeout
      const toastId = service.toasts()[0].id;
      service.remove(toastId);

      // Timeout should be cleared from map
      expect(serviceInternal.timeouts.size).toBe(initialTimeoutsCount);
    });

    it('should clean up timeouts after auto-dismiss', () => {
      const initialTimeoutsCount = serviceInternal.timeouts.size;

      service.success('Test', 100);
      expect(serviceInternal.timeouts.size).toBe(initialTimeoutsCount + 1);

      // Wait for auto-dismiss
      vi.advanceTimersByTime(100);

      // Timeout should be cleared from map after firing
      expect(serviceInternal.timeouts.size).toBe(initialTimeoutsCount);
    });

    it('should clear all timeouts when clearing all toasts', () => {
      service.success('Test 1', 5000);
      service.success('Test 2', 5000);
      service.success('Test 3', 5000);
      expect(serviceInternal.timeouts.size).toBe(3);

      service.clear();
      expect(serviceInternal.timeouts.size).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid toast creation and removal', () => {
      for (let i = 0; i < 10; i++) {
        service.success(`Message ${i}`, 1000);
      }
      expect(service.toasts().length).toBe(10);

      // Remove every other toast
      const toastsToRemove = [...service.toasts()].filter(
        (_, i) => i % 2 === 0
      );
      toastsToRemove.forEach((toast) => service.remove(toast.id));

      expect(service.toasts().length).toBe(5);
      expect(serviceInternal.timeouts.size).toBe(5);
    });

    it('should handle mixed manual and auto removal', () => {
      service.success('Auto 1', 100);
      service.success('Manual 1', 5000);
      service.success('Auto 2', 200);
      service.success('Manual 2', 5000);

      // Manually remove one
      const manualToast = service
        .toasts()
        .find((t) => t.message === 'Manual 1');
      if (manualToast) {
        service.remove(manualToast.id);
      }
      expect(service.toasts().length).toBe(3);

      // Wait for auto-dismiss
      vi.advanceTimersByTime(200);
      expect(service.toasts().length).toBe(1);
      expect(service.toasts()[0].message).toBe('Manual 2');
    });
  });
});
