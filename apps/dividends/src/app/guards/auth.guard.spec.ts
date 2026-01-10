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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should allow access when user is authenticated', () => {
    mockIsAuthenticated.set(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(true);
  });

  it('should redirect to login when user is not authenticated', () => {
    const mockUrlTree = {} as UrlTree;
    mockIsAuthenticated.set(false);
    mockRouter.createUrlTree.mockReturnValue(mockUrlTree);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(mockUrlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});
