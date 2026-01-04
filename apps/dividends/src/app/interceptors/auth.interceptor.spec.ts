import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let authService: AuthService;

  const mockAuthService = {
    getToken: jest.fn(),
  };

  const mockHandler: HttpHandler = {
    handle: jest.fn((req: HttpRequest<any>) => of({} as HttpEvent<any>)),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should add Authorization header when token exists', (done) => {
    mockAuthService.getToken.mockReturnValue('mock-token');

    const request = new HttpRequest('GET', '/api/securities');
    const next = jest.fn((req: HttpRequest<any>) => of({} as HttpEvent<any>));

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, next).subscribe(() => {
        expect(next).toHaveBeenCalled();
        const modifiedRequest = next.mock.calls[0][0];
        expect(modifiedRequest.headers.get('Authorization')).toBe('Bearer mock-token');
        done();
      });
    });
  });

  it('should not add Authorization header when no token exists', (done) => {
    mockAuthService.getToken.mockReturnValue(null);

    const request = new HttpRequest('GET', '/api/securities');
    const next = jest.fn((req: HttpRequest<any>) => of({} as HttpEvent<any>));

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, next).subscribe(() => {
        expect(next).toHaveBeenCalled();
        const modifiedRequest = next.mock.calls[0][0];
        expect(modifiedRequest.headers.has('Authorization')).toBe(false);
        done();
      });
    });
  });

  it('should not add Authorization header for login endpoint', (done) => {
    mockAuthService.getToken.mockReturnValue('mock-token');

    const request = new HttpRequest('POST', '/api/auth/login');
    const next = jest.fn((req: HttpRequest<any>) => of({} as HttpEvent<any>));

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, next).subscribe(() => {
        expect(next).toHaveBeenCalled();
        const modifiedRequest = next.mock.calls[0][0];
        expect(modifiedRequest.headers.has('Authorization')).toBe(false);
        done();
      });
    });
  });

  it('should not add Authorization header for register endpoint', (done) => {
    mockAuthService.getToken.mockReturnValue('mock-token');

    const request = new HttpRequest('POST', '/api/auth/register');
    const next = jest.fn((req: HttpRequest<any>) => of({} as HttpEvent<any>));

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, next).subscribe(() => {
        expect(next).toHaveBeenCalled();
        const modifiedRequest = next.mock.calls[0][0];
        expect(modifiedRequest.headers.has('Authorization')).toBe(false);
        done();
      });
    });
  });
});
