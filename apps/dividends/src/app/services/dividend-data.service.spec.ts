import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DividendDataService } from './dividend-data.service';
import { DividendPaymentService } from './dividend-payment.service';

describe('DividendDataService', () => {
  let service: DividendDataService;
  let dividendPaymentService: { getDividendPayments: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    dividendPaymentService = {
      getDividendPayments: vi.fn().mockReturnValue(
        of([
          {
            id: 'div-1',
            exDate: '2024-12-01T00:00:00.000Z',
            payoutDate: '2024-12-05T00:00:00.000Z',
            securityId: 'sec-1',
            shares: '75',
            dividendYield: '1',
            taxAmount: '18.75',
            originCurrency: 'USD',
            destCurrency: 'EUR',
            conversionRate: '1.0989011',
            finalPayment: '51.19',
            security: { name: 'Amazon.com Inc.' },
          },
        ])
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        DividendDataService,
        { provide: DividendPaymentService, useValue: dividendPaymentService },
      ],
    });

    service = TestBed.inject(DividendDataService);
  });

  it('starts without any dividend transactions', () => {
    expect(service.getTransactions()()).toEqual([]);
  });

  it('loads dividend transactions from the backend', () => {
    service.loadTransactionsFromBackend();

    const transactions = service.getTransactions()();
    expect(transactions).toHaveLength(1);
    expect(transactions[0].name).toBe('Amazon.com Inc.');
  });

  it('clears all dividend transactions', () => {
    service.loadTransactionsFromBackend();

    service.clearTransactions();

    expect(service.getTransactions()()).toEqual([]);
  });
});
