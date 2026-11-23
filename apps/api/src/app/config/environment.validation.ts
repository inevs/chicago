import { plainToInstance, Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsISO8601, IsOptional, IsString, Matches, Max, Min, validateSync } from 'class-validator';

export const NODE_ENVIRONMENTS = ['development', 'production', 'test'] as const;
export type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number];

const toNumber = ({ value }: { value: unknown }) => (typeof value === 'string' ? Number(value) : value);

const toBoolean = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') {
    return value;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  return value;
};

/**
 * Environment variables of the API, validated at startup.
 * Optional variables have defaults; empty values count as not set.
 */
export class EnvironmentVariables {
  // Decorators are checked bottom-up; only the first failing one is reported
  @Matches(/^postgres(ql)?:\/\/\S+$/, {
    message: 'DATABASE_URL must be a PostgreSQL connection URL (postgresql://...)',
  })
  @IsString({ message: 'DATABASE_URL is required' })
  DATABASE_URL!: string;

  @Matches(/\S/, { message: 'JWT_SECRET must not be empty' })
  @IsString({ message: 'JWT_SECRET is required' })
  JWT_SECRET!: string;

  @Transform(toNumber)
  @Max(65535, { message: 'PORT must be between 1 and 65535' })
  @Min(1, { message: 'PORT must be between 1 and 65535' })
  @IsInt({ message: 'PORT must be an integer' })
  PORT = 3000;

  @Matches(/^[A-Z]{3}$/, { message: 'DEFAULT_CURRENCY must be an ISO 4217 code with three uppercase letters, e.g. EUR' })
  DEFAULT_CURRENCY = 'EUR';

  @IsISO8601({ strict: true }, { message: 'SECURITY_PRICE_HISTORY_START must be a valid calendar date' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'SECURITY_PRICE_HISTORY_START must be a date in the format YYYY-MM-DD' })
  SECURITY_PRICE_HISTORY_START = '2017-01-01';

  @Transform(toBoolean)
  @IsBoolean({ message: 'ALLOW_REGISTRATION must be "true" or "false"' })
  ALLOW_REGISTRATION = false;

  @IsOptional()
  @IsIn(NODE_ENVIRONMENTS, { message: `NODE_ENV must be one of: ${NODE_ENVIRONMENTS.join(', ')}` })
  NODE_ENV?: NodeEnvironment;
}

const ENVIRONMENT_KEYS: (keyof EnvironmentVariables)[] = [
  'DATABASE_URL',
  'JWT_SECRET',
  'PORT',
  'DEFAULT_CURRENCY',
  'SECURITY_PRICE_HISTORY_START',
  'ALLOW_REGISTRATION',
  'NODE_ENV',
];

/**
 * Validates the environment variables of the API and applies the defaults.
 * Throws an error listing every invalid variable; the error never contains
 * the values themselves, because they may hold credentials.
 */
export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const relevant: Record<string, unknown> = {};
  for (const key of ENVIRONMENT_KEYS) {
    const value = config[key];
    if (value !== undefined && value !== '') {
      relevant[key] = value;
    }
  }

  const environment = plainToInstance(EnvironmentVariables, relevant, { exposeDefaultValues: true });
  const errors = validateSync(environment, { skipMissingProperties: false, stopAtFirstError: true });

  if (errors.length > 0) {
    const messages = errors.flatMap((error) => Object.values(error.constraints ?? {}));
    throw new Error(`Invalid environment configuration:\n- ${messages.join('\n- ')}`);
  }

  if (environment.NODE_ENV === undefined) {
    // Keep the key absent: ConfigModule copies validated keys into process.env
    delete environment.NODE_ENV;
  }

  return environment;
}
