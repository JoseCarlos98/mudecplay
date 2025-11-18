import { Routes } from '@angular/router';
import { Expenses } from './expenses';

export const EXPENSES_ROUTES: Routes = [
  {
    path: '',
    component: Expenses,
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./components/expense-form/expense-form').then(m => m.ExpenseForm),
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./components/expense-form/expense-form').then(m => m.ExpenseForm),
  },
];
