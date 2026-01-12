import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DividendPayment, CreateDividendPaymentDto, UpdateDividendPaymentDto, ImportDividendsCsvResponse } from '@dividends/shared';

@Injectable({
  providedIn: 'root',
})
export class DividendPaymentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/dividend-payments';

  createDividendPayment(
    payment: CreateDividendPaymentDto
  ): Observable<DividendPayment> {
    return this.http.post<DividendPayment>(this.apiUrl, payment).pipe(
      catchError(this.handleError)
    );
  }

  getDividendPayments(
    filters?: {
      securityId?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Observable<DividendPayment[]> {
    let url = this.apiUrl;
    const params: string[] = [];

    if (filters?.securityId) {
      params.push(`securityId=${filters.securityId}`);
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

    return this.http.get<DividendPayment[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getDividendPaymentById(id: string): Observable<DividendPayment> {
    return this.http.get<DividendPayment>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  updateDividendPayment(
    id: string,
    payment: UpdateDividendPaymentDto
  ): Observable<DividendPayment> {
    return this.http.patch<DividendPayment>(`${this.apiUrl}/${id}`, payment).pipe(
      catchError(this.handleError)
    );
  }

  deleteDividendPayment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  importDividendsCsv(file: File): Observable<ImportDividendsCsvResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ImportDividendsCsvResponse>(
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
        errorMessage = 'Security or dividend payment not found';
      } else if (error.status === 400) {
        // Try to extract detailed error message from backend
        if (error.error && typeof error.error === 'object' && 'message' in error.error) {
          errorMessage = error.error.message as string;
        } else if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        } else {
          errorMessage = 'Invalid dividend payment data provided';
        }
      } else {
        errorMessage = `Server error: ${error.message}`;
      }
    }

    console.error(errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
