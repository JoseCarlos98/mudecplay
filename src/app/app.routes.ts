import { Routes } from '@angular/router';
import { Layout } from './layout/layout/layout';
import { authGuard } from './auth/guards/auth.guard';
import { rolesGuard } from './auth/guards/roles.guard';

// guards

export const routes: Routes = [
  // ============ PUBLIC ============
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login').then((m) => m.LoginComponent),
  },

  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./auth/unauthorized/unauthorized').then((m) => m.Unauthorized),
  },

  // ============ PRIVATE (JWT REQUIRED) ============
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      // Gastos (editor)
      {
        path: 'gastos',
        loadChildren: () =>
          import('./pages/expenses/expenses.routes').then((m) => m.EXPENSES_ROUTES),
        canActivate: [rolesGuard],
        data: { roles: ['GASTOS_EDITOR'] },
      },
    
      //  Reportes (editor)
      {
        path: 'reportes',
        loadComponent: () =>
          import('./pages/reports/reports').then((m) => m.Reports),
        canActivate: [rolesGuard],
        data: { roles: ['REPORTES_EMISOR'] },
      },

      // Catálogos (admin general)
      {
        path: 'proveedores',
        loadComponent: () => import('./pages/suppliers/suppliers').then((m) => m.Suppliers),
        canActivate: [rolesGuard],
        data: { roles: ['ADMIN_GENERAL'] },
      },
      {
        path: 'proyectos',
        loadComponent: () => import('./pages/projects/projects').then((m) => m.Projects),
        canActivate: [rolesGuard],
        data: { roles: ['ADMIN_GENERAL'] },
      },
      {
        path: 'clientes',
        loadComponent: () => import('./pages/clients/clients').then((m) => m.Clients),
        canActivate: [rolesGuard],
        data: { roles: ['ADMIN_GENERAL'] },
      },
      {
        path: 'responsables',
        loadComponent: () => import('./pages/responsible/responsible').then((m) => m.Responsible),
        canActivate: [rolesGuard],
        data: { roles: ['ADMIN_GENERAL'] },
      },
      {
        path: 'productos',
        loadComponent: () => import('./pages/products/products').then((m) => m.Products),
        canActivate: [rolesGuard],
        data: { roles: ['ADMIN_GENERAL'] },
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./pages/users/users').then((m) => m.Users),
        canActivate: [rolesGuard],
        data: { roles: ['ADMIN_GENERAL'] },
      },

      // Default
      { path: '', redirectTo: 'gastos', pathMatch: 'full' },
    ],
  },

  // fallback
  { path: '**', redirectTo: 'gastos' },
];
