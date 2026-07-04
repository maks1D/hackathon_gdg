import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    title: 'Dashboard — Build with AI',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: 'ai-playground',
    title: 'AI Playground — Build with AI',
    loadComponent: () =>
      import('./features/ai-playground/ai-playground.component').then(
        (m) => m.AiPlaygroundComponent,
      ),
  },
  {
    path: 'settings',
    title: 'Settings — Build with AI',
    loadComponent: () =>
      import('./features/settings/settings.component').then(
        (m) => m.SettingsComponent,
      ),
  },
  {
    path: 'css-debugging',
    title: 'CSS Design Tokens & Debugger — Build with AI',
    loadComponent: () =>
      import('./features/css-debugging/css-debugging.component').then(
        (m) => m.CssDebuggingComponent,
      ),
  },
  {
    path: 'dev-options',
    title: 'Dev Options — Build with AI',
    loadComponent: () =>
      import('./features/dev-options/dev-options.component').then(
        (m) => m.DevOptionsComponent,
      ),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
