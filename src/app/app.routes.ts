import { Routes } from '@angular/router';
import { Layout } from './layout/layout/layout';

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: 'gastos', loadComponent: () => import('./pages/bills/bills').then(m => m.Bills) },
      { path: '', redirectTo: 'clientes', pathMatch: 'full' }
    ]
  }
];
