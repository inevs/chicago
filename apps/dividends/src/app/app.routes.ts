import { Route } from '@angular/router';

export const appRoutes: Route[] = [
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
  },
  {
    path: 'portfolio',
    loadComponent: () =>
      import('./pages/portfolio/portfolio.component').then(m => m.PortfolioComponent),
    title: 'Portfolio - DiviTrack',
  },
  {
    path: 'dividenden',
    loadComponent: () =>
      import('./pages/dividends/dividends.component').then(m => m.DividendsComponent),
    title: 'Dividenden - DiviTrack',
  },
  {
    path: 'wertpapiere',
    loadComponent: () =>
      import('./pages/security-transactions/security-transactions.component').then(m => m.SecurityTransactionsComponent),
    title: 'Käufe & Verkäufe - DiviTrack',
  },
  {
    path: 'analysen',
    loadComponent: () =>
      import('./pages/analyses/analyses.component').then(m => m.AnalysesComponent),
    title: 'Analysen - DiviTrack',
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
