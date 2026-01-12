import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService, LoginResponse, User } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockRouter = {
    navigate: jest.fn(),
  };

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: mockRouter },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with user from localStorage if token exists', () => {
      localStorage.clear();

      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      };
      localStorage.setItem('auth_token', 'mock-token');
      localStorage.setItem('auth_user', JSON.stringify(mockUser));

      // Re-create the service to test initialization
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: Router, useValue: mockRouter },
        ],
      });

      const newService = TestBed.inject(AuthService);

      expect(newService.currentUser()).toEqual(mockUser);
      expect(newService.isAuthenticated()).toBe(true);
    });

    it('should initialize with no user if no token exists', () => {
      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('login', () => {
    it('should login user and store token', (done) => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockResponse: LoginResponse = {
        access_token: 'mock-jwt-token',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
        },
      };

      service.login(credentials).subscribe((response) => {
        expect(response).toEqual(mockResponse);
        expect(localStorage.getItem('auth_token')).toBe('mock-jwt-token');
        expect(localStorage.getItem('auth_user')).toBe(
          JSON.stringify(mockResponse.user)
        );
        expect(service.currentUser()).toEqual(mockResponse.user);
        expect(service.isAuthenticated()).toBe(true);
        done();
      });

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      req.flush(mockResponse);
    });
  });

  describe('logout', () => {
    it('should clear token and user data and navigate to login', () => {
      localStorage.setItem('auth_token', 'mock-token');
      localStorage.setItem('auth_user', JSON.stringify({ id: '1', email: 'test@example.com', name: 'Test' }));
      service.currentUser.set({ id: '1', email: 'test@example.com', name: 'Test' });
      service.isAuthenticated.set(true);

      service.logout();

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('getToken', () => {
    it('should return token from localStorage', () => {
      localStorage.setItem('auth_token', 'mock-token');
      expect(service.getToken()).toBe('mock-token');
    });

    it('should return null when no token exists', () => {
      expect(service.getToken()).toBeNull();
    });
  });

  describe('isTokenValid', () => {
    function createMockJWT(expirationTime: number): string {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ exp: expirationTime, sub: '1', email: 'test@example.com' }));
      const signature = 'mock-signature';
      return `${header}.${payload}.${signature}`;
    }

    it('should return true for valid non-expired token', () => {
      // Create token that expires 1 hour in the future
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const validToken = createMockJWT(futureTime);
      localStorage.setItem('auth_token', validToken);

      expect(service.isTokenValid()).toBe(true);
    });

    it('should return false for expired token', () => {
      // Create token that expired 1 hour ago
      const pastTime = Math.floor(Date.now() / 1000) - 3600;
      const expiredToken = createMockJWT(pastTime);
      localStorage.setItem('auth_token', expiredToken);

      expect(service.isTokenValid()).toBe(false);
    });

    it('should return false for token expiring within buffer time (30s)', () => {
      // Create token that expires in 15 seconds (within 30s buffer)
      const soonTime = Math.floor(Date.now() / 1000) + 15;
      const soonToExpireToken = createMockJWT(soonTime);
      localStorage.setItem('auth_token', soonToExpireToken);

      expect(service.isTokenValid()).toBe(false);
    });

    it('should return false when no token exists', () => {
      expect(service.isTokenValid()).toBe(false);
    });

    it('should return false for malformed token', () => {
      localStorage.setItem('auth_token', 'invalid-token-format');
      expect(service.isTokenValid()).toBe(false);
    });

    it('should return false for token without expiration field', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ sub: '1', email: 'test@example.com' })); // No exp field
      const signature = 'mock-signature';
      const tokenWithoutExp = `${header}.${payload}.${signature}`;
      localStorage.setItem('auth_token', tokenWithoutExp);

      expect(service.isTokenValid()).toBe(false);
    });

    it('should handle base64 decoding errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const invalidBase64Token = 'header.@invalid@base64@.signature';
      localStorage.setItem('auth_token', invalidBase64Token);

      expect(service.isTokenValid()).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
