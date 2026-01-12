import { PrismaClient } from '../apps/api/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
      console.error('DATABASE_URL is not set');
      process.exit(1);
  }
  
  // NOTE: The project's PrismaService uses `new PrismaPg({ connectionString })` but standard docs say pass a pool.
  // I will try to follow the project's code. If that fails, I'll try the pool method.
  // Actually, looking at standard docs, it's `new PrismaPg(pool)`. 
  // Maybe the project uses a custom type or I misread the file content? 
  // Let's look at the file content again in my thought process... 
  // The file content I read was: `const adapter = new PrismaPg({ connectionString });`
  // That seems weird. 
  // Let's try the Pool approach which is standard, unless it fails. 
  // Wait, if I use the Pool approach and the generated client expects something else?
  // Let's stick to what I saw in PrismaService for now.
  
  // Correction: I might have hallucinated the `{ connectionString }` part being passed to PrismaPg if I'm used to other things. 
  // But I read the file. 
  // Let's assume the read file was correct. 
  // But wait, `PrismaPg` taking an object with connection string? 
  // Maybe `PrismaPg` is actually a local class? No, it's imported from `@prisma/adapter-pg`.
  
  // Let's try to use pg.Pool because that is the documented way for @prisma/adapter-pg.
  // `const pool = new Pool({ connectionString })`
  // `const adapter = new PrismaPg(pool)`
  
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  
  const prisma = new PrismaClient({ adapter });

  try {
    const security = await prisma.security.findFirst({
      where: {
        OR: [
            { name: { contains: 'ASML', mode: 'insensitive' } },
            { symbol: { contains: 'ASML', mode: 'insensitive' } }
        ]
      }
    });

    if (!security) {
      console.log('ASML security not found.');
      return;
    }

    console.log(`Found Security: ${security.name} (${security.symbol})`);

    const transactions = await prisma.securityTransaction.findMany({
      where: {
        securityId: security.id
      },
      orderBy: {
        date: 'asc'
      }
    });

    console.log('\nTransactions:');
    let totalShares = 0;
    for (const tx of transactions) {
        const qty = Number(tx.quantity);
        const dateStr = tx.date.toISOString().split('T')[0];
        
        if (tx.type === 'BUY') {
            totalShares += qty;
            console.log(`- ${dateStr}: BUY  ${qty.toFixed(4).padStart(10)} shares @ ${Number(tx.pricePerShare).toFixed(2).padStart(8)} ${tx.currency}`);
        } else if (tx.type === 'SELL') {
            totalShares -= qty;
            console.log(`- ${dateStr}: SELL ${qty.toFixed(4).padStart(10)} shares @ ${Number(tx.pricePerShare).toFixed(2).padStart(8)} ${tx.currency}`);
        }
    }

    console.log(`\nTotal shares for ASML: ${totalShares.toFixed(4)}`);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
