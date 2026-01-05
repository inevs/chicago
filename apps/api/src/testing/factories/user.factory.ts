import { faker } from '@faker-js/faker';

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserFactory {
  static create(overrides?: Partial<User>): User {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      password: faker.internet.password({ length: 12 }),
      name: faker.person.fullName(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides?: Partial<User>): User[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createWithEmail(email: string, overrides?: Partial<User>): User {
    return this.create({
      email,
      ...overrides,
    });
  }
}
