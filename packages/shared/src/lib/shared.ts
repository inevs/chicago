// Currency DTO (API response - only exposes public fields)
export interface Currency {
  code: string; // ISO 4217 code (EUR, USD, etc.)
  name: string; // Display name (Euro, US Dollar, etc.)
}

// DTO for creating a new currency
export interface CreateCurrencyDto {
  code: string; // 3-letter ISO 4217 code
  name: string; // Display name
}

// Error message constants
export const CURRENCY_ERRORS = {
  ALREADY_EXISTS: (code: string) => `Currency with code ${code} already exists`,
} as const;

// Enum for security types (matches Prisma schema)
export enum SecurityType {
  STOCK = 'STOCK',
  ETF = 'ETF',
  BOND = 'BOND',
}

// Security interface (matches Prisma model)
export interface Security {
  id: string;
  name: string;
  symbol: string;
  isin: string | null;
  wkn: string | null;
  type: SecurityType;
  exchange: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

// DividendPayment interface (matches Prisma model)
export interface DividendPayment {
  id: string;
  exDate: Date;
  payoutDate: Date;
  securityId: string;
  shares: number; // Number of shares held at ex-date
  dividendYield: number; // Dividend per share
  taxAmount: number; // Tax withheld
  originCurrency: string;
  destCurrency: string;
  conversionRate: number;
  finalPayment: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// DividendPayment with Security details (for API responses with includes)
export interface DividendPaymentWithSecurity extends DividendPayment {
  security: Security;
}

// DTO for creating a new dividend payment
export interface CreateDividendPaymentDto {
  exDate: string;
  payoutDate: string;
  securityId: string;
  shares: number;
  dividendYield: number;
  taxAmount: number;
  originCurrency: string;
  destCurrency: string;
  conversionRate: number;
  finalPayment: number;
  note?: string;
}

// DTO for updating an existing dividend payment
export interface UpdateDividendPaymentDto {
  exDate?: string;
  payoutDate?: string;
  securityId?: string;
  shares?: number;
  dividendYield?: number;
  taxAmount?: number;
  originCurrency?: string;
  destCurrency?: string;
  conversionRate?: number;
  finalPayment?: number;
  note?: string;
}

// Enum for transaction types (matches Prisma schema)
export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
}

// SecurityTransaction interface (matches Prisma model)
export interface SecurityTransaction {
  id: string;
  date: Date;
  type: TransactionType;
  securityId: string;
  quantity: number;
  pricePerShare: number;
  fees: number;
  currency: string;
  exchangeRate: number;
  totalValue: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// SecurityPrice interface (matches Prisma model)
export interface SecurityPrice {
  id: string;
  securityId: string;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  currency: string;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
}

// SecurityTransaction with Security details (for API responses with includes)
export interface SecurityTransactionWithSecurity extends SecurityTransaction {
  security: Security;
}

// DTO for creating a new security transaction
export interface CreateSecurityTransactionDto {
  date: string;
  type: TransactionType;
  securityId: string;
  quantity: number;
  pricePerShare: number;
  fees: number;
  currency: string;
  exchangeRate: number;
  totalValue: number;
  note?: string;
}

// DTO for updating an existing security transaction
export interface UpdateSecurityTransactionDto {
  date?: string;
  type?: TransactionType;
  securityId?: string;
  quantity?: number;
  pricePerShare?: number;
  fees?: number;
  currency?: string;
  exchangeRate?: number;
  totalValue?: number;
  note?: string;
}

// ExchangeRate interface (matches Prisma model)
export interface ExchangeRate {
  id: string;
  baseCurrency: string;
  targetCurrency: string;
  date: Date;
  rate: number;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
}

// CSV Import result for individual securities
export interface ImportSecurityResult {
  row: number;
  symbol: string;
  status: 'created' | 'skipped' | 'error';
  reason?: string;
  securityId?: string;
}

// CSV Import response
export interface ImportCsvResponse {
  total: number;
  created: number;
  skipped: number;
  errors: number;
  results: ImportSecurityResult[];
  pricesSyncTriggered: boolean;
}

// CSV Import result for individual security transactions
export interface ImportTransactionResult {
  row: number;
  isin: string;
  status: 'created' | 'skipped' | 'error';
  reason?: string;
  transactionId?: string;
}

// CSV Import response for transactions
export interface ImportTransactionsCsvResponse {
  total: number;
  created: number;
  skipped: number;
  errors: number;
  results: ImportTransactionResult[];
}

// CSV Import result for individual dividend payments
export interface ImportDividendResult {
  row: number;
  isin: string;
  status: 'created' | 'skipped' | 'error';
  reason?: string;
  dividendPaymentId?: string;
}

// CSV Import response for dividend payments
export interface ImportDividendsCsvResponse {
  total: number;
  created: number;
  skipped: number;
  errors: number;
  results: ImportDividendResult[];
}

// Currency conversion utilities
export class CurrencyConverter {
  /**
   * Convert an amount from one currency to another using a specific rate
   * @param amount The amount to convert
   * @param rate The exchange rate (1 baseCurrency = rate targetCurrency)
   * @returns The converted amount
   */
  static convertAmount(amount: number, rate: number): number {
    return amount * rate;
  }

  /**
   * Convert an amount using an exchange rate object
   * @param amount The amount in base currency
   * @param exchangeRate The exchange rate object
   * @returns The converted amount in target currency
   */
  static convertWithRate(amount: number, exchangeRate: ExchangeRate): number {
    return this.convertAmount(amount, exchangeRate.rate);
  }

  /**
   * Calculate the inverse rate (for converting in the opposite direction)
   * @param rate The exchange rate
   * @returns The inverse rate
   */
  static inverseRate(rate: number): number {
    if (rate === 0) {
      throw new Error('Cannot calculate inverse of zero rate');
    }
    return 1 / rate;
  }

  /**
   * Convert amount from target currency back to base currency
   * @param amount The amount in target currency
   * @param rate The exchange rate (1 baseCurrency = rate targetCurrency)
   * @returns The amount in base currency
   */
  static convertBack(amount: number, rate: number): number {
    return amount * this.inverseRate(rate);
  }
}
