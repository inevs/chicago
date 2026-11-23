import { validateEnvironment } from './environment.validation';

/**
 * The validated environment variables of the API.
 *
 * Validated synchronously when this file is loaded, so that the API aborts with
 * a clear error before Nest starts. Import it before any module that reads
 * environment variables at import time (e.g. AuthModule reading JWT_SECRET).
 */
export const environment = validateEnvironment(process.env);
