import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { finalize, Subscription, take } from 'rxjs';

import { ModuleHeader } from '../../../shared/ui/module-header/module-header';
import {
  ModuleHeaderAction,
  ModuleHeaderConfig,
} from '../../../shared/ui/module-header/interfaces/module-header-interface';
import { DateRangeValue, InputDate } from '../../../shared/ui/input-date/input-date';
import { InputSelect, SelectCatalogOption } from '../../../shared/ui/input-select/input-select';
import { InputField } from '../../../shared/ui/input-field/input-field';
import { BtnsSection } from '../../../shared/ui/btns-section/btns-section';
import { DataTable } from '../../../shared/ui/data-table/data-table';
import { LoadingOverlay } from '../../../shared/ui/loading-overlay/loading-overlay';
import {
  ColumnsConfig,
  ColumnVariant,
  DataTableSortEvent,
  DataTableActionEvent,
  DataTableExtraAction,
  TableActionPermissions,
} from '../../../shared/ui/data-table/interfaces/table-interfaces';
import { LocalStorageService } from '../../../shared/services/local-storage.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { AuthService } from '../../../auth/services/auth.service';

import {
  PayrollPeriodDto,
  PayrollPeriodFilters,
  PayrollPeriodSort,
  PayrollPeriodSortKey,
  PayrollPeriodStatus,
  PayrollPeriodSummary,
} from './interfaces/payroll-interfaces';
import { PayrollService } from './services/payroll.service';
import { ModalPayrollPeriodForm } from './components/modal-payroll-period-form/modal-payroll-period-form';
import { ModalPayrollCalculate } from './components/modal-payroll-calculate/modal-payroll-calculate';
import { ModalPayrollPreview } from './components/modal-payroll-preview/modal-payroll-preview';

interface PayrollPeriodRow extends PayrollPeriodDto {
  status_label: string;
}

