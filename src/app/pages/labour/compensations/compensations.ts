import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { finalize, Subscription, take } from 'rxjs';

import { ModuleHeader } from '../../../shared/ui/module-header/module-header';
import { ModuleHeaderAction, ModuleHeaderConfig } from '../../../shared/ui/module-header/interfaces/module-header-interface';
import { SearchMultiSelect } from '../../../shared/ui/autocomplete-multiple/autocomplete-multiple';
import { DateRangeValue, InputDate } from '../../../shared/ui/input-date/input-date';
import { InputSelect, SelectCatalogOption } from '../../../shared/ui/input-select/input-select';
import { BtnsSection } from '../../../shared/ui/btns-section/btns-section';
import { DataTable } from '../../../shared/ui/data-table/data-table';
import { LoadingOverlay } from '../../../shared/ui/loading-overlay/loading-overlay';
import {
  ColumnsConfig, ColumnVariant, DataTableSortEvent,
} from '../../../shared/ui/data-table/interfaces/table-interfaces';
import { Catalog } from '../../../shared/interfaces/general-interfaces';
import { LocalStorageService } from '../../../shared/services/local-storage.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { AuthService } from '../../../auth/services/auth.service';
import {
  CompensationSortItem,
  CompensationStatus,
  CompensationsFilters,
  CompensationsSummary,
  EmployeeCompensationDto,
} from './interfaces/compensations-interfaces';
import { CompensationsService } from './services/compensations.service';
import { ModalCompensationForm } from './components/modal-compensation-form/modal-compensation-form';

interface CompensationUiFilters {
  employees: Catalog[];
  status: CompensationStatus | null;
  effectiveFrom: string;
  effectiveTo: string;
  page: number;
  limit: number;
  sorts: CompensationSortItem[];
}

interface CompensationRow extends EmployeeCompensationDto {
  employee_display: string;
  amount_value: number;
  status_label: string;
}

const FILTERS_KEY = 'mp_employee_finance_compensations_filters_v1';
const EMPTY_SUMMARY: CompensationsSummary = {
  pending_count: 0,
  approved_count: 0,
  cancelled_count: 0,
  approved_amount_total: 0,
};
const SORT_KEYS = new Set(['employee_name', 'effective_date', 'amount', 'status', 'created_at', 'id']);

function sanitizeCatalogs(input: unknown): Catalog[] {
  if (!Array.isArray(input)) return [];
  const items = new Map<number, Catalog>();
  for (const item of input) {
    const id = Number(item?.id);
    const name = typeof item?.name === 'string' ? item.name.trim() : '';
    if (Number.isSafeInteger(id) && id > 0 && name) items.set(id, { id, name });
  }
  return [...items.values()];
}

function validStatus(value: unknown): CompensationStatus | null {
  return value === 'pending' || value === 'approved' || value === 'cancelled' ? value : null;
}

