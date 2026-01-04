import { TestBed } from '@angular/core/testing';
import {
  HttpRequest,
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
} from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { errorInterceptor } from './error.interceptor';
import { ToastService } from '../services/toast.service';

describe('errorInterceptor', () => {
  let toastService: ToastService;

  const mockToastService = {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: ToastService, useValue: mockToastService }],
    });

    toastService = TestBed.inject(ToastService);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
        error: (error) => {
          expect(toastService.error).toHaveBeenCalledWith(
            'Resource not found (ID: test-cor)'
          );
          expect(error).toBe(errorResponse);
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
        error: (error) => {
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
        error: (error) => {
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
        error: (error) => {
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
        error: (error) => {
          expect(toastService.error).toHaveBeenCalledWith('Forbidden');
          done();
        },
      });
    });
  });

  it('should not interfere with successful requests', (done) => {
    const request = new HttpRequest('GET', '/api/test');
    const next = jest.fn(() => of({} as HttpEvent<any>));

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
});
