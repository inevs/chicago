import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  SecurityTransaction,
  SecurityTransactionWithSecurity,
  CreateSecurityTransactionDto,
  UpdateSecurityTransactionDto,
  TransactionType,
} from '@dividends/shared';

@Injectable({
  providedIn: 'root',
})
export class SecurityTransactionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/security-transactions';

  createSecurityTransaction(
    transaction: CreateSecurityTransactionDto
  ): Observable<SecurityTransactionWithSecurity> {
    return this.http.post<SecurityTransactionWithSecurity>(this.apiUrl, transaction).pipe(
      catchError(this.handleError)
    );
  }

  getSecurityTransactions(
    filters?: {
      securityId?: string;
      type?: TransactionType;
      startDate?: string;
      endDate?: string;
    }
  ): Observable<SecurityTransactionWithSecurity[]> {
    let url = this.apiUrl;
    const params: string[] = [];

    if (filters?.securityId) {
      params.push(`securityId=${filters.securityId}`);
    }
    if (filters?.type) {
      params.push(`type=${filters.type}`);
    }
    if (filters?.startDate) {
      params.push(`startDate=${filters.startDate}`);
    }
    if (filters?.endDate) {
      params.push(`endDate=${filters.endDate}`);
    }

    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    return this.http.get<SecurityTransactionWithSecurity[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getSecurityTransactionById(id: string): Observable<SecurityTransactionWithSecurity> {
    return this.http.get<SecurityTransactionWithSecurity>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  updateSecurityTransaction(
    id: string,
    transaction: UpdateSecurityTransactionDto
  ): Observable<SecurityTransactionWithSecurity> {
    return this.http.patch<SecurityTransactionWithSecurity>(`${this.apiUrl}/${id}`, transaction).pipe(
      catchError(this.handleError)
    );
  }

  deleteSecurityTransaction(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
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
      if (error.status === 404) {
        errorMessage = 'Security or transaction not found';
      } else if (error.status === 400) {
        errorMessage = 'Invalid transaction data provided';
      } else {
        errorMessage = `Server error: ${error.message}`;
      }
    }

    console.error(errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
