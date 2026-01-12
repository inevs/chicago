import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  correlationId?: string;
  timestamp?: string;
  path?: string;
}

// Error deduplication map: stores error message with timestamp
const errorCache = new Map<string, number>();
const ERROR_DEDUP_WINDOW_MS = 1000; // 1 second window for deduplication

function shouldShowError(message: string): boolean {
  const now = Date.now();
  const lastShown = errorCache.get(message);

  if (lastShown && now - lastShown < ERROR_DEDUP_WINDOW_MS) {
    return false; // Don't show - same error shown recently
  }

  errorCache.set(message, now);

  // Clean up old entries to prevent memory leaks
  if (errorCache.size > 50) {
    const oldestKey = errorCache.keys().next().value;
    if (oldestKey !== undefined) {
      errorCache.delete(oldestKey);
    }
  }

  return true;
}

/**
 * Clear the error cache - used for testing purposes
 * @internal
 */
export function clearErrorCache(): void {
  errorCache.clear();
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred';
      let correlationId: string | undefined;

      if (error.error instanceof ErrorEvent) {
        // Client-side or network error
        errorMessage = `Network error: ${error.error.message}`;
        console.error('Client-side error:', error.error);
      } else {
        // Backend returned an error response
        const apiError = error.error as ApiErrorResponse;

        if (apiError) {
          correlationId = apiError.correlationId;

          // Extract message from API error response
          if (Array.isArray(apiError.message)) {
            errorMessage = apiError.message.join(', ');
          } else if (typeof apiError.message === 'string') {
            errorMessage = apiError.message;
          } else if (apiError.error) {
            errorMessage = apiError.error;
          }
        }

        // Log error with correlation ID for debugging
        console.error('API error:', {
          status: error.status,
          message: errorMessage,
          correlationId,
          url: error.url,
          timestamp: apiError?.timestamp,
        });
      }

      // Handle 401 Unauthorized errors - redirect to login
      if (error.status === 401) {
        // Only show error if not already shown recently (deduplication)
        if (shouldShowError('Unauthorized')) {
          toastService.error('Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.');
        }

        // Clear any existing auth data and redirect to login
        // Use setTimeout to avoid navigation during the current change detection cycle
        setTimeout(() => {
          router.navigate(['/login'], {
            queryParams: { returnUrl: router.url }
          });
        }, 100);

        return throwError(() => error);
      }

      // Display user-friendly error message via toast (with deduplication)
      const displayMessage = correlationId
        ? `${errorMessage} (ID: ${correlationId.substring(0, 8)})`
        : errorMessage;

      if (shouldShowError(displayMessage)) {
        toastService.error(displayMessage);
      }

      // Re-throw the error so components can handle it if needed
      return throwError(() => error);
    })
  );
};
