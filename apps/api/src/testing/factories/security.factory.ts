import { faker } from '@faker-js/faker';
import { SecurityType } from '@dividends/shared';
import type { Security } from '@dividends/shared';

export class SecurityFactory {
  static create(overrides?: Partial<Security>): Security {
    return {
      id: faker.string.uuid(),
      name: faker.company.name(),
      symbol: faker.string.alpha({ length: 4, casing: 'upper' }),
      isin: this.generateISIN(),
      wkn: faker.string.alphanumeric(6).toUpperCase(),
      type: faker.helpers.arrayElement(Object.values(SecurityType)),
      exchange: faker.helpers.arrayElement(['NASDAQ', 'NYSE', 'XETRA', 'LSE']),
      currency: faker.helpers.arrayElement(['USD', 'EUR', 'GBP']),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides?: Partial<Security>): Security[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createStock(overrides?: Partial<Security>): Security {
    return this.create({
      type: SecurityType.STOCK,
      ...overrides,
    });
  }

  static createETF(overrides?: Partial<Security>): Security {
    return this.create({
      type: SecurityType.ETF,
      ...overrides,
    });
  }

  private static generateISIN(): string {
    // Simple ISIN generator (2-letter country code + 9 alphanumeric + check digit)
    const countryCode = faker.location.countryCode('alpha-2');
    const nsin = faker.string.alphanumeric(9).toUpperCase();
    const checkDigit = faker.number.int({ min: 0, max: 9 });
    return `${countryCode}${nsin}${checkDigit}`;
  }
}
