import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersRepository } from './users.repository';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: UsersRepository;
  let jwtService: JwtService;

  const mockUsersRepository = {
    findByEmail: jest.fn(),
    findProfileById: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersRepository,
          useValue: mockUsersRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersRepository = module.get<UsersRepository>(UsersRepository);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(usersRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should return null when user is not found', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token and user data', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login(mockUser);

      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
        },
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: '1',
        email: 'test@example.com',
        name: 'Test User',
      });
    });
  });

  describe('register', () => {
    const originalAllowRegistration = process.env['ALLOW_REGISTRATION'];

    beforeEach(() => {
      process.env['ALLOW_REGISTRATION'] = 'true';
    });

    afterAll(() => {
      if (originalAllowRegistration === undefined) {
        delete process.env['ALLOW_REGISTRATION'];
      } else {
        process.env['ALLOW_REGISTRATION'] = originalAllowRegistration;
      }
    });

    it.each([undefined, '', 'false', '1', 'yes'])(
      'should reject registration when ALLOW_REGISTRATION is %p',
      async (value) => {
        if (value === undefined) {
          delete process.env['ALLOW_REGISTRATION'];
        } else {
          process.env['ALLOW_REGISTRATION'] = value;
        }

        const registerDto = {
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
        };

        await expect(service.register(registerDto)).rejects.toThrow(
          ForbiddenException
        );
        await expect(service.register(registerDto)).rejects.toThrow(
          'Registration is disabled'
        );
        expect(usersRepository.findByEmail).not.toHaveBeenCalled();
        expect(usersRepository.create).not.toHaveBeenCalled();
      }
    );

    it.each(['true', 'TRUE', ' true '])(
      'should treat ALLOW_REGISTRATION=%p as enabled',
      (value) => {
        process.env['ALLOW_REGISTRATION'] = value;
        expect(service.isRegistrationEnabled()).toBe(true);
      }
    );

    it('should create new user and return access token', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      };

      mockUsersRepository.findByEmail.mockResolvedValue(null);
      mockUsersRepository.create.mockResolvedValue({
        id: '2',
        email: registerDto.email,
        password: 'hashed-password',
        name: registerDto.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.register(registerDto);

      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        user: {
          id: '2',
          email: registerDto.email,
          name: registerDto.name,
        },
      });
      expect(usersRepository.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(usersRepository.create).toHaveBeenCalledWith({
        email: registerDto.email,
        password: expect.any(String),
        name: registerDto.name,
      });
      const { password: storedPassword } = mockUsersRepository.create.mock.calls[0][0];
      expect(storedPassword).not.toBe(registerDto.password);
      expect(await bcrypt.compare(registerDto.password, storedPassword)).toBe(true);
    });

    it('should throw UnauthorizedException when user already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User',
      };

      mockUsersRepository.findByEmail.mockResolvedValue({
        id: '1',
        email: registerDto.email,
        password: 'hashed-password',
        name: 'Existing User',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'User with this email already exists'
      );
      expect(usersRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
      };

      mockUsersRepository.findProfileById.mockResolvedValue(mockUser);

      const result = await service.getProfile('1');

      expect(result).toEqual(mockUser);
      expect(usersRepository.findProfileById).toHaveBeenCalledWith('1');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUsersRepository.findProfileById.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent-id')).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.getProfile('nonexistent-id')).rejects.toThrow(
        'User not found'
      );
    });
  });
});
