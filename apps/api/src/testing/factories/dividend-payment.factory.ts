import { faker } from '@faker-js/faker';

export interface DividendPayment {
  id: string;
  exDate: Date;
  payoutDate: Date;
  securityId: string;
  shares: number;
  dividendYield: number;
  taxAmount: number;
  originCurrency: string;
  destCurrency: string;
  conversionRate: number;
  finalPayment: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class DividendPaymentFactory {
  static create(overrides?: Partial<DividendPayment>): DividendPayment {
    const shares = faker.number.int({ min: 1, max: 1000 });
    const dividendYield = faker.number.float({
      min: 0.5,
      max: 10,
      fractionDigits: 2,
    });
    const taxAmount = faker.number.float({
      min: 0,
      max: 0.3,
      fractionDigits: 2,
    });
    const conversionRate = faker.number.float({
      min: 0.5,
      max: 2,
      fractionDigits: 4,
    });

    return {
      id: faker.string.uuid(),
      exDate: faker.date.past(),
      payoutDate: faker.date.future(),
      securityId: faker.string.uuid(),
      shares,
      dividendYield,
      taxAmount,
      originCurrency: faker.helpers.arrayElement(['USD', 'EUR', 'GBP']),
      destCurrency: faker.helpers.arrayElement(['USD', 'EUR', 'GBP']),
      conversionRate,
      finalPayment: faker.number.float({
        min: 10,
        max: 10000,
        fractionDigits: 2,
      }),
      note: faker.helpers.maybe(() => faker.lorem.sentence(), {
        probability: 0.3,
      }),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides,
    };
  }

  static createMany(
    count: number,
    overrides?: Partial<DividendPayment>
  ): DividendPayment[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createForSecurity(
    securityId: string,
    overrides?: Partial<DividendPayment>
  ): DividendPayment {
    return this.create({
      securityId,
      ...overrides,
    });
  }
}
