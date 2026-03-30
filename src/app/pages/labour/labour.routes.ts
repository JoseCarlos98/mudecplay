import { Routes } from '@angular/router';
import { Labour } from './labour';

export const LABOUR_ROUTES: Routes = [
  {
    path: '',
    component: Labour,
  },
  {
    path: 'empleados',
    loadComponent: () =>
      import('./employees/employees').then(m => m.Employees),
  },
  // {
  //   path: 'asistencia-diaria',
  //   loadComponent: () =>
  //     import('./employees/employees').then(m => m.Employees),
  // },
  // {
  //   path: 'llegadas-retardos',
  //   loadComponent: () =>
  //     import('./employees/employees').then(m => m.Employees),
  // },
  // {
  //   path: 'horas-extras',
  //   loadComponent: () =>
  //     import('./employees/employees').then(m => m.Employees),
  // },
  // {
  //   path: 'prestamos',
  //   loadComponent: () =>
  //     import('./employees/employees').then(m => m.Employees),
  // },
  // {
  //   path: 'nomina',
  //   loadComponent: () =>
  //     import('./employees/employees').then(m => m.Employees),
  // },
 
];