@Component({
  selector: 'app-compensations',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatPaginatorModule,
    ModuleHeader,
    SearchMultiSelect,
    InputDate,
    InputSelect,
    BtnsSection,
    DataTable,
    LoadingOverlay,
  ],
  templateUrl: './compensations.html',
  styleUrl: './compensations.scss',
})
export class Compensations implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(CompensationsService);
  private readonly storage = inject(LocalStorageService);
  private readonly dialogs = inject(DialogService);
  private readonly auth = inject(AuthService);
  private subscription?: Subscription;

  readonly loadingTable = signal(false);
  readonly summary = signal<CompensationsSummary>({ ...EMPTY_SUMMARY });
  // Nuevo sólo aparece para quienes tienen permiso financiero o administración general.
  readonly headerConfig: ModuleHeaderConfig = {
    showNew: true, newRoles: ['NOMINA_EDITOR', 'ADMIN_GENERAL'],
  };
  readonly pageSizeOptions = [5, 10, 25, 50];
  readonly statusOptions: SelectCatalogOption[] = [
    { id: '', name: 'Todos' },
    { id: 'pending', name: 'Pendiente' },
    { id: 'approved', name: 'Aprobada' },
    { id: 'cancelled', name: 'Cancelada' },
  ];
  readonly columnsConfig: ColumnsConfig[] = [
    { key: 'employee_display', label: 'Empleado', sortable: true, sortKey: 'employee_name' },
    { key: 'effective_date', label: 'Fecha', type: 'date', sortable: true, sortKey: 'effective_date' },
    { key: 'amount_value', label: 'Importe', type: 'money', align: 'right', sortable: true, sortKey: 'amount' },
    { key: 'reason', label: 'Motivo' },
    {
      key: 'status_label', label: 'Estatus', type: 'chip', sortable: true, sortKey: 'status',
      variantResolver: (row: CompensationRow): ColumnVariant => this.statusVariant(row.status),
    },
  ];
  readonly displayedColumns = this.columnsConfig.map((column) => column.key);
  readonly formFilters = this.fb.group({
    employees: this.fb.nonNullable.control<Catalog[]>([]),
    status: this.fb.control<CompensationStatus | null>(null),
    dateRange: this.fb.control<DateRangeValue | null>(null),
  });

  filters: CompensationUiFilters = {
    employees: [], status: null, effectiveFrom: '', effectiveTo: '', page: 1, limit: 5, sorts: [],
  };
  sorts: CompensationSortItem[] = [];
  tableData: { data: CompensationRow[]; meta: { total: number } } = {
    data: [], meta: { total: 0 },
  };

  ngOnInit(): void {
    this.restoreFilters();
    this.loadCompensations();
  }

  get hasActiveFilters(): boolean {
    const value = this.formFilters.getRawValue();
    return !!(
      value.employees?.length || value.status ||
      value.dateRange?.startDate || value.dateRange?.endDate || this.sorts.length
    );
  }

  private backendFilters(): CompensationsFilters {
    return {
      page: this.filters.page,
      limit: this.filters.limit,
      ...(this.filters.employees.length
        ? { employee_ids: this.filters.employees.map((item) => Number(item.id)) }
        : {}),
      ...(this.filters.status ? { status: this.filters.status } : {}),
      ...(this.filters.effectiveFrom ? { effective_from: this.filters.effectiveFrom } : {}),
      ...(this.filters.effectiveTo ? { effective_to: this.filters.effectiveTo } : {}),
      sorts: [...this.sorts],
    };
  }

  private loadCompensations(): void {
    this.subscription?.unsubscribe();
    this.loadingTable.set(true);
    this.subscription = this.service.getCompensations(this.backendFilters())
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loadingTable.set(false)))
      .subscribe({
        next: (response) => {
          const total = response.meta.total;
          const lastPage = Math.max(1, Math.ceil(total / this.filters.limit));
          if (this.filters.page > lastPage) {
            this.filters.page = lastPage;
            this.persistFilters();
            this.loadCompensations();
            return;
          }
          this.tableData = {
            data: (response.data ?? []).map((item) => this.toRow(item)),
            meta: { total },
          };
          this.summary.set({ ...EMPTY_SUMMARY, ...response.summary });
        },
        error: (error) => {
          console.error('Error consultando compensaciones:', error);
          this.tableData = { data: [], meta: { total: 0 } };
          this.summary.set({ ...EMPTY_SUMMARY });
          // El interceptor HTTP global presenta los mensajes de NestJS.
        },
      });
  }

  private toRow(item: EmployeeCompensationDto): CompensationRow {
    return {
      ...item,
      id: String(item.id),
      employee_display: item.employee_name || `Empleado #${item.employee_id}`,
      amount_value: Number(item.amount ?? 0),
      status_label: this.statusLabel(item.status),
    };
  }

  private statusLabel(status: CompensationStatus): string {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'approved': return 'Aprobada';
      case 'cancelled': return 'Cancelada';
    }
  }

  private statusVariant(status: CompensationStatus): ColumnVariant {
    switch (status) {
      case 'pending': return 'chip-warning';
      case 'approved': return 'chip-success';
      case 'cancelled': return 'chip-danger';
    }
  }

  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();
    const effectiveFrom = value.dateRange?.startDate ?? '';
    const effectiveTo = value.dateRange?.endDate ?? '';
    if (effectiveFrom && effectiveTo && effectiveFrom > effectiveTo) {
      this.formFilters.controls.dateRange.setErrors({ dateRange: true });
      this.formFilters.controls.dateRange.markAsTouched();
      return;
    }
    this.filters = {
      employees: sanitizeCatalogs(value.employees),
      status: value.status ?? null,
      effectiveFrom,
      effectiveTo,
      page: 1,
      limit: this.filters.limit,
      sorts: [...this.sorts],
    };
    this.persistFilters();
    this.loadCompensations();
  }

  clearFilters(): void {
    this.sorts = [];
    this.formFilters.reset({ employees: [], status: null, dateRange: null }, { emitEvent: false });
    this.filters = {
      employees: [], status: null, effectiveFrom: '', effectiveTo: '',
      page: 1, limit: this.filters.limit, sorts: [],
    };
    this.storage.removeItem(FILTERS_KEY);
    this.loadCompensations();
  }

  onHeaderAction(action: ModuleHeaderAction | string): void {
    if (action !== 'new') return;
    if (!this.auth.hasRole('NOMINA_EDITOR') && !this.auth.hasRole('ADMIN_GENERAL')) return;

    // Mismo servicio de diálogos que Préstamos. Solo recargamos al crear con éxito.
    this.dialogs.open(ModalCompensationForm, undefined, 'medium').afterClosed()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        if (saved === true) this.loadCompensations();
      });
  }

  onBtnsSectionAction(action: string): void {
    if (action === 'search') this.searchWithFilters();
    if (action === 'clean') this.clearFilters();
  }

  onSortChange(event: DataTableSortEvent): void {
    this.sorts = event.sorts
      .filter((item) => SORT_KEYS.has(item.key))
      .map((item) => ({ key: item.key as CompensationSortItem['key'], direction: item.direction }));
    this.filters.page = 1;
    this.filters.sorts = [...this.sorts];
    this.persistFilters();
    this.loadCompensations();
  }

  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;
    this.persistFilters();
    this.loadCompensations();
  }

  private persistFilters(): void {
    this.storage.setItem(FILTERS_KEY, {
      ...this.filters,
      employees: sanitizeCatalogs(this.filters.employees),
      sorts: [...this.sorts],
    });
  }

  private restoreFilters(): void {
    const saved = this.storage.getItem<Partial<CompensationUiFilters>>(FILTERS_KEY);
    if (!saved) return;
    const page = Number(saved.page);
    const limit = Number(saved.limit);
    this.sorts = Array.isArray(saved.sorts)
      ? saved.sorts.filter((item): item is CompensationSortItem => !!item &&
        SORT_KEYS.has(item.key) && (item.direction === 'asc' || item.direction === 'desc'))
      : [];
    this.filters = {
      employees: sanitizeCatalogs(saved.employees),
      status: validStatus(saved.status),
      effectiveFrom: typeof saved.effectiveFrom === 'string' ? saved.effectiveFrom : '',
      effectiveTo: typeof saved.effectiveTo === 'string' ? saved.effectiveTo : '',
      page: Number.isSafeInteger(page) && page > 0 ? page : 1,
      limit: this.pageSizeOptions.includes(limit) ? limit : 5,
      sorts: [...this.sorts],
    };
    const dateRange: DateRangeValue | null = this.filters.effectiveFrom || this.filters.effectiveTo
      ? { startDate: this.filters.effectiveFrom || null, endDate: this.filters.effectiveTo || null }
      : null;
    this.formFilters.patchValue({
      employees: this.filters.employees,
      status: this.filters.status,
      dateRange,
    }, { emitEvent: false });
  }
}