const STORAGE_KEY = 'mp_payroll_period_filters_v1';
const SORT_KEYS: PayrollPeriodSortKey[] = ['id', 'week_start', 'pay_date', 'status'];
const EMPTY_SUMMARY: PayrollPeriodSummary = { open_count: 0, closed_count: 0 };

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatPaginatorModule,
    ModuleHeader,
    InputDate,
    InputSelect,
    InputField,
    BtnsSection,
    DataTable,
    LoadingOverlay,
  ],
  templateUrl: './payroll.html',
  styleUrl: './payroll.scss',
})
export class Payroll implements OnInit {
  private readonly service = inject(PayrollService);
  private readonly fb = inject(FormBuilder);
  private readonly storage = inject(LocalStorageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogs = inject(DialogService);
  private readonly auth = inject(AuthService);
  private subscription?: Subscription;

  readonly headerConfig: ModuleHeaderConfig = {
    showNew: true,
    newRoles: ['NOMINA_EDITOR', 'ADMIN_GENERAL'],
  };

  readonly loading = signal(false);
  readonly summary = signal<PayrollPeriodSummary>({ ...EMPTY_SUMMARY });
  readonly permissions: TableActionPermissions = { showEdit: false, showDelete: false };
  readonly actions: DataTableExtraAction<PayrollPeriodRow>[] = [
    {
      type: 'preview',
      icon: 'visibility',
      tooltip: 'Ver detalle de nómina',
      visible: () => this.auth.hasRole('NOMINA_EDITOR') || this.auth.hasRole('ADMIN_GENERAL'),
      disabled: () => this.loading(),
    },
    {
      type: 'calculate',
      icon: 'calculate',
      tooltip: 'Calcular borrador de nómina',
      visible: row => row.status === 'open' &&
        (this.auth.hasRole('NOMINA_EDITOR') || this.auth.hasRole('ADMIN_GENERAL')),
      disabled: () => this.loading(),
    },
  ];

  readonly pageSizeOptions = [5, 10, 25, 50];
  readonly statusOptions: SelectCatalogOption[] = [
    { id: '', name: 'Todos' },
    { id: 'open', name: 'Abierto' },
    { id: 'closed', name: 'Cerrado' },
  ];

  readonly formFilters = this.fb.group({
    dateRange: this.fb.control<DateRangeValue | null>(null),
    status: this.fb.control<PayrollPeriodStatus | null>(null),
    periodId: this.fb.nonNullable.control('', [
      Validators.pattern(/^[1-9]\d{0,19}$/),
    ]),
  });

  filters: PayrollPeriodFilters = { page: 1, limit: 5 };
  sorts: PayrollPeriodSort[] = [];

  tableData: { data: PayrollPeriodRow[]; meta: { total: number } } = {
    data: [],
    meta: { total: 0 },
  };

  readonly columnsConfig: ColumnsConfig[] = [
    { key: 'id', label: 'Folio', sortable: true, sortKey: 'id' },
    { key: 'week_start', label: 'Inicio de semana', type: 'date', sortable: true, sortKey: 'week_start' },
    { key: 'week_end', label: 'Fin de semana', type: 'date' },
    { key: 'overtime_start', label: 'Inicio corte extras', type: 'date' },
    { key: 'overtime_end', label: 'Fin corte extras', type: 'date' },
    { key: 'pay_date', label: 'Fecha de pago', type: 'date', sortable: true, sortKey: 'pay_date' },
    {
      key: 'status_label',
      label: 'Estatus',
      type: 'chip',
      sortable: true,
      sortKey: 'status',
      variantResolver: (row: PayrollPeriodRow): ColumnVariant =>
        row.status === 'closed' ? 'chip-success' : 'chip-warning',
    },
  ];

  readonly displayedColumns = [...this.columnsConfig.map(column => column.key), 'actions'];

  ngOnInit(): void {
    this.restoreFilters();
    this.loadPeriods();
  }

  get hasActiveFilters(): boolean {
    const value = this.formFilters.getRawValue();
    return !!(
      value.dateRange?.startDate ||
      value.dateRange?.endDate ||
      value.status ||
      value.periodId?.trim() ||
      this.sorts.length
    );
  }

  loadPeriods(): void {
    this.subscription?.unsubscribe();
    this.loading.set(true);
    this.subscription = this.service.getPeriods(this.filters)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: response => {
          const total = response.meta.total;
          const lastPage = Math.max(1, Math.ceil(total / this.filters.limit));
          if (this.filters.page > lastPage) {
            this.filters.page = lastPage;
            this.saveFilters();
            this.loadPeriods();
            return;
          }
          this.tableData = {
            data: response.data.map(period => ({
              ...period,
              id: String(period.id),
              status_label: period.status === 'closed' ? 'Cerrado' : 'Abierto',
            })),
            meta: { total },
          };
          this.summary.set({ ...EMPTY_SUMMARY, ...response.summary });
        },
        error: error => {
          console.error('Error consultando períodos de nómina:', error);
          this.tableData = { data: [], meta: { total: 0 } };
          this.summary.set({ ...EMPTY_SUMMARY });
          // El interceptor global gestiona los mensajes de error.
        },
      });
  }

  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();
    const weekFrom = value.dateRange?.startDate ?? '';
    const weekTo = value.dateRange?.endDate ?? '';

    if (weekFrom && weekTo && weekFrom > weekTo) {
      this.formFilters.controls.dateRange.setErrors({ dateRange: true });
      this.formFilters.controls.dateRange.markAsTouched();
      return;
    }
    if (this.formFilters.controls.periodId.invalid) {
      this.formFilters.controls.periodId.markAsTouched();
      return;
    }

    this.filters = {
      page: 1,
      limit: this.filters.limit,
      ...(weekFrom ? { week_from: weekFrom } : {}),
      ...(weekTo ? { week_to: weekTo } : {}),
      ...(value.status ? { status: value.status } : {}),
      ...(value.periodId.trim() ? { period_id: value.periodId.trim() } : {}),
      ...(this.sorts.length ? {
        sort: this.sorts[0].key,
        direction: this.sorts[0].direction,
      } : {}),
    };
    this.saveFilters();
    this.loadPeriods();
  }

  clearFilters(): void {
    this.sorts = [];
    this.formFilters.reset(
      { dateRange: null, status: null, periodId: '' },
      { emitEvent: false },
    );
    this.filters = { page: 1, limit: this.filters.limit };
    this.storage.removeItem(STORAGE_KEY);
    this.loadPeriods();
  }

  onBtnsSectionAction(action: string): void {
    if (action === 'search') this.searchWithFilters();
    if (action === 'clean') this.clearFilters();
  }

  onSortChange(event: DataTableSortEvent): void {
    const first = event.sorts.find(item =>
      SORT_KEYS.includes(item.key as PayrollPeriodSortKey) &&
      (item.direction === 'asc' || item.direction === 'desc'),
    );
    this.sorts = first ? [{
      key: first.key as PayrollPeriodSortKey,
      direction: first.direction,
    }] : [];

    this.filters = {
      ...this.filters,
      page: 1,
      sort: this.sorts[0]?.key,
      direction: this.sorts[0]?.direction,
    };
    this.saveFilters();
    this.loadPeriods();
  }

  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;
    this.saveFilters();
    this.loadPeriods();
  }

  /** Crear período no calcula, aprueba ni paga ninguna nómina. */
  onHeaderAction(action: ModuleHeaderAction | string): void {
    if (action !== 'new') return;
    if (!this.auth.hasRole('NOMINA_EDITOR') && !this.auth.hasRole('ADMIN_GENERAL')) return;

    this.dialogs.open(ModalPayrollPeriodForm, undefined, 'medium').afterClosed()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(created => {
        if (created === true) this.clearFilters();
      });
  }


  /** Ver detalle consulta las ejecuciones reales; no supone run_id = period_id. */
  onTableAction(event: DataTableActionEvent<PayrollPeriodRow>): void {
    if (this.loading()) return;
    if (!this.auth.hasRole('NOMINA_EDITOR') && !this.auth.hasRole('ADMIN_GENERAL')) return;

    const period = event.row;
    if (event.type === 'preview') {
      this.openPreview(period);
      return;
    }
    if (event.type !== 'calculate' || period.status !== 'open') return;

    this.dialogs.open(ModalPayrollCalculate, { period }, 'small').afterClosed()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((result: { run_id: string } | false | undefined) => {
        if (result && typeof result === 'object' && 'run_id' in result && result.run_id) {
          this.loadPeriods();
          this.openPreview(period, String(result.run_id));
        }
      });
  }

  private openPreview(period: PayrollPeriodDto, runId?: string): void {
    this.dialogs.open(ModalPayrollPreview, { period, runId }, 'medium');
  }

  private saveFilters(): void {
    this.storage.setItem(STORAGE_KEY, this.filters);
  }

  private restoreFilters(): void {
    const saved = this.storage.getItem<Partial<PayrollPeriodFilters>>(STORAGE_KEY);
    if (!saved) return;

    const page = Number(saved.page);
    const limit = Number(saved.limit);
    const status = saved.status === 'open' || saved.status === 'closed' ? saved.status : undefined;
    const weekFrom = typeof saved.week_from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(saved.week_from)
      ? saved.week_from : undefined;
    const weekTo = typeof saved.week_to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(saved.week_to)
      ? saved.week_to : undefined;
    const periodId = typeof saved.period_id === 'string' && /^[1-9]\d{0,19}$/.test(saved.period_id)
      ? saved.period_id : undefined;
    const sort = SORT_KEYS.includes(saved.sort as PayrollPeriodSortKey) ? saved.sort : undefined;
    const direction = saved.direction === 'asc' || saved.direction === 'desc' ? saved.direction : undefined;

    this.filters = {
      page: Number.isSafeInteger(page) && page > 0 ? page : 1,
      limit: this.pageSizeOptions.includes(limit) ? limit : 5,
      ...(weekFrom ? { week_from: weekFrom } : {}),
      ...(weekTo ? { week_to: weekTo } : {}),
      ...(status ? { status } : {}),
      ...(periodId ? { period_id: periodId } : {}),
      ...(sort ? { sort, direction: direction ?? 'desc' } : {}),
    };
    this.sorts = sort ? [{ key: sort, direction: direction ?? 'desc' }] : [];
    this.formFilters.patchValue({
      dateRange: weekFrom || weekTo ? {
        startDate: weekFrom ?? null,
        endDate: weekTo ?? null,
      } : null,
      status: status ?? null,
      periodId: periodId ?? '',
    }, { emitEvent: false });
  }
}
