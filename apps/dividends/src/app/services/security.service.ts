import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Security } from '@dividends/shared';

export interface CreateSecurityRequest {
  name: string;
  symbol: string;
  isin?: string;
  wkn?: string;
  type: 'STOCK' | 'ETF' | 'BOND';
  exchange: string;
  currency: string;
}

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/securities';

  createSecurity(security: CreateSecurityRequest): Observable<Security> {
    return this.http.post<Security>(this.apiUrl, security).pipe(
      catchError(this.handleError)
    );
  }

  getSecurities(): Observable<Security[]> {
    return this.http.get<Security[]>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

  getSecurityById(id: string): Observable<Security> {
    return this.http.get<Security>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  searchSecurities(query: string): Observable<Security[]> {
    return this.http.get<Security[]>(`${this.apiUrl}/search`, {
      params: { q: query }
    }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.status === 409) {
        errorMessage = 'Security with this symbol already exists';
      } else if (error.status === 400) {
        errorMessage = 'Invalid security data provided';
      } else if (error.status === 404) {
        errorMessage = 'Security not found';
      } else {
        errorMessage = `Server error: ${error.message}`;
      }
    }

    console.error(errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
