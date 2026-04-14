import { Routes } from '@angular/router';
import { Labour } from './labour';
import { rolesGuard } from '../../auth/guards/roles.guard';

export const LABOUR_ROUTES: Routes = [
   {
    path: '',
    component: Labour,
  },
  {
    path: 'empleados',
    loadComponent: () =>
      import('./employees/employees').then(m => m.Employees),
    canActivate: [rolesGuard],
    data: { roles: ['EMPLEADOS_EDITOR'] },
  },
  {
    path: 'empleados/nuevo',
    loadComponent: () =>
      import('./employees/components/employees-form/employees-form').then(m => m.EmployeesForm),
    canActivate: [rolesGuard],
    data: { roles: ['EMPLEADOS_EDITOR'] },
  },
  {
    path: 'empleados/editar/:id',
    loadComponent: () =>
      import('./employees/components/employees-form/employees-form').then(m => m.EmployeesForm),
    canActivate: [rolesGuard],
    data: { roles: ['EMPLEADOS_EDITOR'] },
  },
  {
    path: 'asistencia-diaria',
    loadComponent: () =>
      import('./daily-assistance/daily-assistance').then(m => m.DailyAssistance),
    canActivate: [rolesGuard],
    data: { roles: ['ASISTENCIA_EDITOR'] },
  },
  // {
  //   path: 'llegadas-retardos',
  //   loadComponent: () =>
  //     import('./retardos/retardos').then(m => m.Retardos),
  //   canActivate: [rolesGuard],
  //   data: { roles: ['RETARDOS_EDITOR'] },
  // },
  // {
  //   path: 'horas-extras',
  //   loadComponent: () =>
  //     import('./horas-extras/horas-extras').then(m => m.HorasExtras),
  //   canActivate: [rolesGuard],
  //   data: { roles: ['HORAS_EXTRAS_EDITOR'] },
  // },
  // {
  //   path: 'prestamos',
  //   loadComponent: () =>
  //     import('./prestamos/prestamos').then(m => m.Prestamos),
  //   canActivate: [rolesGuard],
  //   data: { roles: ['PRESTAMOS_EDITOR'] },
  // },
  // {
  //   path: 'nomina',
  //   loadComponent: () =>
  //     import('./nomina/nomina').then(m => m.Nomina),
  //   canActivate: [rolesGuard],
  //   data: { roles: ['NOMINA_EDITOR'] },
  // },


];
