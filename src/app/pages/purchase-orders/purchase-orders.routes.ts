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
    data: { roles: ['ORDENES_COMPRA_TICKETS_SUBIDOR'] },
  },
  {
    path: 'fotos-sin-gasto',
    loadComponent: () =>
      import('./components/photo-without-cost/photo-without-cost')
        .then((m) => m.PhotoWithoutCost),
    canActivate: [rolesGuard],
    data: { roles: ['ORDENES_COMPRA_FOTOS_SIN_GASTO_EDITOR'] },
  },
  {
    path: 'fotos-sin-gasto/:photoId/conciliar',
    loadComponent: () =>
      import('./components/photo-without-cost/components/photo-reconcile/photo-reconcile')
        .then((m) => m.PhotoReconcile),
    canActivate: [rolesGuard],
    data: { roles: ['ORDENES_COMPRA_FOTOS_SIN_GASTO_EDITOR'] },
  },
  {
    path: 'registrar-gasto/:photoId',
    loadComponent: () =>
      import('./components/purchase-order-details/components/record-oc-expense/record-oc-expense')
        .then((m) => m.RecordOcExpense),
    canActivate: [rolesGuard],
    data: { roles: ['ORDENES_COMPRA_FOTOS_SIN_GASTO_EDITOR'] },
  },
  {
    path: 'registrar-gasto-xml/:photoId',
    loadComponent: () =>
      import('./components/purchase-order-details/components/record-oc-xml-expense/record-oc-xml-expense')
        .then((m) => m.RecordOcXmlExpense),
    canActivate: [rolesGuard],
    data: { roles: ['ORDENES_COMPRA_FOTOS_SIN_GASTO_EDITOR'] },
  },
  {
    path: 'registrar-almacen/:photoId',
    loadComponent: () =>
      import('./components/purchase-order-details/components/record-oc-warehouse-expense/record-oc-warehouse-expense')
        .then((m) => m.RecordOcWarehouseExpense),
    canActivate: [rolesGuard],
    data: { roles: ['ORDENES_COMPRA_FOTOS_SIN_GASTO_EDITOR'] },
  },
  {
    path: 'registrar-almacen-xml/:photoId',
    loadComponent: () =>
      import('./components/purchase-order-details/components/record-oc-warehouse-xml-expense/record-oc-warehouse-xml-expense')
        .then((m) => m.RecordOcWarehouseXmlExpense),
    canActivate: [rolesGuard],
    data: { roles: ['ORDENES_COMPRA_FOTOS_SIN_GASTO_EDITOR'] },
  },
];