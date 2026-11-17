import { TestBed } from '@angular/core/testing';
import {
  HttpRequest,
  HttpErrorResponse,
  HttpEvent,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { throwError, of, forkJoin, catchError } from 'rxjs';
import {
  errorInterceptor,
  clearErrorCache,
  reset401Handler,
} from './error.interceptor';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';
import { signal } from '@angular/core';

describe('errorInterceptor', () => {
  let toastService: ToastService;
  let router: Router;
  let authService: AuthService;

  const mockToastService = {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };

  const mockRouter = {
    navigate: vi.fn(),
    url: '/overview',
  };

  const mockAuthService = {
    isAuthenticated: signal(true),
    currentUser: signal(null),
    logout: vi.fn(),
  };

  beforeEach(() => {
    // Setup localStorage mock
    Storage.prototype.removeItem = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        { provide: ToastService, useValue: mockToastService },
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    toastService = TestBed.inject(ToastService);
    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    clearErrorCache(); // Clear error cache between tests
    reset401Handler(); // Reset 401 handling flag between tests
  });

  it('should handle API error with string message', () =>
    new Promise<void>((done) => {
      const errorResponse = new HttpErrorResponse({
        error: {
          statusCode: 404,
          message: 'Resource not found',
          error: 'Not Found',
          correlationId: 'test-correlation-id',
        },
        status: 404,
        statusText: 'Not Found',
        url: '/api/test',
      });

      const request = new HttpRequest('GET', '/api/test');
      const next = vi.fn(() => throwError(() => errorResponse));

      TestBed.runInInjectionContext(() => {
        errorInterceptor(request, next).subscribe({
          error: (err) => {
            expect(toastService.error).toHaveBeenCalledWith(
              'Resource not found (ID: test-cor)'
            );
            expect(err).toBe(errorResponse);
            done();
          },
        });
      });
    }));

  it('should handle API error with array message', () =>
    new Promise<void>((done) => {
      const errorResponse = new HttpErrorResponse({
        error: {
          statusCode: 400,
          message: ['Field 1 is required', 'Field 2 is invalid'],
          error: 'Bad Request',
          correlationId: 'test-correlation-id',
        },
        status: 400,
        statusText: 'Bad Request',
        url: '/api/test',
      });

      const request = new HttpRequest('POST', '/api/test', null);
      const next = vi.fn(() => throwError(() => errorResponse));

      TestBed.runInInjectionContext(() => {
        errorInterceptor(request, next).subscribe({
          error: () => {
            expect(toastService.error).toHaveBeenCalledWith(
              'Field 1 is required, Field 2 is invalid (ID: test-cor)'
            );
            done();
          },
        });
      });
    }));

  it('should handle API error without correlation ID', () =>
    new Promise<void>((done) => {
      const errorResponse = new HttpErrorResponse({
        error: {
          statusCode: 500,
          message: 'Internal server error',
          error: 'Internal Server Error',
        },
        status: 500,
        statusText: 'Internal Server Error',
        url: '/api/test',
      });

      const request = new HttpRequest('GET', '/api/test');
      const next = vi.fn(() => throwError(() => errorResponse));

      TestBed.runInInjectionContext(() => {
        errorInterceptor(request, next).subscribe({
          error: () => {
            expect(toastService.error).toHaveBeenCalledWith(
              'Internal server error'
            );
            done();
          },
        });
      });
    }));

  it('should handle network error', () =>
    new Promise<void>((done) => {
      const errorResponse = new HttpErrorResponse({
        error: new ErrorEvent('Network error', {
          message: 'Connection failed',
        }),
        status: 0,
        statusText: 'Unknown Error',
        url: '/api/test',
      });

      const request = new HttpRequest('GET', '/api/test');
      const next = vi.fn(() => throwError(() => errorResponse));

      TestBed.runInInjectionContext(() => {
        errorInterceptor(request, next).subscribe({
          error: () => {
            expect(toastService.error).toHaveBeenCalledWith(
              'Network error: Connection failed'
            );
            done();
          },
        });
      });
    }));

  it('should handle error with fallback to error field', () =>
    new Promise<void>((done) => {
      const errorResponse = new HttpErrorResponse({
        error: {
          statusCode: 403,
          error: 'Forbidden',
        },
        status: 403,
        statusText: 'Forbidden',
        url: '/api/test',
      });

      const request = new HttpRequest('GET', '/api/test');
      const next = vi.fn(() => throwError(() => errorResponse));

      TestBed.runInInjectionContext(() => {
        errorInterceptor(request, next).subscribe({
          error: () => {
            expect(toastService.error).toHaveBeenCalledWith('Forbidden');
            done();
          },
        });
      });
    }));

  it('should not interfere with successful requests', () =>
    new Promise<void>((done) => {
      const request = new HttpRequest('GET', '/api/test');
      const next = vi.fn(() => of({} as HttpEvent<unknown>));

      TestBed.runInInjectionContext(() => {
        errorInterceptor(request, next).subscribe({
          next: () => {
            expect(toastService.error).not.toHaveBeenCalled();
            done();
          },
        });
      });
    }));

  it('should log error details to console', () =>
    new Promise<void>((done) => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const errorResponse = new HttpErrorResponse({
        error: {
          statusCode: 404,
          message: 'Not found',
          correlationId: 'test-id',
          timestamp: '2024-01-01T00:00:00Z',
        },
        status: 404,
        url: '/api/test',
      });

      const request = new HttpRequest('GET', '/api/test');
      const next = vi.fn(() => throwError(() => errorResponse));

      TestBed.runInInjectionContext(() => {
        errorInterceptor(request, next).subscribe({
          error: () => {
            expect(consoleSpy).toHaveBeenCalledWith('API error:', {
              status: 404,
              message: 'Not found',
              correlationId: 'test-id',
              url: '/api/test',
              timestamp: '2024-01-01T00:00:00Z',
            });
            consoleSpy.mockRestore();
            done();
          },
        });
      });
    }));

  it('should handle 401 error and redirect to login', () =>
    new Promise<void>((done) => {
      const errorResponse = new HttpErrorResponse({
        error: {
          statusCode: 401,
          message: 'Unauthorized',
          error: 'Unauthorized',
        },
        status: 401,
        statusText: 'Unauthorized',
        url: '/api/test',
      });

      const request = new HttpRequest('GET', '/api/test');
      const next = vi.fn(() => throwError(() => errorResponse));

      TestBed.runInInjectionContext(() => {
        errorInterceptor(request, next).subscribe({
          error: () => {
            expect(toastService.error).toHaveBeenCalledWith(
              'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.'
            );

            // Advance timers to trigger the setTimeout
            vi.advanceTimersByTime(10);

            // Verify authService.logout() is called with skipNavigation=true
            expect(authService.logout).toHaveBeenCalledWith(true);

            expect(router.navigate).toHaveBeenCalledWith(['/login'], {
              queryParams: { returnUrl: '/overview' },
            });
            done();
          },
        });
      });
    }));

  it('should handle multiple simultaneous 401 errors gracefully', () =>
    new Promise<void>((done) => {
      const errorResponse = new HttpErrorResponse({
        error: {
          statusCode: 401,
          message: 'Unauthorized',
          error: 'Unauthorized',
        },
        status: 401,
        statusText: 'Unauthorized',
        url: '/api/test',
      });

      const request = new HttpRequest('GET', '/api/test');
      const next = vi.fn(() => throwError(() => errorResponse));

      TestBed.runInInjectionContext(() => {
        // Fire 3 simultaneous 401 errors
        const calls = [
          errorInterceptor(request, next).pipe(catchError(() => of(null))),
          errorInterceptor(request, next).pipe(catchError(() => of(null))),
          errorInterceptor(request, next).pipe(catchError(() => of(null))),
        ];

        forkJoin(calls).subscribe(() => {
          // Advance timers to trigger the setTimeout
          vi.advanceTimersByTime(10);

          // Should only call logout once despite 3 errors
          expect(authService.logout).toHaveBeenCalledTimes(1);
          expect(authService.logout).toHaveBeenCalledWith(true);

          // Should only navigate once
          expect(router.navigate).toHaveBeenCalledTimes(1);
          expect(router.navigate).toHaveBeenCalledWith(['/login'], {
            queryParams: { returnUrl: '/overview' },
          });

          // Should only show toast once (due to deduplication)
          expect(toastService.error).toHaveBeenCalledTimes(1);

          done();
        });
      });
    }));

  it('should deduplicate identical error messages', () =>
    new Promise<void>((done) => {
      const errorResponse = new HttpErrorResponse({
        error: {
          statusCode: 500,
          message: 'Server error',
          error: 'Internal Server Error',
        },
        status: 500,
        statusText: 'Internal Server Error',
        url: '/api/test',
      });

      const request = new HttpRequest('GET', '/api/test');
      const next = vi.fn(() => throwError(() => errorResponse));

      TestBed.runInInjectionContext(() => {
        // First error - should show toast
        errorInterceptor(request, next).subscribe({
          error: () => {
            expect(toastService.error).toHaveBeenCalledTimes(1);
            expect(toastService.error).toHaveBeenCalledWith('Server error');

            // Second error within deduplication window - should not show toast again
            errorInterceptor(request, next).subscribe({
              error: () => {
                // Still only 1 call from the first error
                expect(toastService.error).toHaveBeenCalledTimes(1);
                done();
              },
            });
          },
        });
      });
    }));

  it('should show error again after deduplication window expires', () =>
    new Promise<void>((done) => {
      const errorResponse = new HttpErrorResponse({
        error: {
          statusCode: 500,
          message: 'Server error',
          error: 'Internal Server Error',
        },
        status: 500,
        statusText: 'Internal Server Error',
        url: '/api/test',
      });

      const request = new HttpRequest('GET', '/api/test');
      const next = vi.fn(() => throwError(() => errorResponse));

      TestBed.runInInjectionContext(() => {
        // First error
        errorInterceptor(request, next).subscribe({
          error: () => {
            expect(toastService.error).toHaveBeenCalledTimes(1);

            // Advance time beyond deduplication window (1 second)
            vi.advanceTimersByTime(1100);

            // Second error after window - should show toast again
            errorInterceptor(request, next).subscribe({
              error: () => {
                expect(toastService.error).toHaveBeenCalledTimes(2);
                done();
              },
            });
          },
        });
      });
    }));
});
