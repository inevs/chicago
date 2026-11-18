import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import * as bcrypt from 'bcryptjs';
import {
  SAMPLE_CURRENCY_NAMES,
  SAMPLE_DATA_BASE_CURRENCY,
  SAMPLE_SECURITIES,
  buildSampleDividends,
  buildSampleTransactions,
  getSampleCurrencyCodes,
  isSampleDataEnabled,
} from './sample-data';

// Load .env from current working directory (workspace root)
config();

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Seed admin user
  console.log('👤 Seeding admin user...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Admin User';

  if (!adminPassword) {
    throw new Error(
      '❌ ADMIN_PASSWORD environment variable is required for seeding. ' +
      'Please set it to a strong password in your .env file.'
    );
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: adminName,
    },
  });

  console.log(`  ✓ Admin user created: ${admin.email}`);

  // Seed currencies
  console.log('📊 Seeding currencies...');
  const defaultCurrency = process.env.DEFAULT_CURRENCY;
  const defaultCurrencyName = process.env.DEFAULT_CURRENCY_NAME;
 
  if (!(defaultCurrency && defaultCurrencyName)) {
    throw new Error(
      '❌ DEFAULT_CURRENCY / DEFAULT_CURRENCY_NAME environment variable is required for seeding. ' +
      'Please set it in your .env file.'
    );
  }

  // A migration already inserts EUR, USD, GBP and NOK without a default flag, so
  // the default currency must also be marked when it exists. Exactly one currency
  // is flagged as default.
  const currency = await prisma.$transaction(async (tx) => {
    await tx.currency.updateMany({
      where: { code: { not: defaultCurrency }, isDefault: true },
      data: { isDefault: false },
    });
    return tx.currency.upsert({
      where: { code: defaultCurrency },
      update: { isDefault: true },
      create: { code: defaultCurrency, name: defaultCurrencyName, isDefault: true },
    });
  });
  console.log(`  ✓ ${currency.code} - ${currency.name} (default)`);

  if (isSampleDataEnabled(process.env.SEED_SAMPLE_DATA)) {
    await seedSampleData(defaultCurrency);
  }

  console.log('✅ Seeding complete!');
}

/**
 * Creates sample securities, transactions and dividends (see sample-data.ts).
 * Runs only on a database without securities, so repeated seeds (e.g. on every
 * container start) neither duplicate the data nor mix it with real data.
 */
async function seedSampleData(defaultCurrency: string) {
  console.log('🧪 Seeding sample data...');

  if (defaultCurrency !== SAMPLE_DATA_BASE_CURRENCY) {
    console.warn(
      `  ⚠ Skipped: the sample data is calculated in ${SAMPLE_DATA_BASE_CURRENCY}, ` +
        `but DEFAULT_CURRENCY is ${defaultCurrency}.`
    );
    return;
  }

  const existingSecurities = await prisma.security.count();
  if (existingSecurities > 0) {
    console.log(`  ↷ Skipped: the database already contains ${existingSecurities} securities.`);
    return;
  }

  const transactions = buildSampleTransactions();
  const dividends = buildSampleDividends();

  await prisma.$transaction(async (tx) => {
    for (const code of getSampleCurrencyCodes()) {
      await tx.currency.upsert({
        where: { code },
        update: {},
        create: { code, name: SAMPLE_CURRENCY_NAMES[code] ?? code, isDefault: false },
      });
    }

    const securityIds = new Map<string, string>();
    for (const security of SAMPLE_SECURITIES) {
      const created = await tx.security.create({ data: security });
      securityIds.set(security.symbol, created.id);
    }

    const securityId = (symbol: string): string => {
      const id = securityIds.get(symbol);
      if (!id) {
        throw new Error(`Sample data references unknown security: ${symbol}`);
      }
      return id;
    };

    await tx.securityTransaction.createMany({
      data: transactions.map(({ symbol, ...transaction }) => ({
        ...transaction,
        securityId: securityId(symbol),
      })),
    });

    await tx.dividendPayment.createMany({
      data: dividends.map(({ symbol, ...dividend }) => ({
        ...dividend,
        securityId: securityId(symbol),
      })),
    });
  });

  console.log(
    `  ✓ ${SAMPLE_SECURITIES.length} securities, ${transactions.length} transactions, ` +
      `${dividends.length} dividend payments`
  );
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
