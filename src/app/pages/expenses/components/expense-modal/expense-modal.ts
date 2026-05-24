import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { DataTable } from '../../../../shared/ui/data-table/data-table';
import { ColumnsConfig } from '../../../../shared/ui/data-table/interfaces/table-interfaces';
import { ExpenseItem } from '../../interfaces/expense-interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

type ExpenseModalMode = 'labor' | 'warehouse' | 'direct' | 'mixed';

type WarehouseAssignmentStatus = 'pending' | 'partial' | 'completed';

interface WarehouseAssignmentProject {
  project_id: number | null;
  project_name: string;
  quantity: number;
  amount: number;
}

interface WarehouseAssignmentSummary {
  status: WarehouseAssignmentStatus;
  status_label: string;
  original_quantity: number;
  assigned_quantity: number;
  pending_quantity: number;
  unit: string | null;
  original_amount: number;
  assigned_amount: number;
  pending_amount: number;
  projects: WarehouseAssignmentProject[];
}

type ExpenseItemWithWarehouseSummary = ExpenseItem & {
  warehouse_assignment_summary?: WarehouseAssignmentSummary | null;
};

type ExpenseModalData =
  | ExpenseItemWithWarehouseSummary[]
  | {
    id?: number;
    origin_type?: string | null;
    provider_display_name?: string | null;
    items?: ExpenseItemWithWarehouseSummary[];
  };

type ExpenseItemTableRow = ExpenseItemWithWarehouseSummary & {
  item_display: string;
  product_display: string;
  concept_display: string;
  labor_area_display: string;
  item_type_label: string;
  quantity_text: string | null;
  unit_price_display: string;
  project_display: string;
  assignment_target_text: string;
  destination_display: string;
  assignment_status_name: string;
  warehouse_progress_text: string;
  warehouse_pending_text: string;
};

const LABOR_COLUMNS_CONFIG: ColumnsConfig[] = [
  {
    key: 'concept_display',
    label: 'Empleado / concepto',
  },
  {
    key: 'labor_area_display',
    label: 'Área',
  },
  {
    key: 'project_display',
    label: 'Proyecto',
  },
  {
    key: 'assignment_status_name',
    label: 'Asignación',
    type: 'chip',
    typeVariant: 'chip-neutral',
  },
  {
    key: 'amount',
    label: 'Monto',
    type: 'money',
    align: 'right',
  },
  {
    key: 'payment_amount',
    label: 'Pagado',
    type: 'money',
    align: 'right',
  },
  {
    key: 'remaining_amount',
    label: 'Saldo',
    type: 'money',
    align: 'right',
  },
  {
    key: 'payment_date',
    label: 'Fecha de pago',
    type: 'date',
  },
];

const WAREHOUSE_COLUMNS_CONFIG: ColumnsConfig[] = [
  {
    key: 'product_display',
    label: 'Producto',
  },
  {
    key: 'item_type_label',
    label: 'Tipo',
    type: 'chip',
    typeVariant: 'chip-neutral',
  },
  {
    key: 'quantity_text',
    label: 'Cantidad',
    align: 'right',
  },
  {
    key: 'unit_price_display',
    label: 'P. unitario',
    align: 'right',
  },
  {
    key: 'assignment_target_text',
    label: 'Proyecto / asignación',
  },
  {
    key: 'assignment_status_name',
    label: 'Asignación',
    type: 'chip',
    typeVariant: 'chip-neutral',
  },
  {
    key: 'warehouse_progress_text',
    label: 'Avance almacén',
  },
  {
    key: 'amount',
    label: 'Monto total',
    type: 'money',
    align: 'right',
  },
  {
    key: 'payment_amount',
    label: 'Pagado',
    type: 'money',
    align: 'right',
  },
  {
    key: 'remaining_amount',
    label: 'Saldo',
    type: 'money',
    align: 'right',
  },
  {
    key: 'payment_date',
    label: 'Fecha de pago',
    type: 'date',
  },
];

