import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  SecurityPrice,
  SecurityTransactionWithSecurity,
  SecurityType,
  TransactionType,
} from '@dividends/shared';
import { SecuritiesSummaryComponent } from './securities-summary.component';
import { LatestExchangeRate } from '../../../services/exchange-rate.service';

describe('SecuritiesSummaryComponent', () => {
  let fixture: ComponentFixture<SecuritiesSummaryComponent>;

  const buyTransaction: SecurityTransactionWithSecurity = {
    id: 'tx1',
    date: new Date('2026-01-15'),
    type: TransactionType.BUY,
    securityId: 's1',
    quantity: 2,
    pricePerShare: 40,
    fees: 0,
    currency: 'USD',
    exchangeRate: 1.2,
    totalValue: 80,
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    security: {
      id: 's1',
      name: 'Apple Inc.',
      symbol: 'AAPL',
      isin: 'US0378331005',
      wkn: '865985',
      type: SecurityType.STOCK,
      exchange: 'NASDAQ',
      currency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const usdPrice: SecurityPrice = {
    id: 'p1',
    securityId: 's1',
    date: new Date('2026-11-20'),
    open: 50,
    high: 50,
    low: 50,
    close: 50,
    volume: null,
    currency: 'USD',
    provider: 'yahoo',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const usdRate: LatestExchangeRate = {
    currency: 'USD',
    rate: 1.25,
    date: new Date('2026-11-20'),
  };

  async function render(prices: SecurityPrice[], rates: LatestExchangeRate[]) {
    fixture = TestBed.createComponent(SecuritiesSummaryComponent);
    fixture.componentRef.setInput('filteredTransactions', []);
    fixture.componentRef.setInput('securityTransactions', [buyTransaction]);
    fixture.componentRef.setInput('latestPrices', prices);
    fixture.componentRef.setInput('exchangeRates', rates);
    await fixture.whenStable();
  }

  function missingRateWarning(): HTMLElement | null {
    return fixture.nativeElement.querySelector('[data-testid="missing-exchange-rate"]');
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecuritiesSummaryComponent],
    }).compileComponents();
  });

  describe('missing exchange rate', () => {
    it('shows a warning icon with an explanation if no exchange rate exists for the price currency', async () => {
      await render([usdPrice], []);

      const warning = missingRateWarning();
      expect(warning).not.toBeNull();
      expect(warning?.getAttribute('title')).toBe('Wechselkurs für USD nicht verfügbar');
      expect(warning?.getAttribute('aria-label')).toBe('Wechselkurs für USD nicht verfügbar');
    });

    it('shows the current value in EUR and no warning if an exchange rate exists', async () => {
      await render([usdPrice], [usdRate]);

      expect(missingRateWarning()).toBeNull();
      // 2 shares × 50 USD / 1.25 = 80 EUR
      expect(fixture.nativeElement.textContent).toMatch(/80,00\s€/);
    });

    it('shows no warning if the current value is missing because there is no price', async () => {
      await render([], []);

      expect(missingRateWarning()).toBeNull();
    });
  });
});
