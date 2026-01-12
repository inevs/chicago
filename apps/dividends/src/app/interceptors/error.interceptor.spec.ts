import { TestBed } from '@angular/core/testing';
import {
  HttpRequest,
  HttpErrorResponse,
  HttpEvent,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { throwError, of } from 'rxjs';
import { errorInterceptor, clearErrorCache } from './error.interceptor';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';
import { signal } from '@angular/core';

describe('errorInterceptor', () => {
  let toastService: ToastService;
  let router: Router;
  let authService: AuthService;

  const mockToastService = {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  };

  const mockRouter = {
    navigate: jest.fn(),
    url: '/overview',
  };

  const mockAuthService = {
    isAuthenticated: signal(true),
    currentUser: signal(null),
    logout: jest.fn(),
  };

  beforeEach(() => {
    // Setup localStorage mock
    Storage.prototype.removeItem = jest.fn();

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
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    clearErrorCache(); // Clear error cache between tests
  });

  it('should handle API error with string message', (done) => {
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
    const next = jest.fn(() => throwError(() => errorResponse));

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
  });

  it('should handle API error with array message', (done) => {
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

    const request = new HttpRequest('POST', '/api/test');
    const next = jest.fn(() => throwError(() => errorResponse));

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
  });

  it('should handle API error without correlation ID', (done) => {
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
    const next = jest.fn(() => throwError(() => errorResponse));

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
  });

  it('should handle network error', (done) => {
    const errorResponse = new HttpErrorResponse({
      error: new ErrorEvent('Network error', {
        message: 'Connection failed',
      }),
      status: 0,
      statusText: 'Unknown Error',
      url: '/api/test',
    });

    const request = new HttpRequest('GET', '/api/test');
    const next = jest.fn(() => throwError(() => errorResponse));

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
  });

  it('should handle error with fallback to error field', (done) => {
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
    const next = jest.fn(() => throwError(() => errorResponse));

    TestBed.runInInjectionContext(() => {
      errorInterceptor(request, next).subscribe({
        error: () => {
          expect(toastService.error).toHaveBeenCalledWith('Forbidden');
          done();
        },
      });
    });
  });

  it('should not interfere with successful requests', (done) => {
    const request = new HttpRequest('GET', '/api/test');
    const next = jest.fn(() => of({} as HttpEvent<unknown>));

    TestBed.runInInjectionContext(() => {
      errorInterceptor(request, next).subscribe({
        next: () => {
          expect(toastService.error).not.toHaveBeenCalled();
          done();
        },
      });
    });
  });

  it('should log error details to console', (done) => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
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
    const next = jest.fn(() => throwError(() => errorResponse));

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
  });

  it('should handle 401 error and redirect to login', (done) => {
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
    const next = jest.fn(() => throwError(() => errorResponse));

    TestBed.runInInjectionContext(() => {
      errorInterceptor(request, next).subscribe({
        error: () => {
          expect(toastService.error).toHaveBeenCalledWith(
            'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.'
          );

          // Advance timers to trigger the setTimeout
          jest.advanceTimersByTime(100);

          // Verify auth state is cleared
          expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
          expect(localStorage.removeItem).toHaveBeenCalledWith('auth_user');
          expect(authService.isAuthenticated()).toBe(false);
          expect(authService.currentUser()).toBe(null);

          expect(router.navigate).toHaveBeenCalledWith(['/login'], {
            queryParams: { returnUrl: '/overview' }
          });
          done();
        },
      });
    });
  });

  it('should deduplicate identical error messages', (done) => {
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
    const next = jest.fn(() => throwError(() => errorResponse));

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
  });

  it('should show error again after deduplication window expires', (done) => {
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
    const next = jest.fn(() => throwError(() => errorResponse));

    TestBed.runInInjectionContext(() => {
      // First error
      errorInterceptor(request, next).subscribe({
        error: () => {
          expect(toastService.error).toHaveBeenCalledTimes(1);

          // Advance time beyond deduplication window (1 second)
          jest.advanceTimersByTime(1100);

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
  });
});
