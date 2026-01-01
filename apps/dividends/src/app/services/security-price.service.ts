import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SecurityPrice } from '@dividends/shared';

@Injectable({
  providedIn: 'root',
})
export class SecurityPriceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/security-prices';

  getLatestSecurityPrices(): Observable<SecurityPrice[]> {
    return this.http.get<SecurityPrice[]>(`${this.apiUrl}/latest`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      if (error.status === 404) {
        errorMessage = 'Security prices not found';
      } else {
        errorMessage = `Server error: ${error.message}`;
      }
    }

    console.error(errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
