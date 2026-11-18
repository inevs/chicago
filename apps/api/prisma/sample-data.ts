/**
 * Sample data for the database seed (enabled with SEED_SAMPLE_DATA=true).
 *
 * Derived from the import samples in docs/samples:
 * - Securities are taken unchanged from sample-securities-import.csv.
 * - Transactions and dividends are taken from sample-transactions-import.csv and
 *   sample-dividends.csv, but exchange rates and totals are recalculated to match
 *   the application's conventions (see toAppRate, calculateTransactionTotal,
 *   calculateFinalPayment). Rows whose ISIN has no matching security are left out.
 * - Additional buy transactions before each ex-date make the holdings match the
 *   share counts of the dividends. Their prices are illustrative, not historical.
 *
 * Totals are expressed in EUR, so the sample data requires EUR as default currency.
 *
 * This file must not import the Prisma client, so that it can be unit tested.
 */

export const SAMPLE_DATA_BASE_CURRENCY = 'EUR';

/** Display names for the currencies used by the sample securities. */
export const SAMPLE_CURRENCY_NAMES: Record<string, string> = {
  EUR: 'Euro',
  USD: 'US Dollar',
};

export interface SampleSecurity {
  name: string;
  symbol: string;
  type: 'STOCK' | 'ETF' | 'BOND';
  exchange: string;
  currency: string;
  isin: string;
  wkn: string | null;
}

/**
 * Exchange rates are given as in docs/samples (amount of base currency per unit of
 * the foreign currency, e.g. 0.92 EUR per USD) and converted with toAppRate.
 */
export interface SampleTransactionInput {
  symbol: string;
  date: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  pricePerShare: number;
  fees: number;
  currency: string;
  csvExchangeRate: number;
  note: string;
}

export interface SampleDividendInput {
  symbol: string;
  exDate: string;
  payoutDate: string;
  shares: number;
  dividendYield: number;
  taxAmount: number;
  originCurrency: string;
  csvConversionRate: number;
  note: string;
}

export interface SampleTransaction {
  symbol: string;
  date: Date;
  type: 'BUY' | 'SELL';
  quantity: number;
  pricePerShare: number;
  fees: number;
  currency: string;
  exchangeRate: number;
  totalValue: number;
  note: string;
}

export interface SampleDividend {
  symbol: string;
  exDate: Date;
  payoutDate: Date;
  shares: number;
  dividendYield: number;
  taxAmount: number;
  originCurrency: string;
  destCurrency: string;
  conversionRate: number;
  finalPayment: number;
  note: string;
}

/** Source: docs/samples/sample-securities-import.csv */
export const SAMPLE_SECURITIES: SampleSecurity[] = [
  { name: 'Apple Inc.', symbol: 'AAPL', type: 'STOCK', exchange: 'NASDAQ', currency: 'USD', isin: 'US0378331005', wkn: '865985' },
  { name: 'Microsoft Corporation', symbol: 'MSFT', type: 'STOCK', exchange: 'NASDAQ', currency: 'USD', isin: 'US5949181045', wkn: '870747' },
  { name: 'Alphabet Inc. Class A', symbol: 'GOOGL', type: 'STOCK', exchange: 'NASDAQ', currency: 'USD', isin: 'US02079K3059', wkn: 'A14Y6F' },
  { name: 'Amazon.com Inc.', symbol: 'AMZN', type: 'STOCK', exchange: 'NASDAQ', currency: 'USD', isin: 'US0231351067', wkn: '906866' },
  { name: 'Tesla Inc.', symbol: 'TSLA', type: 'STOCK', exchange: 'NASDAQ', currency: 'USD', isin: 'US88160R1014', wkn: 'A1CX3T' },
  { name: 'NVIDIA Corporation', symbol: 'NVDA', type: 'STOCK', exchange: 'NASDAQ', currency: 'USD', isin: 'US67066G1040', wkn: '918422' },
  { name: 'Vanguard S&P 500 ETF', symbol: 'VOO', type: 'ETF', exchange: 'NYSE', currency: 'USD', isin: 'US9229083632', wkn: null },
  { name: 'iShares Core MSCI World UCITS ETF', symbol: 'EUNL', type: 'ETF', exchange: 'XETRA', currency: 'EUR', isin: 'IE00B4L5Y983', wkn: 'A0RPWH' },
  { name: 'BMW AG', symbol: 'BMW.DE', type: 'STOCK', exchange: 'XETRA', currency: 'EUR', isin: 'DE0005190003', wkn: '519000' },
  { name: 'Siemens AG', symbol: 'SIE.DE', type: 'STOCK', exchange: 'XETRA', currency: 'EUR', isin: 'DE0007236101', wkn: '723610' },
  { name: 'SAP SE', symbol: 'SAP.DE', type: 'STOCK', exchange: 'XETRA', currency: 'EUR', isin: 'DE0007164600', wkn: '716460' },
  { name: 'BASF SE', symbol: 'BAS.DE', type: 'STOCK', exchange: 'XETRA', currency: 'EUR', isin: 'DE000BASF111', wkn: 'BASF11' },
];

