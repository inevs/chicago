import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  SecurityTransactionWithSecurity,
  CreateSecurityTransactionDto,
  UpdateSecurityTransactionDto,
  TransactionType,
  ImportTransactionsCsvResponse,
} from '@dividends/shared';

/**
 * The API serializes Prisma `Decimal` columns as strings (e.g. "155.0000").
 * Convert them to numbers so that calculations in the frontend do not
 * concatenate strings.
 */
export function normalizeSecurityTransaction(
  transaction: SecurityTransactionWithSecurity
): SecurityTransactionWithSecurity {
  return {
    ...transaction,
    quantity: Number(transaction.quantity),
    pricePerShare: Number(transaction.pricePerShare),
    fees: Number(transaction.fees),
    exchangeRate: Number(transaction.exchangeRate),
    totalValue: Number(transaction.totalValue),
  };
}

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
      map(normalizeSecurityTransaction),
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
      map((transactions) => transactions.map(normalizeSecurityTransaction)),
      catchError(this.handleError)
    );
  }

  getSecurityTransactionById(id: string): Observable<SecurityTransactionWithSecurity> {
    return this.http.get<SecurityTransactionWithSecurity>(`${this.apiUrl}/${id}`).pipe(
      map(normalizeSecurityTransaction),
      catchError(this.handleError)
    );
  }

  updateSecurityTransaction(
    id: string,
    transaction: UpdateSecurityTransactionDto
  ): Observable<SecurityTransactionWithSecurity> {
    return this.http.patch<SecurityTransactionWithSecurity>(`${this.apiUrl}/${id}`, transaction).pipe(
      map(normalizeSecurityTransaction),
      catchError(this.handleError)
    );
  }

  deleteSecurityTransaction(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  importSecurityTransactionsCsv(file: File): Observable<ImportTransactionsCsvResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ImportTransactionsCsvResponse>(
      `${this.apiUrl}/import/csv`,
      formData
    ).pipe(
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
