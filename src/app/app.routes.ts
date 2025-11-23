import { Routes } from '@angular/router';
import { Layout } from './layout/layout/layout';

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: 'gastos', loadChildren: () => import('./pages/expenses/expenses.routes').then(m => m.EXPENSES_ROUTES) },
      { path: 'proveedores', loadComponent: () => import('./pages/suppliers/suppliers').then(m => m.Suppliers) },
      { path: 'proyectos', loadComponent: () => import('./pages/projects/projects').then(m => m.Projects) },
      { path: '', redirectTo: 'gastos', pathMatch: 'full' }
    ]
  }
];
