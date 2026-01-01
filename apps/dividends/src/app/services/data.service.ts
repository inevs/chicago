import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface ExportData {
  securities: unknown[];
  dividendPayments: unknown[];
  securityTransactions: unknown[];
  securityPrices: unknown[];
  exportedAt: string;
  version: string;
}

export interface ImportResult {
  success: boolean;
  securitiesImported: number;
  dividendPaymentsImported: number;
  securityTransactionsImported: number;
  securityPricesImported: number;
}

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/data';

  exportData(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export`, {
      responseType: 'blob',
    }).pipe(
      catchError(this.handleError)
    );
  }

  importData(file: File, clearExisting = false): Observable<ImportResult> {
    return new Observable((observer) => {
      const reader = new FileReader();

      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);

          this.http.post<ImportResult>(
            `${this.apiUrl}/import${clearExisting ? '?clearExisting=true' : ''}`,
            data
          ).pipe(
            catchError(this.handleError)
          ).subscribe({
            next: (result) => {
              observer.next(result);
              observer.complete();
            },
            error: (error) => {
              observer.error(error);
            }
          });
        } catch (error) {
          observer.error(new Error('Ungültiges JSON-Format'));
        }
      };

      reader.onerror = () => {
        observer.error(new Error('Fehler beim Lesen der Datei'));
      };

      reader.readAsText(file);
    });
  }

  downloadExport(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ein Fehler ist aufgetreten';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Fehler: ${error.error.message}`;
    } else {
      if (error.status === 413) {
        errorMessage = 'Die Datei ist zu groß';
      } else if (error.status === 400) {
        errorMessage = 'Ungültige Daten';
      } else {
        errorMessage = `Server-Fehler: ${error.message}`;
      }
    }

    console.error(errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
