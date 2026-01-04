import { Route } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then(m => m.LoginComponent),
    title: 'Login - DiviTrack',
  },
  {
    path: '',
    redirectTo: 'uebersicht',
    pathMatch: 'full',
  },
  {
    path: 'uebersicht',
    loadComponent: () =>
      import('./pages/overview/overview.component').then(m => m.OverviewComponent),
    title: 'Übersicht - DiviTrack',
    canActivate: [authGuard],
  },
  {
    path: 'portfolio',
    loadComponent: () =>
      import('./pages/portfolio/portfolio.component').then(m => m.PortfolioComponent),
    title: 'Portfolio - DiviTrack',
    canActivate: [authGuard],
  },
  {
    path: 'dividenden',
    loadComponent: () =>
      import('./pages/dividends/dividends.component').then(m => m.DividendsComponent),
    title: 'Dividenden - DiviTrack',
    canActivate: [authGuard],
  },
  {
    path: 'wertpapiere',
    loadComponent: () =>
      import('./pages/security-transactions/security-transactions.component').then(m => m.SecurityTransactionsComponent),
    title: 'Käufe & Verkäufe - DiviTrack',
    canActivate: [authGuard],
  },
  {
    path: 'analysen',
    loadComponent: () =>
      import('./pages/analyses/analyses.component').then(m => m.AnalysesComponent),
    title: 'Analysen - DiviTrack',
    canActivate: [authGuard],
  },
  {
    path: 'transaktionen',
    redirectTo: 'dividenden',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'uebersicht',
  },
];
