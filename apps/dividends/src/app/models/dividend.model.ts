export interface DividendTransaction {
  id: string | number;
  date: string; // payoutDate - keeping for backward compatibility
  exDate?: string; // Ex-dividend date
  name: string;
  securityId?: string;
  amount: number;
  dividend: number;
  taxes: number;
  currency: 'EUR' | 'USD' | 'NOK' | 'GBP';
  rate: number;
  finalPayment: number;
  buyPrice?: number;
  note?: string | null;
}

export type TimeRange = 'M' | 'Y' | '5Y' | 'ALL';

export interface DashboardKPIs {
  totalNet: number;
  totalTaxes: number;
  avgYield: number;
  count: number;
  personalReturn: number;
  totalInvestment: number;
}

export interface SecuritySummary {
  name: string;           // Security name (unique identifier)
  totalDividends: number; // Sum of all finalPayment values in EUR
}
