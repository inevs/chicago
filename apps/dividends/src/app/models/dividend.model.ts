export interface DividendTransaction {
  id: string | number;
  date: string;
  name: string;
  amount: number;
  dividend: number;
  taxes: number;
  currency: 'EUR' | 'USD' | 'NOK' | 'GBP';
  rate: number;
  finalPayment: number;
  buyPrice?: number;
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
