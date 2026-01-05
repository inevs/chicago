import { faker } from '@faker-js/faker';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CurrencyFactory {
  static create(overrides?: Partial<Currency>): Currency {
    const code = faker.finance.currencyCode();
    return {
      code,
      name: faker.finance.currencyName(),
      symbol: faker.finance.currencySymbol(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides?: Partial<Currency>): Currency[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createUSD(): Currency {
    return this.create({
      code: 'USD',
      name: 'United States Dollar',
      symbol: '$',
    });
  }

  static createEUR(): Currency {
    return this.create({
      code: 'EUR',
      name: 'Euro',
      symbol: '€',
    });
  }

  static createGBP(): Currency {
    return this.create({
      code: 'GBP',
      name: 'British Pound',
      symbol: '£',
    });
  }
}
