import { Routes } from '@angular/router';
import { Labour } from './labour';
import { rolesGuard } from '../../auth/guards/roles.guard';

export const LABOUR_ROUTES: Routes = [
  {
    path: '',
    component: Labour,
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
  {
    path: 'llegadas-retardos',
    loadComponent: () =>
      import('./attendance-tardiness/attendance-tardiness').then(m => m.AttendanceTardiness),
    canActivate: [rolesGuard],
    data: { roles: ['LLEGADAS_RETARDOS_EDITOR'] },
  },
  {
    path: 'horas-extras',
    loadComponent: () =>
      import('./overtime/overtime').then(m => m.Overtime),
    canActivate: [rolesGuard],
    data: { roles: ['HORAS_EXTRAS_EDITOR'] },
  },
];
