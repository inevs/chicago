import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCurrencyDto } from '../dto/create-currency.dto';

describe('IsISO4217Code Validator', () => {
  it('should accept valid ISO 4217 codes', async () => {
    const validCodes = ['USD', 'EUR', 'GBP', 'JPY', 'CHF'];

    for (const code of validCodes) {
      const dto = plainToInstance(CreateCurrencyDto, {
        code,
        name: 'Test Currency',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    }
  });

  it('should reject invalid ISO 4217 codes', async () => {
    const invalidCodes = ['XXX', 'ABC', 'ZZZ', 'QQQ'];

    for (const code of invalidCodes) {
      const dto = plainToInstance(CreateCurrencyDto, {
        code,
        name: 'Test Currency',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('code');
    }
  });

  it('should transform lowercase to uppercase', async () => {
    const dto = plainToInstance(CreateCurrencyDto, {
      code: 'usd',
      name: 'US Dollar',
    });

    expect(dto.code).toBe('USD');

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should trim whitespace', async () => {
    const dto = plainToInstance(CreateCurrencyDto, {
      code: ' EUR ',
      name: ' Euro ',
    });

    expect(dto.code).toBe('EUR');
    expect(dto.name).toBe('Euro');

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject codes that are not 3 characters', async () => {
    const invalidLengthCodes = ['US', 'EURO', 'E'];

    for (const code of invalidLengthCodes) {
      const dto = plainToInstance(CreateCurrencyDto, {
        code,
        name: 'Test Currency',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('code');
    }
  });

  it('should reject codes with non-letter characters', async () => {
    const invalidCodes = ['U$D', '123', 'EU1', 'E R'];

    for (const code of invalidCodes) {
      const dto = plainToInstance(CreateCurrencyDto, {
        code,
        name: 'Test Currency',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('code');
    }
  });

  it('should reject empty currency name', async () => {
    const dto = plainToInstance(CreateCurrencyDto, {
      code: 'USD',
      name: '',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });
});
