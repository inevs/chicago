import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    getProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return access token and user data', async () => {
      const mockRequest = {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
        },
      };

      const mockResponse = {
        access_token: 'mock-jwt-token',
        user: mockRequest.user,
      };

      mockAuthService.login.mockResolvedValue(mockResponse);

      const result = await controller.login(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(authService.login).toHaveBeenCalledWith(mockRequest.user);
    });
  });

  describe('register', () => {
    it('should create new user and return access token', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      };

      const mockResponse = {
        access_token: 'mock-jwt-token',
        user: {
          id: '2',
          email: registerDto.email,
          name: registerDto.name,
        },
      };

      mockAuthService.register.mockResolvedValue(mockResponse);

      const result = await controller.register(registerDto);

      expect(result).toEqual(mockResponse);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockUser = {
        sub: '1',
        email: 'test@example.com',
        name: 'Test User',
      };

      const mockProfile = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
      };

      mockAuthService.getProfile.mockResolvedValue(mockProfile);

      const result = await controller.getProfile(mockUser);

      expect(result).toEqual(mockProfile);
      expect(authService.getProfile).toHaveBeenCalledWith('1');
    });
  });
});
