import { Routes } from '@angular/router';
import { Layout } from './layout/layout/layout';
import { authGuard } from './auth/guards/auth.guard';
import { rolesGuard } from './auth/guards/roles.guard';
import { WarehouseLots } from './pages/warehouse-lots/warehouse-lots';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./auth/unauthorized/unauthorized').then((m) => m.Unauthorized),
  },

  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      {
        path: 'gastos',
        loadChildren: () =>
          import('./pages/expenses/expenses.routes').then((m) => m.EXPENSES_ROUTES),
        canActivate: [rolesGuard],
        data: { roles: ['GASTOS_EDITOR'] },
      },
      // {
      //   path: 'mano-de-obra',
      //   loadChildren: () =>
      //     import('./pages/labour/labour.routes').then((m) => m.LABOUR_ROUTES),
      //   canActivate: [rolesGuard],
      // },
      {
        path: 'mano-de-obra',
        loadChildren: () =>
          import('./pages/labour/labour.routes').then((m) => m.LABOUR_ROUTES),
        canActivate: [rolesGuard],
        data: {
          roles: [
            'EMPLEADOS_EDITOR',
            'ASISTENCIA_EDITOR',
            'LLEGADAS_RETARDOS_EDITOR',
            'HORAS_EXTRAS_EDITOR',
            'PRESTAMOS_EDITOR',
            'NOMINA_EDITOR',
          ],
        },
      },
      {
        path: 'almacen',
        component: WarehouseLots,
        canActivate: [rolesGuard],
        data: { roles: ['ALMACEN_EDITOR'] },
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('./pages/reports/reports').then((m) => m.Reports),
        canActivate: [rolesGuard],
        data: { roles: ['REPORTES_EMISOR'] },
      },

      // Catálogos (por rol de módulo)
      {
        path: 'proveedores',
        loadComponent: () => import('./pages/suppliers/suppliers').then((m) => m.Suppliers),
        canActivate: [rolesGuard],
        data: { roles: ['PROVEEDORES_EDITOR'] },
      },
      {
        path: 'proyectos',
        loadComponent: () => import('./pages/projects/projects').then((m) => m.Projects),
        canActivate: [rolesGuard],
        data: { roles: ['PROYECTOS_EDITOR'] },
      },
      {
        path: 'clientes',
        loadComponent: () => import('./pages/clients/clients').then((m) => m.Clients),
        canActivate: [rolesGuard],
        data: { roles: ['CLIENTES_EDITOR'] },
      },
      {
        path: 'responsables',
        loadComponent: () => import('./pages/responsible/responsible').then((m) => m.Responsible),
        canActivate: [rolesGuard],
        data: { roles: ['RESPONSABLES_EDITOR'] },
      },
      {
        path: 'productos',
        loadComponent: () => import('./pages/products/products').then((m) => m.Products),
        canActivate: [rolesGuard],
        data: { roles: ['PRODUCTOS_EDITOR'] },
      },
      {
        path: 'cuentas-por-cobrar',
        loadChildren: () => import('./pages/accounts-receivable/accounts-receivable.routes').then((m) => m.ACCOUNTS_RECEIVABLE_ROUTES),
        canActivate: [rolesGuard],
        data: { roles: ['CUENTAS_POR_COBRAR_EDITOR'] },
      },

      {
        path: 'usuarios',
        loadComponent: () => import('./pages/users/users').then((m) => m.Users),
        canActivate: [rolesGuard],
        data: { roles: ['USUARIOS_EDITOR'] },
      },
      {
        path: 'areas',
        loadComponent: () => import('./pages/areas/areas').then((m) => m.Areas),
        canActivate: [rolesGuard],
        data: { roles: ['AREAS_EDITOR'] },
      },
      {
        path: 'areas-empleados',
        loadComponent: () => import('./pages/employee-areas/employee-areas').then((m) => m.EmployeeAreas),
        canActivate: [rolesGuard],
        data: { roles: ['AREAS_EMPLEADOS_EDITOR'] },
      },
      // {
      //   path: 'asistencia-empleados',
      //   loadComponent: () => import('./pages/labour/daily-assistance/daily-assistance').then((m) => m.DailyAssistance),
      //   canActivate: [rolesGuard],
      //   data: { roles: ['ASISTENCIA_EDITOR'] },
      // },

    ],
  },

  { path: '**', redirectTo: 'gastos' },
];