/**
 * Buy transactions that build up the holdings referenced by SAMPLE_DIVIDEND_INPUTS
 * (prices are illustrative), followed by the rows of
 * docs/samples/sample-transactions-import.csv (without GB00B10RZP78, which has no
 * matching sample security).
 */
export const SAMPLE_TRANSACTION_INPUTS: SampleTransactionInput[] = [
  { symbol: 'EUNL', date: '2024-08-01', type: 'BUY', quantity: 200, pricePerShare: 95.0, fees: 12.5, currency: 'EUR', csvExchangeRate: 1, note: 'Beispielkauf (Bestand für Dividende, Preis fiktiv)' },
  { symbol: 'AAPL', date: '2024-10-01', type: 'BUY', quantity: 100, pricePerShare: 225.0, fees: 9.99, currency: 'USD', csvExchangeRate: 0.92, note: 'Beispielkauf (Bestand für Dividende, Preis fiktiv)' },
  { symbol: 'MSFT', date: '2024-10-01', type: 'BUY', quantity: 50, pricePerShare: 415.0, fees: 9.99, currency: 'USD', csvExchangeRate: 0.92, note: 'Beispielkauf (Bestand für Dividende, Preis fiktiv)' },
  { symbol: 'AMZN', date: '2024-11-01', type: 'BUY', quantity: 75, pricePerShare: 185.0, fees: 9.99, currency: 'USD', csvExchangeRate: 0.92, note: 'Beispielkauf (Bestand für Dividende, Preis fiktiv)' },
  { symbol: 'AAPL', date: '2025-01-15', type: 'BUY', quantity: 10, pricePerShare: 150.5, fees: 9.99, currency: 'USD', csvExchangeRate: 0.92, note: 'Initial purchase' },
  { symbol: 'AAPL', date: '2025-02-20', type: 'SELL', quantity: 5, pricePerShare: 155.0, fees: 9.99, currency: 'USD', csvExchangeRate: 0.91, note: 'Partial sale' },
  { symbol: 'BMW.DE', date: '2025-01-10', type: 'BUY', quantity: 20, pricePerShare: 85.3, fees: 12.5, currency: 'EUR', csvExchangeRate: 1, note: 'BMW purchase' },
];

/**
 * Rows of docs/samples/sample-dividends.csv (without DE0005810055, which has no
 * matching sample security).
 */
