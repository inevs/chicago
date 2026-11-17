import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';

/** Absolute path of the workspace root (apps/api-e2e/src/support -> root). */
export const workspaceRoot = resolve(__dirname, '../../../..');

/** Suffix that every e2e database name must carry. */
const E2E_SUFFIX = '_e2e';

/**
 * Returns the connection string of the dedicated e2e database.
 *
 * - `E2E_DATABASE_URL` is used as-is when set.
 * - Otherwise it is derived from `DATABASE_URL` (from the environment or the
 *   root `.env`) by appending `_e2e` to the database name, e.g.
 *   `.../dividends` -> `.../dividends_e2e`.
 *
 * The tests delete all data in this database, so the name must end with
 * `_e2e` to make sure the development database is never touched.
 */
export function getE2eDatabaseUrl(): string {
  loadEnv({ path: resolve(workspaceRoot, '.env'), quiet: true });

  const explicitUrl = process.env.E2E_DATABASE_URL;
  const baseUrl = explicitUrl ?? process.env.DATABASE_URL;

  if (!baseUrl) {
    throw new Error(
      'Neither E2E_DATABASE_URL nor DATABASE_URL is set. Configure .env (see .env.example).'
    );
  }

  const url = new URL(baseUrl);
  const databaseName = url.pathname.replace(/^\//, '');

  if (!explicitUrl) {
    url.pathname = `/${databaseName}${E2E_SUFFIX}`;
  }

  assertE2eDatabaseName(url);
  return url.toString();
}

/** Returns the database name of a connection string. */
export function getDatabaseName(connectionString: string): string {
  return new URL(connectionString).pathname.replace(/^\//, '');
}

function assertE2eDatabaseName(url: URL): void {
  const name = url.pathname.replace(/^\//, '');
  if (!name.endsWith(E2E_SUFFIX)) {
    throw new Error(
      `Refusing to run e2e tests against database "${name}": the name must end with "${E2E_SUFFIX}".`
    );
  }
}
