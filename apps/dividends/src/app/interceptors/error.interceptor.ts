import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';

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

// Flag to prevent multiple simultaneous 401 error handlers
let isHandling401 = false;

function shouldShowError(message: string): boolean {
  const now = Date.now();
  const lastShown = errorCache.get(message);

  if (lastShown && now - lastShown < ERROR_DEDUP_WINDOW_MS) {
    return false; // Don't show - same error shown recently
  }

  errorCache.set(message, now);

  // Clean up old entries to prevent memory leaks
  if (errorCache.size > 50) {
    // Remove expired entries first
    const cutoffTime = now - ERROR_DEDUP_WINDOW_MS;
    for (const [key, timestamp] of errorCache.entries()) {
      if (timestamp < cutoffTime) {
        errorCache.delete(key);
      }
    }

    // If still over limit, remove oldest entries until we're at 40
    if (errorCache.size > 50) {
      const keysToDelete = Array.from(errorCache.keys()).slice(0, errorCache.size - 40);
      keysToDelete.forEach(key => errorCache.delete(key));
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

/**
 * Reset the 401 handling flag - used for testing purposes
 * @internal
 */
export function reset401Handler(): void {
  isHandling401 = false;
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  const router = inject(Router);
  const authService = inject(AuthService);

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
        const sessionExpiredMessage = 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.';

        // Only show error if not already shown recently (deduplication)
        if (shouldShowError(sessionExpiredMessage)) {
          toastService.error(sessionExpiredMessage);
        }

        // Ensure we only handle 401 once to prevent race conditions
        if (!isHandling401) {
          isHandling401 = true;
          const returnUrl = router.url;

          // Use setTimeout to avoid navigation during the current change detection cycle
          setTimeout(() => {
            // Clear auth state using the service method
            authService.logout(true); // Skip navigation in logout

            // Navigate to login with return URL
            router.navigate(['/login'], {
              queryParams: { returnUrl }
            });

            // Reset flag after navigation
            isHandling401 = false;
          }, 0);
        }

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
