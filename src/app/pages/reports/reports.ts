import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';

import { PageTabsComponent, PageTab } from '../../shared/ui/page-tabs/page-tabs';
import { DialogService } from '../../shared/services/dialog.service';
import { confirmPendingTabChange } from '../../shared/customs/confirm-pending-tab-change';
import { ProjectReport } from './components/project-report/project-report';
import { SupplierReport } from './components/supplier-report/supplier-report';
import { AreaReport } from './components/area-report/area-report';
import { ProjectPayables } from './components/project-payables/project-payables';
import { ProjectStatus } from './components/project-status/project-status';
import { AccountsReceivableReport } from './components/accounts-receivable-report/accounts-receivable-report';

type ReportsSection =
  | 'project_detail'
  | 'project_by_supplier'
  | 'by_area'
  | 'project_payables'
  | 'project_status'
  | 'accounts_receivable_report';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    PageTabsComponent,
    ProjectReport,
    SupplierReport,
    AreaReport,
    ProjectPayables,
    ProjectStatus,
    AccountsReceivableReport,
  ],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports {
  private readonly dialog = inject(DialogService);

  activeSection = signal<ReportsSection>('project_detail');

  tabs: PageTab[] = [
    {
      id: 'project_detail',
      icon: 'receipt_long',
      label: 'Gasto por proyecto',
      description: 'Listado completo con fechas, conceptos y totales',
    },
    {
      id: 'project_by_supplier',
      icon: 'store',
      label: 'Gasto por proveedor',
      description: 'Dentro del proyecto seleccionado: cuánto se ha gastado con cada proveedor',
    },
    {
      id: 'project_payables',
      icon: 'request_quote',
      label: 'Resumen del proyecto',
      description: 'Totales acumulados + cuentas por pagar (lo que debo)',
    },
    {
      id: 'project_status',
      icon: 'monitoring',
      label: 'Estado Financiero',
      description: 'Totales acumulados y cuentas por pagar',
    },
    {
      id: 'accounts_receivable_report',
      icon: 'payments',
      label: 'Cuentas por cobrar',
      description: 'Reporte global o por cliente de facturas pendientes y cobradas',
    },
  ];

  onActiveTabChange(nextId: string) {
    const next = nextId as ReportsSection;
    if (next === this.activeSection()) return;

    confirmPendingTabChange({
      dialog: this.dialog,
      apply: () => this.activeSection.set(next),
      message: 'Tienes cambios sin generar/guardar. ¿Cambiar de pestaña de todos modos?',
      confirmText: 'Cambiar',
      cancelText: 'Cancelar',
    }).subscribe();
  }
}