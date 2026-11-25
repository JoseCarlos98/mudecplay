import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { finalize, of, switchMap, take } from 'rxjs';

import { ModuleHeader } from '../../../../../shared/ui/module-header/module-header';
import {
  ModuleHeaderAction,
  ModuleHeaderConfig,
} from '../../../../../shared/ui/module-header/interfaces/module-header-interface';
import { BtnsSection } from '../../../../../shared/ui/btns-section/btns-section';
import { DataTable } from '../../../../../shared/ui/data-table/data-table';
import { LoadingOverlay } from '../../../../../shared/ui/loading-overlay/loading-overlay';
import {
  ColumnsConfig,
  DataTableActionEvent,
  DataTableExtraAction,
  TableActionPermissions,
} from '../../../../../shared/ui/data-table/interfaces/table-interfaces';
import {
  PayrollPeriodDto,
  PayrollPreviewEmployee,
  PayrollRunPreview,
} from '../../interfaces/payroll-interfaces';
import { PayrollService } from '../../services/payroll.service';

interface PreviewEmployeeRow extends PayrollPreviewEmployee {
  employee_name: string;
  paid_days_value: number;
  earnings_value: number;
  deductions_value: number;
  net_value: number;
}

const HEADER_CONFIG: ModuleHeaderConfig = { modal: true };

@Component({
  selector: 'app-modal-payroll-preview',
  standalone: true,
  imports: [CommonModule, MatIconModule, ModuleHeader, BtnsSection, DataTable, LoadingOverlay],
  templateUrl: './modal-payroll-preview.html',
  styleUrl: './modal-payroll-preview.scss',
})
export class ModalPayrollPreview implements OnInit {
  readonly data = inject<{ period: PayrollPeriodDto; runId?: string }>(MAT_DIALOG_DATA);
  private readonly service = inject(PayrollService);
  private readonly dialogRef = inject(MatDialogRef<ModalPayrollPreview>);
  private readonly destroyRef = inject(DestroyRef);

  readonly headerConfig = HEADER_CONFIG;
  readonly permissions: TableActionPermissions = { showEdit: false, showDelete: false };
  readonly actions: DataTableExtraAction<PreviewEmployeeRow>[] = [
    { type: 'concepts', icon: 'receipt_long', tooltip: 'Ver conceptos y advertencias' },
  ];
  readonly columnsConfig: ColumnsConfig[] = [
    { key: 'employee_name', label: 'Empleado' },
    { key: 'paid_days_value', label: 'Días pagados' },
    { key: 'earnings_value', label: 'Ingresos', type: 'money', align: 'right' },
    { key: 'deductions_value', label: 'Descuentos', type: 'money', align: 'right' },
    { key: 'net_value', label: 'Neto', type: 'money', align: 'right' },
  ];
  readonly displayedColumns = [...this.columnsConfig.map(col => col.key), 'actions'];

  loading = false;
  preview: PayrollRunPreview | null = null;
  selected: PreviewEmployeeRow | null = null;
  employees: PreviewEmployeeRow[] = [];
  noRuns = false;

  get period(): PayrollPeriodDto { return this.data.period; }
  get isProvisional(): boolean { return this.preview?.run.status === 'draft'; }

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading = true;
    const runId = this.data.runId;
    const source$ = runId
      ? this.service.getRunPreview(runId)
      : this.service.getPeriodRuns(String(this.period.id)).pipe(
          switchMap(runs => {
            const latest = runs.find(item => item.status !== 'voided');
            return latest
              ? this.service.getRunPreview(String(latest.id))
              : of(null);
          }),
        );

    source$
      .pipe(take(1), takeUntilDestroyed(this.destroyRef), finalize(() => { this.loading = false; }))
      .subscribe({
        next: preview => {
          this.noRuns = preview === null;
          this.preview = preview;
          this.employees = (preview?.employees ?? []).map(employee => ({
            ...employee,
            employee_name: employee.name || `Empleado #${employee.id}`,
            paid_days_value: Number(employee.paid_days ?? 0),
            earnings_value: Number(employee.earnings ?? 0),
            deductions_value: Number(employee.deductions ?? 0),
            net_value: Number(employee.net ?? 0),
          }));
          this.selected = null;
        },
        error: error => {
          console.error('No fue posible consultar el detalle de nómina:', error);
          // El interceptor existente muestra el error del backend.
        },
      });
  }

  onEmployeeAction(event: DataTableActionEvent<PreviewEmployeeRow>): void {
    if (event.type === 'concepts') this.selected = event.row;
  }

  asWarning(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      const item = value as Record<string, unknown>;
      const message = item['message'] ?? item['detail'] ?? item['code'];
      if (typeof message === 'string') return message;
      return JSON.stringify(item);
    }
    return String(value ?? 'Advertencia sin detalle');
  }

  readonly conceptLabels: Readonly<Record<string, string>> = {
    WEEK_BASE: 'Sueldo semanal',
    ABSENCE_DEDUCTION: 'Descuento por falta',
    TARDINESS_DEDUCTION: 'Descuento por retardo',
    OVERTIME: 'Horas extras',
    SUNDAY_WORKED: 'Domingo trabajado',
    COMPENSATION: 'Compensación',
    LOAN_PLANNED_DEDUCTION: 'Descuento previsto de préstamo',
  };

  conceptLabel(code: string): string {
    return this.conceptLabels[code] ?? code;
  }

  directionLabel(direction: string): string {
    if (direction === 'earning') return 'Ingreso';
    if (direction === 'deduction') return 'Descuento';
    return direction;
  }

  onFooterAction(action: string): void {
    if (action === 'close' || action === 'cancel') this.close();
  }

  onHeaderAction(action: ModuleHeaderAction | string): void {
    if (action === 'close') this.close();
  }

  close(): void {
    this.dialogRef.close();
  }
}
