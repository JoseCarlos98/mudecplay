import { Routes } from '@angular/router';
import { Layout } from './layout/layout/layout';

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: 'gastos', loadComponent: () => import('./pages/expenses/expenses').then(m => m.Expenses) },
      { path: '', redirectTo: 'gastos', pathMatch: 'full' }
    ]
  }
];