const DIRECT_COLUMNS_CONFIG: ColumnsConfig[] = [
  {
    key: 'item_display',
    label: 'Producto / concepto',
  },
  {
    key: 'quantity_text',
    label: 'Cantidad',
    align: 'right',
  },
  {
    key: 'unit_price_display',
    label: 'P. unitario',
    align: 'right',
  },
  {
    key: 'project_display',
    label: 'Proyecto',
  },
  {
    key: 'assignment_status_name',
    label: 'Asignación',
    type: 'chip',
    typeVariant: 'chip-neutral',
  },
  {
    key: 'amount',
    label: 'Monto total',
    type: 'money',
    align: 'right',
  },
  {
    key: 'payment_amount',
    label: 'Pagado',
    type: 'money',
    align: 'right',
  },
  {
    key: 'remaining_amount',
    label: 'Saldo',
    type: 'money',
    align: 'right',
  },
  {
    key: 'payment_date',
    label: 'Fecha de pago',
    type: 'date',
  },
];

const MIXED_COLUMNS_CONFIG: ColumnsConfig[] = [
  {
    key: 'item_display',
    label: 'Producto / concepto',
  },
  {
    key: 'item_type_label',
    label: 'Tipo',
    type: 'chip',
    typeVariant: 'chip-neutral',
  },
  {
    key: 'quantity_text',
    label: 'Cantidad',
    align: 'right',
  },
  {
    key: 'destination_display',
    label: 'Proyecto / destino',
  },
  {
    key: 'assignment_status_name',
    label: 'Asignación',
    type: 'chip',
    typeVariant: 'chip-neutral',
  },
  {
    key: 'warehouse_progress_text',
    label: 'Avance almacén',
  },
  {
    key: 'amount',
    label: 'Monto total',
    type: 'money',
    align: 'right',
  },
  {
    key: 'payment_amount',
    label: 'Pagado',
    type: 'money',
    align: 'right',
  },
  {
    key: 'remaining_amount',
    label: 'Saldo',
    type: 'money',
    align: 'right',
  },
  {
    key: 'payment_date',
    label: 'Fecha de pago',
    type: 'date',
  },
];

