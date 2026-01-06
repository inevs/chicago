import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface LatestExchangeRate {
  currency: string;
  rate: number;
  date: Date;
}

@Injectable({
  providedIn: 'root',
})
export class ExchangeRateService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/exchange-rates';

  getExchangeRate(
    baseCurrency: string,
    targetCurrency: string,
    date: string
  ): Observable<{ baseCurrency: string; targetCurrency: string; date: Date; rate: number }> {
    return this.http.get<{ baseCurrency: string; targetCurrency: string; date: Date; rate: number }>(
      `${this.apiUrl}/rate`,
      {
        params: { baseCurrency, targetCurrency, date }
      }
    ).pipe(catchError(this.handleError));
  }

  getLatestRates(): Observable<LatestExchangeRate[]> {
    return this.http.get<LatestExchangeRate[]>(`${this.apiUrl}/latest`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      if (error.status === 404) {
        errorMessage = 'Exchange rate not found';
      } else {
        errorMessage = `Server error: ${error.message}`;
      }
    }

    console.error(errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
