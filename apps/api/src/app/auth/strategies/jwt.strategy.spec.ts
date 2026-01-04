import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtStrategy],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('validate', () => {
    it('should return payload when valid', async () => {
      const payload = {
        sub: '1',
        email: 'test@example.com',
        name: 'Test User',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual(payload);
    });

    it('should throw UnauthorizedException when sub is missing', async () => {
      const payload = {
        sub: '',
        email: 'test@example.com',
        name: 'Test User',
      };

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(strategy.validate(payload)).rejects.toThrow(
        'Invalid token payload'
      );
    });

    it('should throw UnauthorizedException when email is missing', async () => {
      const payload = {
        sub: '1',
        email: '',
        name: 'Test User',
      };

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(strategy.validate(payload)).rejects.toThrow(
        'Invalid token payload'
      );
    });
  });
});
