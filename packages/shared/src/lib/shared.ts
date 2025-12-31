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