import { Routes } from '@angular/router';
import { rolesGuard } from '../../auth/guards/roles.guard';

export const TREASURY_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'cuentas-bancarias',
    pathMatch: 'full',
  },

  {
    path: 'cuentas-bancarias',
    loadComponent: () =>
      import('./components/treasury-bank-accounts/treasury-bank-accounts').then(
        (m) => m.TreasuryBankAccounts,
      ),
    canActivate: [rolesGuard],
    data: {
      roles: ['TESORERIA_CUENTAS_BANCARIAS_EDITOR'],
    },
  },

  {
    path: 'cargar-movimientos',
    loadComponent: () =>
      import(
        './components/treasury-bank-movement-upload/treasury-bank-movement-upload'
      ).then((m) => m.TreasuryBankMovementUpload),
    canActivate: [rolesGuard],
    data: {
      roles: ['TESORERIA_MOVIMIENTOS_BANCARIOS_IMPORTADOR'],
    },
  },

  {
    path: 'movimientos-bancarios',
    loadComponent: () =>
      import('./components/treasury-bank-movements/treasury-bank-movements').then(
        (m) => m.TreasuryBankMovements,
      ),
    canActivate: [rolesGuard],
    data: {
      roles: [
        'TESORERIA_MOVIMIENTOS_BANCARIOS_CONSULTOR',
        'TESORERIA_MOVIMIENTOS_BANCARIOS_IMPORTADOR',
        'TESORERIA_CUENTAS_POR_COBRAR_EDITOR'
      ],
    },
  },

  {
    path: 'importaciones',
    loadComponent: () =>
      import('./components/treasury-import-files/treasury-import-files').then(
        (m) => m.TreasuryImportFiles,
      ),
    canActivate: [rolesGuard],
    data: {
      roles: [
        'TESORERIA_MOVIMIENTOS_BANCARIOS_CONSULTOR',
        'TESORERIA_MOVIMIENTOS_BANCARIOS_IMPORTADOR',
      ],
    },
  },

  {
    path: 'cuentas-por-pagar',

    loadComponent: () =>
      import(
        './components/treasury-accounts-payable/treasury-accounts-payable'
      ).then(
        (m) =>
          m.TreasuryAccountsPayable,
      ),

    canActivate: [
      rolesGuard,
    ],

    data: {
      roles: [
        'TESORERIA_CUENTAS_POR_PAGAR_EDITOR',
      ],
    },
  },

  {
    path: 'cuentas-por-cobrar',

    loadComponent: () =>
      import(
        './components/treasury-accounts-receivable/treasury-accounts-receivable'
      ).then(
        (m) =>
          m.TreasuryAccountsReceivable,
      ),

    canActivate: [
      rolesGuard,
    ],

    data: {
      roles: [
        'TESORERIA_CUENTAS_POR_COBRAR_EDITOR',
      ],
    },
  },

  {
    path: '**',
    redirectTo: 'cuentas-bancarias',
  },

  {
    path: '**',
    redirectTo: 'cuentas-bancarias',
  },
];