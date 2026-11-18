import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SecurityTransactionWithSecurity, TransactionType } from '@dividends/shared';
import { normalizeSecurityTransaction, SecurityTransactionService } from './security-transaction.service';

// Shape of a transaction as the API sends it: Prisma Decimal columns arrive as strings
const apiTransaction = {
  id: 'tx-1',
  date: '2025-02-20T00:00:00.000Z',
  type: TransactionType.SELL,
  securityId: 'sec-1',
  quantity: '5',
  pricePerShare: '155.0000',
  fees: '9.9900',
  currency: 'USD',
  exchangeRate: '1.09890110',
  totalValue: '714.3400',
  note: 'Partial sale',
  createdAt: '2025-02-20T00:00:00.000Z',
  updatedAt: '2025-02-20T00:00:00.000Z',
  security: { id: 'sec-1', name: 'Apple Inc.' },
} as unknown as SecurityTransactionWithSecurity;

const expectNumericFields = (tx: SecurityTransactionWithSecurity) => {
  expect(tx.quantity).toBe(5);
  expect(tx.pricePerShare).toBe(155);
  expect(tx.fees).toBe(9.99);
  expect(tx.exchangeRate).toBe(1.0989011);
  expect(tx.totalValue).toBe(714.34);
};

describe('normalizeSecurityTransaction', () => {
  it('should convert decimal strings to numbers and keep the other fields', () => {
    const result = normalizeSecurityTransaction(apiTransaction);

    expectNumericFields(result);
    expect(result.id).toBe('tx-1');
    expect(result.note).toBe('Partial sale');
    expect(result.security.name).toBe('Apple Inc.');
  });

  it('should keep numbers unchanged', () => {
    const tx = { ...apiTransaction, quantity: 3, fees: 0 } as unknown as SecurityTransactionWithSecurity;

    const result = normalizeSecurityTransaction(tx);

    expect(result.quantity).toBe(3);
    expect(result.fees).toBe(0);
  });
});

describe('SecurityTransactionService', () => {
  let service: SecurityTransactionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SecurityTransactionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('should return numeric fields from getSecurityTransactions', () => {
    let result: SecurityTransactionWithSecurity[] = [];
    service.getSecurityTransactions({ type: TransactionType.SELL }).subscribe((txs) => (result = txs));

    const req = httpMock.expectOne('/api/security-transactions?type=SELL');
    expect(req.request.method).toBe('GET');
    req.flush([apiTransaction]);

    expect(result).toHaveLength(1);
    expectNumericFields(result[0]);
  });

  it('should return numeric fields from getSecurityTransactionById', () => {
    let result: SecurityTransactionWithSecurity | undefined;
    service.getSecurityTransactionById('tx-1').subscribe((tx) => (result = tx));

    httpMock.expectOne('/api/security-transactions/tx-1').flush(apiTransaction);

    expectNumericFields(result as SecurityTransactionWithSecurity);
  });

  it('should return numeric fields from createSecurityTransaction', () => {
    let result: SecurityTransactionWithSecurity | undefined;
    service
      .createSecurityTransaction({
        date: '2025-02-20',
        type: TransactionType.SELL,
        securityId: 'sec-1',
        quantity: 5,
        pricePerShare: 155,
        fees: 9.99,
        currency: 'USD',
        exchangeRate: 1.0989011,
        totalValue: 714.34,
      })
      .subscribe((tx) => (result = tx));

    const req = httpMock.expectOne('/api/security-transactions');
    expect(req.request.method).toBe('POST');
    req.flush(apiTransaction);

    expectNumericFields(result as SecurityTransactionWithSecurity);
  });

  it('should return numeric fields from updateSecurityTransaction', () => {
    let result: SecurityTransactionWithSecurity | undefined;
    service.updateSecurityTransaction('tx-1', { fees: 9.99 }).subscribe((tx) => (result = tx));

    const req = httpMock.expectOne('/api/security-transactions/tx-1');
    expect(req.request.method).toBe('PATCH');
    req.flush(apiTransaction);

    expectNumericFields(result as SecurityTransactionWithSecurity);
  });

  it('should map HTTP errors to an error message', () => {
    let error: Error | undefined;
    service.getSecurityTransactionById('missing').subscribe({ error: (e) => (error = e) });

    httpMock
      .expectOne('/api/security-transactions/missing')
      .flush(null, { status: 404, statusText: 'Not Found' });

    expect(error?.message).toBe('Security or transaction not found');
  });
});
