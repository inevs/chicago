import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Currency, CreateCurrencyDto } from '@dividends/shared';

@Injectable({
  providedIn: 'root',
})
export class CurrencyService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/currencies';

  getCurrencies(): Observable<Currency[]> {
    return this.http.get<Currency[]>(this.apiUrl);
  }

  createCurrency(dto: CreateCurrencyDto): Observable<Currency> {
    return this.http.post<Currency>(this.apiUrl, dto);
  }

  getDefaultCurrency(): Observable<Currency> {
    return this.http.get<Currency>(`${this.apiUrl}/default`);
  }
}
