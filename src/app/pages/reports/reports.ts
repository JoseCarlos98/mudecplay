import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';

import { PageTabsComponent, PageTab } from '../../shared/ui/page-tabs/page-tabs';
import { DialogService } from '../../shared/services/dialog.service';
import { confirmPendingTabChange } from '../../shared/customs/confirm-pending-tab-change';
import { ProjectReport } from './components/project-report/project-report';
import { SupplierReport } from './components/supplier-report/supplier-report';



type ReportsSection =
  | 'project_detail'
  | 'project_by_supplier'
  | 'by_area'
  | 'project_payables';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, PageTabsComponent, ProjectReport, SupplierReport],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports {
  private readonly dialog = inject(DialogService);

  // Tab activo
  activeSection = signal<ReportsSection>('project_detail');

  // Tabs (tipos de reporte)
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
    id: 'by_area',
    icon: 'category',
    label: 'Gasto por área',
    description: 'Resumen por área: materiales, mano de obra, etc.',
  },
  {
    id: 'project_payables',
    icon: 'request_quote',
    label: 'Resumen del proyecto',
    description: 'Totales acumulados + cuentas por pagar (lo que debo)',
  },
];


  onActiveTabChange(nextId: string) {
    const next = nextId as ReportsSection;
    if (next === this.activeSection()) return;

    confirmPendingTabChange({
      dialog: this.dialog,
      // cuando conectemos forms/preview:
      // hasPending: () => this.form?.dirty ?? false,
      apply: () => this.activeSection.set(next),
      message: 'Tienes cambios sin generar/guardar. ¿Cambiar de pestaña de todos modos?',
      confirmText: 'Cambiar',
      cancelText: 'Cancelar',
    }).subscribe();
  }
}
