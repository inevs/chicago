import { validateEnvironment } from './environment.validation';

describe('validateEnvironment', () => {
  const validEnv = {
    DATABASE_URL: 'postgresql://dividends:dividends@localhost:5432/dividends?schema=public',
    JWT_SECRET: 'a-secret',
  };

  describe('valid configuration', () => {
    it('accepts the required variables and applies the defaults of the optional ones', () => {
      const result = validateEnvironment({ ...validEnv });

      expect(result.DATABASE_URL).toBe(validEnv.DATABASE_URL);
      expect(result.JWT_SECRET).toBe('a-secret');
      expect(result.PORT).toBe(3000);
      expect(result.DEFAULT_CURRENCY).toBe('EUR');
      expect(result.SECURITY_PRICE_HISTORY_START).toBe('2017-01-01');
      expect(result.ALLOW_REGISTRATION).toBe(false);
      expect(result.NODE_ENV).toBeUndefined();
    });

    it('converts and returns explicitly set optional variables', () => {
      const result = validateEnvironment({
        ...validEnv,
        DATABASE_URL: 'postgres://user:pw@postgres:5432/dividends',
        PORT: '8080',
        DEFAULT_CURRENCY: 'USD',
        SECURITY_PRICE_HISTORY_START: '2020-05-01',
        ALLOW_REGISTRATION: 'true',
        NODE_ENV: 'production',
      });

      expect(result.DATABASE_URL).toBe('postgres://user:pw@postgres:5432/dividends');
      expect(result.PORT).toBe(8080);
      expect(result.DEFAULT_CURRENCY).toBe('USD');
      expect(result.SECURITY_PRICE_HISTORY_START).toBe('2020-05-01');
      expect(result.ALLOW_REGISTRATION).toBe(true);
      expect(result.NODE_ENV).toBe('production');
    });

    it.each(['development', 'production', 'test'])('accepts NODE_ENV=%s', (nodeEnv) => {
      expect(validateEnvironment({ ...validEnv, NODE_ENV: nodeEnv }).NODE_ENV).toBe(nodeEnv);
    });

    it.each([
      [' TRUE ', true],
      ['True', true],
      ['false', false],
      ['FALSE', false],
    ])('parses ALLOW_REGISTRATION=%p case-insensitively as %p', (value, expected) => {
      expect(validateEnvironment({ ...validEnv, ALLOW_REGISTRATION: value }).ALLOW_REGISTRATION).toBe(expected);
    });

    it('treats empty optional variables as not set and applies their defaults', () => {
      const result = validateEnvironment({
        ...validEnv,
        PORT: '',
        DEFAULT_CURRENCY: '',
        SECURITY_PRICE_HISTORY_START: '',
        ALLOW_REGISTRATION: '',
        NODE_ENV: '',
      });

      expect(result.PORT).toBe(3000);
      expect(result.DEFAULT_CURRENCY).toBe('EUR');
      expect(result.SECURITY_PRICE_HISTORY_START).toBe('2017-01-01');
      expect(result.ALLOW_REGISTRATION).toBe(false);
      expect(result.NODE_ENV).toBeUndefined();
    });

    it('ignores unrelated environment variables', () => {
      expect(() =>
        validateEnvironment({ ...validEnv, PATH: '/usr/bin', HOME: '/home/user', ADMIN_PASSWORD: 'x' })
      ).not.toThrow();
    });
  });

  describe('invalid configuration', () => {
    it('rejects a missing DATABASE_URL', () => {
      expect(() => validateEnvironment({ JWT_SECRET: 'a-secret' })).toThrow(/DATABASE_URL/);
    });

    it.each(['', 'not-a-url', 'file:./test.db', 'mysql://user:pw@localhost:3306/db'])(
      'rejects DATABASE_URL=%p that is not a PostgreSQL connection URL',
      (url) => {
        expect(() => validateEnvironment({ ...validEnv, DATABASE_URL: url })).toThrow(/DATABASE_URL/);
      }
    );

    it('does not include the value of DATABASE_URL in the error message', () => {
      const env = { ...validEnv, DATABASE_URL: 'mysql://user:topsecret@localhost:3306/db' };

      expect(() => validateEnvironment(env)).toThrow(/DATABASE_URL/);
      expect(() => validateEnvironment(env)).not.toThrow(/topsecret/);
    });

    it('rejects a missing JWT_SECRET', () => {
      expect(() => validateEnvironment({ DATABASE_URL: validEnv.DATABASE_URL })).toThrow(/JWT_SECRET/);
    });

    it.each(['', '   '])('rejects an empty JWT_SECRET (%p)', (secret) => {
      expect(() => validateEnvironment({ ...validEnv, JWT_SECRET: secret })).toThrow(/JWT_SECRET/);
    });

    it.each(['abc', '0', '-1', '65536', '80.5'])('rejects PORT=%p', (port) => {
      expect(() => validateEnvironment({ ...validEnv, PORT: port })).toThrow(/PORT/);
    });

    it.each(['usd', 'EURO', 'E1R', 'EU'])('rejects DEFAULT_CURRENCY=%p', (currency) => {
      expect(() => validateEnvironment({ ...validEnv, DEFAULT_CURRENCY: currency })).toThrow(/DEFAULT_CURRENCY/);
    });

    it.each(['yesterday', '01.05.2020', '2020-13-01', '2020-02-30', '2020-5-1'])(
      'rejects SECURITY_PRICE_HISTORY_START=%p',
      (date) => {
        expect(() => validateEnvironment({ ...validEnv, SECURITY_PRICE_HISTORY_START: date })).toThrow(
          /SECURITY_PRICE_HISTORY_START/
        );
      }
    );

    it.each(['yes', '1', 'on'])('rejects ALLOW_REGISTRATION=%p', (value) => {
      expect(() => validateEnvironment({ ...validEnv, ALLOW_REGISTRATION: value })).toThrow(/ALLOW_REGISTRATION/);
    });

    it('rejects an unknown NODE_ENV', () => {
      expect(() => validateEnvironment({ ...validEnv, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
    });

    it('reports all invalid variables at once', () => {
      expect(() => validateEnvironment({ PORT: 'abc', DEFAULT_CURRENCY: 'euro' })).toThrow(
        /(?=[\s\S]*DATABASE_URL)(?=[\s\S]*JWT_SECRET)(?=[\s\S]*PORT)(?=[\s\S]*DEFAULT_CURRENCY)/
      );
    });
  });
});
