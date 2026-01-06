import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpEvent, HttpHandlerFn } from '@angular/common/http';
import { of } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  const mockAuthService = {
    getToken: jest.fn(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should add Authorization header when token exists', (done) => {
    mockAuthService.getToken.mockReturnValue('mock-token');

    const request = new HttpRequest('GET', '/api/securities');
    const next = jest.fn(() => of({} as HttpEvent<unknown>)) as unknown as HttpHandlerFn;

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, next).subscribe(() => {
        expect(next).toHaveBeenCalled();
        const modifiedRequest = (next as jest.Mock).mock.calls[0][0] as HttpRequest<unknown>;
        expect(modifiedRequest.headers.get('Authorization')).toBe('Bearer mock-token');
        done();
      });
    });
  });

  it('should not add Authorization header when no token exists', (done) => {
    mockAuthService.getToken.mockReturnValue(null);

    const request = new HttpRequest('GET', '/api/securities');
    const next = jest.fn(() => of({} as HttpEvent<unknown>)) as unknown as HttpHandlerFn;

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, next).subscribe(() => {
        expect(next).toHaveBeenCalled();
        const modifiedRequest = (next as jest.Mock).mock.calls[0][0] as HttpRequest<unknown>;
        expect(modifiedRequest.headers.has('Authorization')).toBe(false);
        done();
      });
    });
  });

  it('should not add Authorization header for login endpoint', (done) => {
    mockAuthService.getToken.mockReturnValue('mock-token');

    const request = new HttpRequest('POST', '/api/auth/login');
    const next = jest.fn(() => of({} as HttpEvent<unknown>)) as unknown as HttpHandlerFn;

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, next).subscribe(() => {
        expect(next).toHaveBeenCalled();
        const modifiedRequest = (next as jest.Mock).mock.calls[0][0] as HttpRequest<unknown>;
        expect(modifiedRequest.headers.has('Authorization')).toBe(false);
        done();
      });
    });
  });

  it('should not add Authorization header for register endpoint', (done) => {
    mockAuthService.getToken.mockReturnValue('mock-token');

    const request = new HttpRequest('POST', '/api/auth/register');
    const next = jest.fn(() => of({} as HttpEvent<unknown>)) as unknown as HttpHandlerFn;

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, next).subscribe(() => {
        expect(next).toHaveBeenCalled();
        const modifiedRequest = (next as jest.Mock).mock.calls[0][0] as HttpRequest<unknown>;
        expect(modifiedRequest.headers.has('Authorization')).toBe(false);
        done();
      });
    });
  });
});
