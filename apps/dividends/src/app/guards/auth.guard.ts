import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if token exists AND is valid (not expired)
  if (authService.isAuthenticated() && authService.isTokenValid()) {
    return true;
  }

  // If token is invalid or doesn't exist, redirect to login
  // Note: If token exists but is invalid, we could call logout() here,
  // but the PortfolioStateService will handle that when trying to load data
  return router.createUrlTree(['/login']);
};
