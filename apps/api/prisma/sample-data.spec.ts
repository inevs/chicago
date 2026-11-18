import {
  SAMPLE_CURRENCY_NAMES,
  SAMPLE_DATA_BASE_CURRENCY,
  SAMPLE_SECURITIES,
  buildSampleDividends,
  buildSampleTransactions,
  calculateFinalPayment,
  calculateTransactionTotal,
  getSampleCurrencyCodes,
  isSampleDataEnabled,
  toAppRate,
} from './sample-data';

describe('sample-data', () => {
  describe('toAppRate', () => {
    it('inverts a base-per-foreign rate into the application convention', () => {
      expect(toAppRate(0.92)).toBe(1.08695652);
      expect(toAppRate(0.8)).toBe(1.25);
    });

    it('keeps a rate of 1', () => {
      expect(toAppRate(1)).toBe(1);
    });

    it.each([0, -1, Number.NaN])('rejects invalid rate %p', (rate) => {
      expect(() => toAppRate(rate)).toThrow('Invalid exchange rate');
    });
  });

  describe('calculateTransactionTotal', () => {
    it('converts quantity * price + fees with the rate', () => {
      expect(calculateTransactionTotal(20, 85.3, 12.5, 1)).toBe(1718.5);
      expect(calculateTransactionTotal(10, 100, 0, 1.25)).toBe(800);
    });
  });

  describe('calculateFinalPayment', () => {
    it('converts the net dividend with the rate', () => {
      expect(calculateFinalPayment(100, 0.25, 6.25, 1)).toBe(18.75);
      expect(calculateFinalPayment(100, 0.25, 5, 1.25)).toBe(16);
    });
  });

  describe('isSampleDataEnabled', () => {
    it.each(['true', 'TRUE', ' true '])('is enabled for %p', (value) => {
      expect(isSampleDataEnabled(value)).toBe(true);
    });

    it.each([undefined, '', 'false', '1', 'yes'])('is disabled for %p', (value) => {
      expect(isSampleDataEnabled(value)).toBe(false);
    });
  });

  describe('data consistency', () => {
    const symbols = new Set(SAMPLE_SECURITIES.map((s) => s.symbol));
    const transactions = buildSampleTransactions();
    const dividends = buildSampleDividends();

    it('has unique symbols and ISINs', () => {
      expect(symbols.size).toBe(SAMPLE_SECURITIES.length);
      expect(new Set(SAMPLE_SECURITIES.map((s) => s.isin)).size).toBe(SAMPLE_SECURITIES.length);
    });

    it('references only sample securities', () => {
      for (const item of [...transactions, ...dividends]) {
        expect(symbols).toContain(item.symbol);
      }
    });

    it('uses the trading currency of the security for transactions', () => {
      for (const transaction of transactions) {
        const security = SAMPLE_SECURITIES.find((s) => s.symbol === transaction.symbol);
        expect(transaction.currency).toBe(security?.currency);
      }
    });

    it('has a display name for every referenced currency', () => {
      for (const code of getSampleCurrencyCodes()) {
        expect(SAMPLE_CURRENCY_NAMES[code]).toBeDefined();
      }
    });

    it('pays dividends into the base currency', () => {
      for (const dividend of dividends) {
        expect(dividend.destCurrency).toBe(SAMPLE_DATA_BASE_CURRENCY);
        expect(dividend.payoutDate.getTime()).toBeGreaterThanOrEqual(dividend.exDate.getTime());
      }
    });

    it('uses a rate of 1 for amounts already in the base currency', () => {
      for (const transaction of transactions.filter((t) => t.currency === SAMPLE_DATA_BASE_CURRENCY)) {
        expect(transaction.exchangeRate).toBe(1);
      }
    });

    it('holds at least the dividend shares on each ex-date', () => {
      for (const dividend of dividends) {
        const holding = transactions
          .filter((t) => t.symbol === dividend.symbol && t.date < dividend.exDate)
          .reduce((sum, t) => sum + (t.type === 'BUY' ? t.quantity : -t.quantity), 0);
        expect(holding).toBeGreaterThanOrEqual(dividend.shares);
      }
    });

    it('never sells more than is held', () => {
      const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
      const holdings = new Map<string, number>();
      for (const t of sorted) {
        const next = (holdings.get(t.symbol) ?? 0) + (t.type === 'BUY' ? t.quantity : -t.quantity);
        expect(next).toBeGreaterThanOrEqual(0);
        holdings.set(t.symbol, next);
      }
    });

    it('calculates totals with the application formulas', () => {
      for (const t of transactions) {
        expect(t.totalValue).toBe(calculateTransactionTotal(t.quantity, t.pricePerShare, t.fees, t.exchangeRate));
      }
      for (const d of dividends) {
        expect(d.finalPayment).toBe(calculateFinalPayment(d.shares, d.dividendYield, d.taxAmount, d.conversionRate));
        expect(d.finalPayment).toBeGreaterThan(0);
      }
    });
  });
});