@Component({
  selector: 'app-expense-modal',
  standalone: true,
  imports: [
    CommonModule,
    ModuleHeader,
    MatIconModule,
    DataTable,
    MatPaginatorModule,
  ],
  templateUrl: './expense-modal.html',
  styleUrl: './expense-modal.scss',
})
export class ExpenseModal implements OnInit {
  private readonly rawData = inject<ExpenseModalData | null>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ExpenseModal>);

  readonly headerConfig = HEADER_CONFIG;

  mode: ExpenseModalMode = 'direct';
  expenseOriginType: string | null = null;
  providerDisplayName: string | null = null;

  columnsConfig: ColumnsConfig[] = [];
  displayedColumns: string[] = [];

  items: ExpenseItemTableRow[] = [];

  pageIndex: number = 0;
  pageSize: number = 5;
  readonly pageSizeOptions: number[] = [5, 10, 25, 50];

  ngOnInit(): void {
    const normalized = this.normalizeModalData(this.rawData);

    this.expenseOriginType = normalized.originType;
    this.providerDisplayName = normalized.providerDisplayName;

    this.mode = this.resolveMode(normalized.items);
    this.columnsConfig = this.resolveColumnsConfig(this.mode);
    this.displayedColumns = this.columnsConfig.map((column) => column.key);

    this.items = normalized.items.map((item) => this.mapItemToTableRow(item));
  }

  get paginatedItems(): ExpenseItemTableRow[] {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;

    return this.items.slice(start, end);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  get totalAmount(): number {
    return this.items.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  }

  get totalAssignedWarehouseAmount(): number {
    return this.items.reduce(
      (sum, item) =>
        sum + Number(item.warehouse_assignment_summary?.assigned_amount ?? 0),
      0,
    );
  }

  get totalPendingWarehouseAmount(): number {
    return this.items.reduce(
      (sum, item) =>
        sum + Number(item.warehouse_assignment_summary?.pending_amount ?? 0),
      0,
    );
  }

  get hasWarehouseItems(): boolean {
    return this.items.some((item) => item.item_type === 'warehouse');
  }

  get isLaborMode(): boolean {
    return this.mode === 'labor';
  }

  get isWarehouseMode(): boolean {
    return this.mode === 'warehouse' || this.mode === 'mixed';
  }

  closeModal(saved?: boolean): void {
    this.dialogRef.close(!!saved);
  }

  private normalizeModalData(data: ExpenseModalData | null): {
    originType: string | null;
    providerDisplayName: string | null;
    items: ExpenseItemWithWarehouseSummary[];
  } {
    if (Array.isArray(data)) {
      return {
        originType: null,
        providerDisplayName: null,
        items: data,
      };
    }

    return {
      originType: data?.origin_type ?? null,
      providerDisplayName: data?.provider_display_name ?? null,
      items: data?.items ?? [],
    };
  }

  private resolveMode(items: ExpenseItemWithWarehouseSummary[]): ExpenseModalMode {
    const hasWarehouse = items.some((item) => item.item_type === 'warehouse');
    const hasLabor = items.some((item) => this.isLaborItem(item));
    const hasDirectNormal = items.some(
      (item) => item.item_type !== 'warehouse' && !this.isLaborItem(item),
    );

    if (hasLabor && !hasWarehouse && !hasDirectNormal) return 'labor';
    if (hasWarehouse && !hasLabor && !hasDirectNormal) return 'warehouse';
    if (!hasWarehouse && !hasLabor && hasDirectNormal) return 'direct';

    return 'mixed';
  }

  private resolveColumnsConfig(mode: ExpenseModalMode): ColumnsConfig[] {
    switch (mode) {
      case 'labor':
        return LABOR_COLUMNS_CONFIG;

      case 'warehouse':
        return WAREHOUSE_COLUMNS_CONFIG;

      case 'mixed':
        return MIXED_COLUMNS_CONFIG;

      case 'direct':
      default:
        return DIRECT_COLUMNS_CONFIG;
    }
  }

  private mapItemToTableRow(
    item: ExpenseItemWithWarehouseSummary,
  ): ExpenseItemTableRow {
    const isWarehouse = item.item_type === 'warehouse';
    const isLabor = this.isLaborItem(item);
    const summary = item.warehouse_assignment_summary ?? null;

    const productName = this.resolveProductName(item);
    const concept = item.concept?.trim() || '';
    const laborArea = item.product_display_name?.trim() || 'Sin dato';

    const itemDisplay = isLabor
      ? concept || this.providerDisplayName || 'Mano de obra'
      : productName || concept || item.product_display_name || 'Sin dato';

    const projectDisplay = isWarehouse
      ? this.getWarehouseAssignmentTargetText(summary)
      : this.getDirectProjectText(item);

    return {
      ...item,

      item_display: itemDisplay,
      product_display: productName || 'Sin dato',
      concept_display: concept || 'Sin dato',
      labor_area_display: laborArea,

      item_type_label: isWarehouse
        ? 'Almacén'
        : isLabor
          ? 'Mano de obra'
          : 'Directo',

      quantity_text: isLabor
        ? this.resolveLaborQuantityText(item)
        : isWarehouse
          ? this.formatQuantity(item.quantity, item.unit)
          : this.resolveDirectQuantityText(item),

      unit_price_display: this.formatUnitPrice(item.unit_price),

      project_display: this.getDirectProjectText(item),

      assignment_target_text: projectDisplay,

      destination_display: isWarehouse
        ? this.getWarehouseAssignmentTargetText(summary)
        : this.getDirectProjectText(item),

      assignment_status_name: isWarehouse
        ? this.getWarehouseAssignmentStatusLabel(summary)
        : this.getDirectAssignmentStatusLabel(item),

      warehouse_progress_text: isWarehouse
        ? this.getWarehouseProgressText(summary, item)
        : '-',

      warehouse_pending_text: isWarehouse
        ? this.getWarehousePendingText(summary, item)
        : '-',
    };
  }

  private isLaborItem(item: ExpenseItemWithWarehouseSummary): boolean {
    if (this.expenseOriginType === 'labor_auto') return true;

    const concept = item.concept?.toLowerCase().trim() || '';

    return (
      item.item_type !== 'warehouse' &&
      !item.product &&
      !!item.product_display_name &&
      concept.includes('mano de obra')
    );
  }

  private resolveProductName(item: ExpenseItemWithWarehouseSummary): string {
    const product: any = item.product;

    return product?.name?.trim() || '';
  }

  private resolveDirectQuantityText(
    item: ExpenseItemWithWarehouseSummary,
  ): string | null {
    const quantity = Number(item.quantity ?? 0);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return null;
    }

    return this.formatQuantity(quantity, item.unit);
  }

  private getDirectProjectText(item: ExpenseItemWithWarehouseSummary): string {
    const project: any = item.project;

    return project?.name?.trim() || 'No asignado';
  }

  private getDirectAssignmentStatusLabel(
    item: ExpenseItemWithWarehouseSummary,
  ): string {
    const project: any = item.project;

    return project?.id ? 'Asignado' : 'No asignado';
  }

  private getWarehouseAssignmentStatusLabel(
    summary: WarehouseAssignmentSummary | null,
  ): string {
    return summary?.status_label || 'Pendiente';
  }

  private getWarehouseAssignmentTargetText(
    summary: WarehouseAssignmentSummary | null,
  ): string {
    if (!summary) return 'Pendiente en almacén';

    if (!summary.projects?.length) {
      return 'Pendiente en almacén';
    }

    return summary.projects
      .map((project) => {
        const quantity = this.formatQuantity(project.quantity, summary.unit);
        const amount = this.formatMoney(project.amount);

        return `${project.project_name} (${quantity} / ${amount})`;
      })
      .join(' | ');
  }

  private getWarehouseProgressText(
    summary: WarehouseAssignmentSummary | null,
    item: ExpenseItemWithWarehouseSummary,
  ): string {
    if (!summary) {
      const original = this.formatQuantity(item.quantity, item.unit);
      return `0 de ${original}`;
    }

    const assigned = this.formatNumber(summary.assigned_quantity);
    const original = this.formatQuantity(
      summary.original_quantity,
      summary.unit,
    );

    return `${assigned} de ${original}`;
  }

  private getWarehousePendingText(
    summary: WarehouseAssignmentSummary | null,
    item: ExpenseItemWithWarehouseSummary,
  ): string {
    if (!summary) {
      return this.formatQuantity(item.quantity, item.unit);
    }

    return this.formatQuantity(summary.pending_quantity, summary.unit);
  }

  private resolveLaborQuantityText(
    item: ExpenseItemWithWarehouseSummary,
  ): string | null {
    const concept = item.concept?.trim() || '';
    const match = concept.match(/(\d+(?:\.\d+)?)\s*hrs?/i);

    if (match?.[1]) {
      const hours = Number(match[1]);

      return this.formatQuantity(hours, 'hora');
    }

    return null;
  }

  private formatQuantity(
    value: number | string | null | undefined,
    unit?: string | null,
  ): string {
    if (value === null || value === undefined || value === '') {
      return unit ? `0 ${this.resolveUnitLabel(0, unit)}` : '0';
    }

    const numberValue = Number(value ?? 0);

    const quantity = numberValue.toLocaleString('es-MX', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });

    const unitLabel = this.resolveUnitLabel(numberValue, unit);

    return `${quantity} ${unitLabel}`.trim();
  }

  private formatNumber(value: number | string | null | undefined): string {
    return Number(value ?? 0).toLocaleString('es-MX', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });
  }

  private formatUnitPrice(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return 'Sin dato';
    }

    const numberValue = Number(value);

    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      return 'Sin dato';
    }

    return this.formatMoney(numberValue);
  }

  private formatMoney(value: number | string | null | undefined): string {
    return Number(value ?? 0).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private resolveUnitLabel(quantity: number, unit?: string | null): string {
    const normalizedUnit = unit?.trim();

    if (!normalizedUnit) return '';

    const lower = normalizedUnit.toLowerCase();

    if (lower === 'pieza') {
      return quantity === 1 ? 'pieza' : 'piezas';
    }

    if (lower === 'hora' || lower === 'hr' || lower === 'hrs') {
      return quantity === 1 ? 'hora' : 'horas';
    }

    return normalizedUnit;
  }
}