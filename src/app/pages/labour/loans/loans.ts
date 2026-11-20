import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { finalize, Subscription, take } from 'rxjs';
import { ModuleHeader } from '../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../shared/ui/module-header/interfaces/module-header-interface';
import { SearchMultiSelect } from '../../../shared/ui/autocomplete-multiple/autocomplete-multiple';
import { DateRangeValue, InputDate } from '../../../shared/ui/input-date/input-date';
import { InputSelect, SelectCatalogOption } from '../../../shared/ui/input-select/input-select';
import { BtnsSection } from '../../../shared/ui/btns-section/btns-section';
import { DataTable } from '../../../shared/ui/data-table/data-table';
import { LoadingOverlay } from '../../../shared/ui/loading-overlay/loading-overlay';
import {
  ColumnsConfig, ColumnVariant, DataTableActionEvent, DataTableExtraAction,
  DataTableSortEvent, TableActionPermissions,
} from '../../../shared/ui/data-table/interfaces/table-interfaces';
import { Catalog } from '../../../shared/interfaces/general-interfaces';
import { DialogService } from '../../../shared/services/dialog.service';
import { LocalStorageService } from '../../../shared/services/local-storage.service';
import { AuthService } from '../../../auth/services/auth.service';
import { LoansService } from './services/loans.service';
import { EmployeeLoanDto, FinanceSortItem, LoanStatus, LoansFilters, LoansSummary } from './interfaces/loans-interfaces';
import { ModalLoanForm } from './components/modal-loan-form/modal-loan-form';
import { ModalLoanDisburse } from './components/modal-loan-disburse/modal-loan-disburse';
import { ModalLoanReason } from './components/modal-loan-reason/modal-loan-reason';
import { ModalLoanRepayments } from './components/modal-loan-repayments/modal-loan-repayments';

interface LoansUiFilters {
  employees: Catalog[];
  status: LoanStatus | null;
  requestedFrom: string;
  requestedTo: string;
  page: number;
  limit: number;
  sorts: FinanceSortItem[];
}
interface LoanRow extends EmployeeLoanDto {
  status_label: string;
  principal_amount_value: number;
  remaining_balance_value: number;
  employee_display: string;
}
const FILTERS_KEY = 'mp_employee_finance_loans_filters_v1';
const EMPTY_SUMMARY: LoansSummary = {
  pending_count: 0, active_count: 0, settled_count: 0, cancelled_count: 0,
  disbursed_principal_total: 0, remaining_balance_total: 0,
};
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