export const SAMPLE_DIVIDEND_INPUTS: SampleDividendInput[] = [
  { symbol: 'AAPL', exDate: '2024-11-08', payoutDate: '2024-11-14', shares: 100, dividendYield: 0.25, taxAmount: 6.25, originCurrency: 'USD', csvConversionRate: 0.92, note: 'Apple Q4 2024 Dividende' },
  { symbol: 'MSFT', exDate: '2024-11-15', payoutDate: '2024-11-20', shares: 50, dividendYield: 1.5, taxAmount: 11.25, originCurrency: 'USD', csvConversionRate: 0.92, note: 'Microsoft Q4 2024 Dividende' },
  { symbol: 'EUNL', exDate: '2024-09-10', payoutDate: '2024-09-15', shares: 200, dividendYield: 0.35, taxAmount: 17.5, originCurrency: 'USD', csvConversionRate: 0.93, note: 'iShares Core S&P 500 ETF' },
  { symbol: 'AMZN', exDate: '2024-12-01', payoutDate: '2024-12-05', shares: 75, dividendYield: 1.0, taxAmount: 18.75, originCurrency: 'USD', csvConversionRate: 0.91, note: 'Amazon Q4 2024 Dividende' },
];

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Converts a rate given as base currency per foreign unit (docs/samples, e.g. 0.92 EUR
 * per USD) into the application's convention: foreign units per base currency unit
 * (e.g. 1.0869 USD per EUR). Amounts are converted by dividing by this rate.
 */
export function toAppRate(csvRate: number): number {
  if (!(csvRate > 0)) {
    throw new Error(`Invalid exchange rate: ${csvRate}`);
  }
  return csvRate === 1 ? 1 : round(1 / csvRate, 8);
}

/** Same formula as the security transaction modal: (quantity * price + fees) / rate. */
export function calculateTransactionTotal(quantity: number, pricePerShare: number, fees: number, exchangeRate: number): number {
  return round((quantity * pricePerShare + fees) / exchangeRate, 2);
}

/** Same formula as the dividend modal: (shares * dividend - tax) / rate. */
export function calculateFinalPayment(shares: number, dividendYield: number, taxAmount: number, conversionRate: number): number {
  return round((shares * dividendYield - taxAmount) / conversionRate, 2);
}

/** SEED_SAMPLE_DATA is enabled only by the value "true" (case-insensitive). */
export function isSampleDataEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

function toDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export function buildSampleTransactions(): SampleTransaction[] {
  return SAMPLE_TRANSACTION_INPUTS.map((input) => {
    const exchangeRate = toAppRate(input.csvExchangeRate);
    return {
      symbol: input.symbol,
      date: toDate(input.date),
      type: input.type,
      quantity: input.quantity,
      pricePerShare: input.pricePerShare,
      fees: input.fees,
      currency: input.currency,
      exchangeRate,
      totalValue: calculateTransactionTotal(input.quantity, input.pricePerShare, input.fees, exchangeRate),
      note: input.note,
    };
  });
}

export function buildSampleDividends(): SampleDividend[] {
  return SAMPLE_DIVIDEND_INPUTS.map((input) => {
    const conversionRate = toAppRate(input.csvConversionRate);
    return {
      symbol: input.symbol,
      exDate: toDate(input.exDate),
      payoutDate: toDate(input.payoutDate),
      shares: input.shares,
      dividendYield: input.dividendYield,
      taxAmount: input.taxAmount,
      originCurrency: input.originCurrency,
      destCurrency: SAMPLE_DATA_BASE_CURRENCY,
      conversionRate,
      finalPayment: calculateFinalPayment(input.shares, input.dividendYield, input.taxAmount, conversionRate),
      note: input.note,
    };
  });
}

/** Currency codes referenced by the sample data, sorted. */
export function getSampleCurrencyCodes(): string[] {
  const codes = new Set<string>([
    ...SAMPLE_SECURITIES.map((s) => s.currency),
    ...SAMPLE_TRANSACTION_INPUTS.map((t) => t.currency),
    ...SAMPLE_DIVIDEND_INPUTS.map((d) => d.originCurrency),
    SAMPLE_DATA_BASE_CURRENCY,
  ]);
  return [...codes].sort();
}
