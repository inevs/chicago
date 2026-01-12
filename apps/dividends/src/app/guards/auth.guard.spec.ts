import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { signal } from '@angular/core';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let router: Router;
  let mockIsAuthenticated: ReturnType<typeof signal<boolean>>;

  const mockAuthService = {
    isAuthenticated: signal(false),
    isTokenValid: jest.fn(),
  };

  const mockRouter = {
    createUrlTree: jest.fn(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });

    router = TestBed.inject(Router);
    mockIsAuthenticated = mockAuthService.isAuthenticated;
    mockAuthService.isTokenValid.mockReturnValue(true); // Default to valid token
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should allow access when user is authenticated and token is valid', () => {
    mockIsAuthenticated.set(true);
    mockAuthService.isTokenValid.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(true);
    expect(mockAuthService.isTokenValid).toHaveBeenCalled();
  });

  it('should redirect to login when user is not authenticated', () => {
    const mockUrlTree = {} as UrlTree;
    mockIsAuthenticated.set(false);
    mockAuthService.isTokenValid.mockReturnValue(false); // Token is invalid when not authenticated
    mockRouter.createUrlTree.mockReturnValue(mockUrlTree);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(mockUrlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
  });

  it('should redirect to login when token is invalid', () => {
    const mockUrlTree = {} as UrlTree;
    mockIsAuthenticated.set(true);
    mockAuthService.isTokenValid.mockReturnValue(false);
    mockRouter.createUrlTree.mockReturnValue(mockUrlTree);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(mockUrlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});