@Component({
  selector: 'app-loans',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatPaginatorModule,
    ModuleHeader, SearchMultiSelect, InputDate, InputSelect, BtnsSection, DataTable, LoadingOverlay],
  templateUrl: './loans.html',
  styleUrl: './loans.scss',
})
export class Loans implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(LoansService);
  private readonly dialogs = inject(DialogService);
  private readonly auth = inject(AuthService);
  private readonly storage = inject(LocalStorageService);
  private subscription?: Subscription;
  readonly loadingTable = signal(false);
  readonly summary = signal<LoansSummary>({ ...EMPTY_SUMMARY });
  readonly headerConfig: ModuleHeaderConfig = { showNew: true, newRoles: ['PRESTAMOS_EDITOR'] };
  readonly pageSizeOptions = [5, 10, 25, 50];
  readonly statusOptions: SelectCatalogOption[] = [
    { id: '', name: 'Todos' }, { id: 'pending', name: 'Pendiente' },
    { id: 'active', name: 'Activo' }, { id: 'settled', name: 'Liquidado' },
    { id: 'cancelled', name: 'Cancelado' },
  ];
  readonly permissions: TableActionPermissions = { showEdit: false, showDelete: false };
  readonly actions: DataTableExtraAction<LoanRow>[] = [
    {
      type: 'disburse', icon: 'payments', tooltip: 'Confirmar entrega',
      visible: (row) => row.status === 'pending' && this.auth.hasRole('PRESTAMOS_EDITOR'),
      disabled: () => this.loadingTable(),
    },
    {
      type: 'cancel', icon: 'cancel', tooltip: 'Cancelar solicitud pendiente',
      visible: (row) => row.status === 'pending' && this.auth.hasRole('PRESTAMOS_EDITOR'),
      disabled: () => this.loadingTable(),
    },
    {
      type: 'repayments', icon: 'receipt_long', tooltip: 'Ver historial de abonos',
      visible: () => this.auth.hasRole('PRESTAMOS_EDITOR'),
      disabled: () => this.loadingTable(),
    },
  ];
  readonly columnsConfig: ColumnsConfig[] = [
    { key: 'employee_display', label: 'Empleado', sortable: true, sortKey: 'employee_name' },
    { key: 'requested_on', label: 'Solicitud', type: 'date', sortable: true, sortKey: 'requested_on' },
    { key: 'disbursed_on', label: 'Entregado', type: 'date', fallback: '—', sortable: true, sortKey: 'disbursed_on' },
    { key: 'principal_amount_value', label: 'Principal', type: 'money', align: 'right', sortable: true, sortKey: 'principal_amount' },
    { key: 'remaining_balance_value', label: 'Saldo', type: 'money', align: 'right', sortable: true, sortKey: 'remaining_balance' },
    {
      key: 'status_label', label: 'Estatus', type: 'chip', sortable: true, sortKey: 'status',
      variantResolver: (row: LoanRow): ColumnVariant => this.statusVariant(row.status),
    },
  ];
  readonly displayedColumns = this.columnsConfig.map((x) => x.key).concat('actions');
  formFilters = this.fb.group({
    employees: this.fb.nonNullable.control<Catalog[]>([]),
    status: this.fb.control<LoanStatus | null>(null),
    // Un solo ControlValueAccessor de rango (mismo patrón que Gastos).
    dateRange: this.fb.control<DateRangeValue | null>(null),
  });
  filters: LoansUiFilters = {
    employees: [], status: null, requestedFrom: '', requestedTo: '', page: 1, limit: 5, sorts: [],
  };
  sorts: FinanceSortItem[] = [];
  tableData: { data: LoanRow[]; meta: { total: number } } = { data: [], meta: { total: 0 } };
  readonly totalCount = computed(() => this.summary().pending_count + this.summary().active_count +
    this.summary().settled_count + this.summary().cancelled_count);

  ngOnInit(): void {
    this.restoreFilters();
    this.loadLoans();
  }
  get hasActiveFilters(): boolean {
    const v = this.formFilters.getRawValue();
    return !!(v.employees?.length || v.status || v.dateRange?.startDate || v.dateRange?.endDate || this.sorts.length);
  }
  private backendFilters(): LoansFilters {
    return {
      page: this.filters.page, limit: this.filters.limit,
      ...(this.filters.employees.length ? { employee_ids: this.filters.employees.map((x) => Number(x.id)) } : {}),
      ...(this.filters.status ? { status: this.filters.status } : {}),
      ...(this.filters.requestedFrom ? { requested_from: this.filters.requestedFrom } : {}),
      ...(this.filters.requestedTo ? { requested_to: this.filters.requestedTo } : {}),
      sorts: [...this.sorts],
    };
  }
  private loadLoans(): void {
    this.subscription?.unsubscribe();
    this.loadingTable.set(true);
    this.subscription = this.service.getLoans(this.backendFilters())
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loadingTable.set(false)))
      .subscribe({
        next: (response) => {
          const lastPage = Math.max(1, Math.ceil(response.meta.total / this.filters.limit));
          if (this.filters.page > lastPage) {
            this.filters.page = lastPage;
            this.persistFilters();
            this.loadLoans();
            return;
          }
          this.tableData = {
            data: (response.data ?? []).map((record) => this.toRow(record)),
            meta: { total: response.meta.total },
          };
          this.summary.set({ ...EMPTY_SUMMARY, ...response.summary });
        },
        error: (error) => {
          console.error('Error consultando préstamos:', error);
          this.tableData = { data: [], meta: { total: 0 } };
          this.summary.set({ ...EMPTY_SUMMARY });
          // Los errores HTTP los notifica el interceptor global de MUDECPLAY.
        },
      });
  }
  private toRow(record: EmployeeLoanDto): LoanRow {
    return {
      ...record,
      id: String(record.id),
      employee_display: record.employee_name ?? `Empleado #${record.employee_id}`,
      principal_amount_value: Number(record.principal_amount ?? 0),
      remaining_balance_value: Number(record.remaining_balance ?? 0),
      status_label: this.statusLabel(record.status),
    };
  }
  private statusLabel(status: LoanStatus): string {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'active': return 'Activo';
      case 'settled': return 'Liquidado';
      case 'cancelled': return 'Cancelado';
    }
  }
  private statusVariant(status: LoanStatus): ColumnVariant {
    switch (status) {
      case 'pending': return 'chip-warning';
      case 'active': return 'chip-neutral';
      case 'settled': return 'chip-success';
      case 'cancelled': return 'chip-danger';
    }
  }
  searchWithFilters(): void {
    const v = this.formFilters.getRawValue();
    // El datepicker entrega { startDate, endDate } como YYYY-MM-DD | null.
    // NestJS mantiene sus campos existentes requested_from/requested_to.
    const requestedFrom = v.dateRange?.startDate ?? '';
    const requestedTo = v.dateRange?.endDate ?? '';
    if (requestedFrom && requestedTo && requestedFrom > requestedTo) {
      this.formFilters.controls.dateRange.setErrors({ dateRange: true });
      this.formFilters.controls.dateRange.markAsTouched();
      return;
    }
    this.filters = {
      employees: sanitizeCatalogs(v.employees), status: v.status ?? null,
      requestedFrom, requestedTo,
      page: 1, limit: this.filters.limit, sorts: [...this.sorts],
    };
    this.persistFilters();
    this.loadLoans();
  }
  clearFilters(): void {
    this.sorts = [];
    this.formFilters.reset({ employees: [], status: null, dateRange: null }, { emitEvent: false });
    this.filters = {
      employees: [], status: null, requestedFrom: '', requestedTo: '',
      page: 1, limit: this.filters.limit, sorts: [],
    };
    this.storage.removeItem(FILTERS_KEY);
    this.loadLoans();
  }
  onBtnsSectionAction(action: string): void {
    if (action === 'search') this.searchWithFilters();
    if (action === 'clean') this.clearFilters();
  }
  onSortChange(event: DataTableSortEvent): void {
    const allowed = new Set(['employee_name', 'requested_on', 'disbursed_on',
      'principal_amount', 'remaining_balance', 'status', 'created_at', 'id']);
    this.sorts = event.sorts.filter((item) => allowed.has(item.key))
      .map((item) => ({ key: item.key, direction: item.direction }));
    this.filters.page = 1;
    this.filters.sorts = [...this.sorts];
    this.persistFilters();
    this.loadLoans();
  }
  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;
    this.persistFilters();
    this.loadLoans();
  }
  onHeaderAction(action: string): void {
    if (action !== 'new' || !this.auth.hasRole('PRESTAMOS_EDITOR')) return;
    this.dialogs.open(ModalLoanForm, undefined, 'medium').afterClosed()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((changed) => { if (changed === true) this.loadLoans(); });
  }
  onTableAction(event: DataTableActionEvent<LoanRow>): void {
    if (this.loadingTable() || !this.auth.hasRole('PRESTAMOS_EDITOR')) return;
    const row = event.row;
    if (event.type === 'disburse' && row.status === 'pending') {
      this.dialogs.open(ModalLoanDisburse, { loan: row }, 'small').afterClosed()
        .pipe(take(1), takeUntilDestroyed(this.destroyRef))
        .subscribe((changed) => { if (changed === true) this.loadLoans(); });
    } else if (event.type === 'cancel' && row.status === 'pending') {
      this.dialogs.open(ModalLoanReason, { loan: row }, 'small').afterClosed()
        .pipe(take(1), takeUntilDestroyed(this.destroyRef))
        .subscribe((changed) => { if (changed === true) this.loadLoans(); });
    } else if (event.type === 'repayments') {
      this.dialogs.open(ModalLoanRepayments, { loan: row }, 'large').afterClosed()
        .pipe(take(1), takeUntilDestroyed(this.destroyRef))
        .subscribe((changed) => { if (changed === true) this.loadLoans(); });
    }
  }
  private persistFilters(): void {
    this.storage.setItem(FILTERS_KEY, {
      ...this.filters,
      employees: sanitizeCatalogs(this.filters.employees),
      sorts: [...this.sorts],
    });
  }
  private restoreFilters(): void {
    const saved = this.storage.getItem<Partial<LoansUiFilters>>(FILTERS_KEY);
    if (!saved) return;
    const page = Number(saved.page);
    const limit = Number(saved.limit);
    const status = saved.status;
    this.sorts = Array.isArray(saved.sorts)
      ? saved.sorts.filter((x) => x &&
        ['employee_name', 'requested_on', 'disbursed_on', 'principal_amount', 'remaining_balance',
          'status', 'created_at', 'id'].includes(x.key) &&
        (x.direction === 'asc' || x.direction === 'desc'))
      : [];
    this.filters = {
      employees: sanitizeCatalogs(saved.employees),
      status: status === 'pending' || status === 'active' || status === 'settled' || status === 'cancelled'
        ? status : null,
      requestedFrom: typeof saved.requestedFrom === 'string' ? saved.requestedFrom : '',
      requestedTo: typeof saved.requestedTo === 'string' ? saved.requestedTo : '',
      page: Number.isSafeInteger(page) && page > 0 ? page : 1,
      limit: this.pageSizeOptions.includes(limit) ? limit : 5,
      sorts: [...this.sorts],
    };
    // Compatibilidad con los filtros persistidos de la versión anterior.
    // El almacenamiento sigue guardando requestedFrom/requestedTo para no perder datos.
    const dateRange: DateRangeValue | null =
      this.filters.requestedFrom || this.filters.requestedTo
        ? {
            startDate: this.filters.requestedFrom || null,
            endDate: this.filters.requestedTo || null,
          }
        : null;
    this.formFilters.patchValue({
      employees: this.filters.employees, status: this.filters.status,
      dateRange,
    }, { emitEvent: false });
  }
}
