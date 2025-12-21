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