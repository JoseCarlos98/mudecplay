import { Routes } from '@angular/router';
import { AccountsReceivable } from './accounts-receivable';

export const ACCOUNTS_RECEIVABLE_ROUTES: Routes = [
  {
    path: '',
    component: AccountsReceivable,
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./components/accounts-receivable-form/accounts-receivable-form').then(m => m.AccountsReceivableForm),
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./components/accounts-receivable-form/accounts-receivable-form').then(m => m.AccountsReceivableForm),
  },
];
