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
    path: 'transaktionen',
    loadComponent: () =>
      import('./pages/transactions/transactions.component').then(m => m.TransactionsComponent),
    title: 'Transaktionen - DiviTrack',
  },
  {
    path: 'analysen',
    loadComponent: () =>
      import('./pages/analyses/analyses.component').then(m => m.AnalysesComponent),
    title: 'Analysen - DiviTrack',
  },
  {
    path: '**',
    redirectTo: 'uebersicht',
  },
];
