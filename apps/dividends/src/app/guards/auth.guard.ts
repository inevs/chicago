import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if token is valid (isTokenValid already verifies token exists)
  if (authService.isTokenValid()) {
    return true;
  }

  // If token is invalid or doesn't exist, redirect to login
  return router.createUrlTree(['/login']);
};
