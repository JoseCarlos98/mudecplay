import { Routes } from '@angular/router';
import { rolesGuard } from '../../auth/guards/roles.guard';
import { PurchaseOrders } from './purchase-orders';

export const PURCHASE_ORDERS_ROUTES: Routes = [
  {
    path: '',
    component: PurchaseOrders,
    canActivate: [rolesGuard],
    data: { roles: ['ORDENES_COMPRA_EDITOR'] },
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./components/purchase-order-form/purchase-order-form')
        .then((m) => m.PurchaseOrderForm),
    canActivate: [rolesGuard],
    data: { roles: ['ORDENES_COMPRA_EDITOR'] },
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./components/purchase-order-form/purchase-order-form')
        .then((m) => m.PurchaseOrderForm),
    canActivate: [rolesGuard],
    data: { roles: ['ORDENES_COMPRA_EDITOR'] },
  },
  {
    path: 'detalle/:id',
    loadComponent: () =>
      import('./components/purchase-order-details/purchase-order-details')
        .then((m) => m.PurchaseOrderDetails),
    canActivate: [rolesGuard],
    data: { roles: ['ORDENES_COMPRA_EDITOR'] },
  },
  {
    path: 'subir-ticket-gasto',
    loadComponent: () =>
      import('./components/uploa-ticket/uploa-ticket')
        .then((m) => m.UploaTicket),
    canActivate: [rolesGuard],
    data: { roles: ['ORDENES_COMPRA_EDITOR'] },
  },
  {
    path: 'fotos-sin-gasto',
    loadComponent: () =>
      import('./components/photo-without-cost/photo-without-cost')
        .then((m) => m.PhotoWithoutCost),
    canActivate: [rolesGuard],
    data: { roles: ['ORDENES_COMPRA_EDITOR'] },
  },

  // {
  //   path: 'conciliacion',
  //   loadComponent: () =>
  //     import('./components/purchase-order-reconciliation/purchase-order-reconciliation')
  //       .then((m) => m.PurchaseOrderReconciliation),
  //   canActivate: [rolesGuard],
  //   data: { roles: ['ORDENES_COMPRA_EDITOR'] },
  // },
  // {
  //   path: 'fotos/:photoId/registrar-gasto',
  //   loadComponent: () =>
  //     import('./components/purchase-order-expense-register/purchase-order-expense-register')
  //       .then((m) => m.PurchaseOrderExpenseRegister),
  //   canActivate: [rolesGuard],
  //   data: { roles: ['ORDENES_COMPRA_EDITOR'] },
  // },
];