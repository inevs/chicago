import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
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

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

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

      // Display user-friendly error message via toast
      const displayMessage = correlationId
        ? `${errorMessage} (ID: ${correlationId.substring(0, 8)})`
        : errorMessage;

      toastService.error(displayMessage);

      // Re-throw the error so components can handle it if needed
      return throwError(() => error);
    })
  );
};
