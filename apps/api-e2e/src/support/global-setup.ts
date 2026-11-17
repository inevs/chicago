import { execSync } from 'child_process';
import { Client } from 'pg';
import { getDatabaseName, getE2eDatabaseUrl, workspaceRoot } from './e2e-database';

/**
 * Prepares the dedicated e2e database:
 * 1. creates it if it does not exist yet,
 * 2. applies all Prisma migrations.
 *
 * Requires a running PostgreSQL server (e.g. `docker compose up -d postgres`).
 */
module.exports = async function () {
  const e2eUrl = getE2eDatabaseUrl();
  const databaseName = getDatabaseName(e2eUrl);

  // Connect to the server's maintenance database to create the e2e database
  const adminUrl = new URL(e2eUrl);
  adminUrl.pathname = '/postgres';
  adminUrl.search = '';

  const client = new Client({ connectionString: adminUrl.toString() });
  try {
    await client.connect();
  } catch (error) {
    throw new Error(
      `Cannot connect to PostgreSQL for e2e tests (${adminUrl.host}). ` +
        `Start it with "docker compose up -d postgres".`,
      { cause: error }
    );
  }

  try {
    const { rowCount } = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName]
    );
    if (rowCount === 0) {
      // Identifiers cannot be parameterized; the name is validated in getE2eDatabaseUrl()
      await client.query(`CREATE DATABASE "${databaseName.replace(/"/g, '""')}"`);
      console.log(`\nCreated e2e database "${databaseName}"`);
    }
  } finally {
    await client.end();
  }

  execSync('npx prisma migrate deploy --config=apps/api/prisma.config.ts', {
    cwd: workspaceRoot,
    env: { ...process.env, DATABASE_URL: e2eUrl },
    stdio: 'inherit',
  });
};
