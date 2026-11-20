import { CommonModule, CurrencyPipe } from '@angular/common';

import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';

import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { catchError, finalize, Observable, of, Subscription, take } from 'rxjs';

import { ModuleHeader } from '../../../shared/ui/module-header/module-header';

import { ModuleHeaderConfig } from '../../../shared/ui/module-header/interfaces/module-header-interface';

import { InputDate } from '../../../shared/ui/input-date/input-date';

import { InputSelect, SelectCatalogOption } from '../../../shared/ui/input-select/input-select';

import { SearchMultiSelect } from '../../../shared/ui/autocomplete-multiple/autocomplete-multiple';

import { BtnsSection } from '../../../shared/ui/btns-section/btns-section';

import { DataTable } from '../../../shared/ui/data-table/data-table';

import { LoadingOverlay } from '../../../shared/ui/loading-overlay/loading-overlay';

import { DialogService } from '../../../shared/services/dialog.service';

import { AuthService } from '../../../auth/services/auth.service';

import { ModalOvertimeForm, OvertimeFormModalData } from './components/modal-overtime-form/modal-overtime-form';

import { ModalOvertime, OvertimeAuthorizeModalData, OvertimeAuthorizeModalResult } from './components/modal-overtime/modal-overtime';

import { ModalLabourExtraReason, LabourExtraReasonDialogData } from './components/modal-labour-extra-reason/modal-labour-extra-reason';

import { Catalog } from '../../../shared/interfaces/general-interfaces';


import {

  ColumnsConfig,

  ColumnVariant,

  DataTableActionEvent,

  DataTableExtraAction,

  DataTableSortEvent,

  TableActionPermissions,

} from '../../../shared/ui/data-table/interfaces/table-interfaces';

import { AttendanceTardinessService } from '../attendance-tardiness/services/attendance-tardiness.service';
import { LocalStorageService } from '../../../shared/services/local-storage.service';

import {

  AuthorizedLabourExtraDto, CancelledLabourExtraDto,

  LabourExtraRecordDto, LabourExtraStatus, ReversedLabourExtraDto,
  LabourExtraFilters, LabourExtraSortItem, LabourExtraSummary,

} from './interfaces/overtime-interfaces';

import { OvertimeService } from './services/overtime.service';

type OvertimeTab = 'overtime' | 'sunday';

type OvertimeUiFilters = {
  workDate: string;
  employee: Catalog[];
  area: number | null;
  project: Catalog[];
  status: LabourExtraStatus | null;
  page: number;
  limit: number;
  sorts: LabourExtraSortItem[];
};

/** La selección persiste como {id,name} para restaurar el texto visible. */
function sanitizeSelectedCatalogs(value: unknown): Catalog[] {
  if (!Array.isArray(value)) return [];
  const byId = new Map<number, Catalog>();
  for (const item of value) {
    const id = Number(item?.id);
    const name = typeof item?.name === 'string' ? item.name.trim() : '';
    if (Number.isSafeInteger(id) && id > 0 && name) byId.set(id, { id, name });
  }
  return [...byId.values()];
}

function catalogIds(items: Catalog[]): number[] {
  return sanitizeSelectedCatalogs(items).map((item) => Number(item.id));
}

const FILTERS_STORAGE_KEY = 'mp_labour_extra_filters_v2';
const EMPTY_SUMMARY: LabourExtraSummary = {
  pending_count: 0,
  authorized_count: 0,
  registered_count: 0,
  registered_minutes: 0,
  amount_total: 0,
};

interface OvertimeRow {

  // BIGINT: conservar string, nunca convertir a Number.

  id: string;

  kind: OvertimeTab;

  employee_name: string;

  area_label: string;

  work_date: string;

  project_name: string;

  overtime_label?: string;

  worked_until?: string;

  extra_days_label?: string;

  amount: number;

  status: LabourExtraStatus;

  status_label: string;

  authorized_by: string | null;

}

interface TableResponse<T> {

  data: T[];

  meta: { total: number };

}

// ETAPA 3: consultas, altas, autorización, cancelación y reversión reales.

const HEADER_CONFIG: ModuleHeaderConfig = {

  showNew: true,

  newRoles: ['ASISTENCIA_EDITOR'],

};

@Component({

  selector: 'app-overtime',

  standalone: true,

  imports: [

    CommonModule,

    ReactiveFormsModule,

    MatIconModule,

    MatPaginatorModule,

    CurrencyPipe,

    ModuleHeader,

    InputDate,

    SearchMultiSelect,

    InputSelect,

    BtnsSection,

    DataTable,

    LoadingOverlay,

  ],

  templateUrl: './overtime.html',

  styleUrl: './overtime.scss',

})

export class Overtime implements OnInit {

  private readonly fb = inject(FormBuilder);

  private readonly destroyRef = inject(DestroyRef);

  private readonly dialogService = inject(DialogService);

  private readonly auth = inject(AuthService);

  private readonly overtimeService = inject(OvertimeService);

  private readonly attendanceTardinessService = inject(AttendanceTardinessService);
  private readonly storage = inject(LocalStorageService);


  readonly headerConfig = HEADER_CONFIG;

  readonly activeTab = signal<OvertimeTab>('overtime');

  readonly loadingTable = signal(false);

  readonly savingAction = signal(false);

  filters: OvertimeUiFilters = {
    workDate: '', employee: [], area: null, project: [],
    status: null, page: 1, limit: 5, sorts: [],
  };
  sorts: LabourExtraSortItem[] = [];

  formFilters = this.fb.nonNullable.group({
    workDate: [''],
    employee: this.fb.nonNullable.control<Catalog[]>([]),
    area: this.fb.control<number | null>(null),
    project: this.fb.nonNullable.control<Catalog[]>([]),
    status: this.fb.control<LabourExtraStatus | null>(null),
  });

  areaOptions: SelectCatalogOption[] = [];

  readonly statusOptions: SelectCatalogOption[] = [
    { id: '', name: 'Todos' },
    { id: 'pending', name: 'Pendiente' },
    { id: 'authorized', name: 'Autorizada' },
    { id: 'cancelled', name: 'Cancelada' },
  ];

  readonly tableActionPermissions: TableActionPermissions = {

    showEdit: false,

    showDelete: false,

  };

  readonly extraActions: DataTableExtraAction<OvertimeRow>[] = [

    {

      type: 'authorize',

      icon: 'check_circle',

      tooltip: 'Autorizar',

      visible: (row) => row.status === 'pending' && this.auth.hasRole('HORAS_EXTRA_AUTORIZADOR'),

      disabled: () => this.loadingTable() || this.savingAction(),

    },

    {

      type: 'cancel',

      icon: 'cancel',

      tooltip: 'Cancelar pendiente',

      visible: (row) => row.status === 'pending' && this.auth.hasRole('ASISTENCIA_EDITOR'),

      disabled: () => this.loadingTable() || this.savingAction(),

    },

    {

      type: 'reverse',

      icon: 'undo',

      tooltip: 'Revertir autorización',

      visible: (row) => row.status === 'authorized' && this.auth.hasRole('HORAS_EXTRA_AUTORIZADOR'),

      disabled: () => this.loadingTable() || this.savingAction(),

    },

  ];

  private listSubscription?: Subscription;
  private readonly summary = signal<LabourExtraSummary>({ ...EMPTY_SUMMARY });

  overtimeTableData: TableResponse<OvertimeRow> = {
    data: [], meta: { total: 0 },
  };

  displayedColumns: string[] = [];
  columnsConfig: ColumnsConfig[] = [];

  readonly currentTitle = computed(() =>
    this.activeTab() === 'overtime' ? 'Horas extra' : 'Domingo trabajado',
  );
  readonly pendingCount = computed(() => this.summary().pending_count);
  readonly authorizedCount = computed(() => this.summary().authorized_count);
  readonly totalAmount = computed(() => this.summary().amount_total);
  readonly totalRegisteredLabel = computed(() =>
    this.activeTab() === 'sunday'
      ? String(this.summary().registered_count)
      : `${(this.summary().registered_minutes / 60).toFixed(1)} h`,
  );

  ngOnInit(): void {
    this.restoreFiltersFromStorage();
    this.setTableConfig();
    this.loadCatalogs();
    this.loadRecords();
  }

  get hasActiveFilters(): boolean {
    const raw = this.formFilters.getRawValue();
    return !!(
      raw.workDate || raw.employee.length || raw.area != null ||
      raw.project.length || raw.status || this.sorts.length
    );
  }

  /** Los filtros, el orden y la paginación se ejecutan exclusivamente en NestJS. */
  private buildBackendFilters(): LabourExtraFilters {
    return {
      page: this.filters.page,
      limit: this.filters.limit,
      ...(this.filters.workDate ? { work_date: this.filters.workDate } : {}),
      ...(catalogIds(this.filters.employee).length ? { employee_ids: catalogIds(this.filters.employee) } : {}),
      ...(this.filters.area != null ? { employee_area_id: this.filters.area } : {}),
      ...(catalogIds(this.filters.project).length ? { project_ids: catalogIds(this.filters.project) } : {}),
      ...(this.filters.status ? { status: this.filters.status } : {}),
      sorts: [...this.sorts],
    };
  }

  private loadRecords(): void {
    // Al cambiar pestañas/filtros no se permite que una respuesta vieja sobrescriba la nueva.
    this.listSubscription?.unsubscribe();
    this.loadingTable.set(true);

    const params = this.buildBackendFilters();
    const request = this.activeTab() === 'overtime'
      ? this.overtimeService.getOvertime(params)
      : this.overtimeService.getSundays(params);

    this.listSubscription = request.pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loadingTable.set(false)),
    ).subscribe({
      next: (response) => {
        const lastPage = Math.max(1, Math.ceil(response.meta.total / this.filters.limit));
        if (this.filters.page > lastPage) {
          this.filters.page = lastPage;
          this.saveFiltersToStorage();
          this.loadRecords();
          return;
        }
        this.overtimeTableData = {
          data: (response.data ?? []).map((row) => this.toRow(row)),
          meta: { total: response.meta.total },
        };
        this.summary.set({ ...EMPTY_SUMMARY, ...response.summary });
      },
      error: (error) => {
        console.error('Error consultando horas extra o domingos', error);
        this.overtimeTableData = { data: [], meta: { total: 0 } };
        this.summary.set({ ...EMPTY_SUMMARY });
        // Los errores HTTP los notifica el interceptor existente.
      },
    });
  }

  /** Solo áreas: empleado y proyecto se buscan en el catálogo remoto. */
  private loadCatalogs(): void {
    this.attendanceTardinessService.getEmployeeAreasCatalog()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error) => {
          console.warn('Catálogo de áreas no disponible', error);
          return of([] as Catalog[]);
        }),
      )
      .subscribe((areas) => {
        this.areaOptions = areas.map((item) => ({ id: item.id, name: item.name }));
      });
  }

  private toRow(item: LabourExtraRecordDto): OvertimeRow {
    const extraDays = item.extra_days_snapshot == null ? null : Number(item.extra_days_snapshot);
    const workedUntil = item.worked_until?.slice(0, 5) ?? '';
    const [hour, minute] = workedUntil.split(':').map(Number);
    const workedUntilMinutes = /^\d{2}:\d{2}$/.test(workedUntil)
      ? hour * 60 + minute : null;
    const isThreeHourPayment = item.kind === 'sunday' &&
      workedUntil === '12:00' && item.sunday_payment_choice === 'hours';
    const additionalMinutes = item.kind === 'sunday' && extraDays === 1 &&
      workedUntilMinutes !== null && workedUntilMinutes > 13 * 60 && workedUntilMinutes < 16 * 60
        ? workedUntilMinutes - 13 * 60 : 0;
    const additionalHours = Math.floor(additionalMinutes / 60);
    const remainingMinutes = additionalMinutes % 60;
    const additionalTimeLabel = [
      additionalHours > 0 ? `${additionalHours} ${additionalHours === 1 ? 'hora' : 'horas'}` : '',
      remainingMinutes > 0 ? `${remainingMinutes} min` : '',
    ].filter(Boolean).join(' ');
    const extraDaysLabel = isThreeHourPayment ? '3 horas'
      : extraDays == null || !Number.isFinite(extraDays) ? 'Sin dato'
      : additionalMinutes > 0 ? `1 día + ${additionalTimeLabel}`
      : `${extraDays.toLocaleString('es-MX', { maximumFractionDigits: 3 })} ${extraDays === 1 ? 'día extra' : 'días extra'}`;

    return {
      id: item.id, // BIGINT: sin Number().
      kind: item.kind,
      employee_name: item.employee_name ?? `Empleado #${item.employee_id}`,
      area_label: item.employee_area_name ?? 'Sin área',
      work_date: item.work_date,
      project_name: item.project_name ?? `Proyecto #${item.project_id}`,
      overtime_label: item.kind === 'overtime'
        ? `${Number(item.overtime_hours ?? 0)} h ${String(Number(item.overtime_minutes ?? 0)).padStart(2, '0')} min`
        : undefined,
      worked_until: item.worked_until?.slice(0, 5) ?? undefined,
      extra_days_label: item.kind === 'sunday' ? extraDaysLabel : undefined,
      amount: Number(item.amount_snapshot),
      status: item.status,
      status_label: this.statusLabel(item.status),
      authorized_by: item.authorized_by_user_id == null
        ? null : `Usuario #${item.authorized_by_user_id}`,
    };
  }

  private statusLabel(status: LabourExtraStatus): string {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'authorized': return 'Autorizada';
      case 'cancelled': return 'Cancelada';
    }
  }

  private saveFiltersToStorage(): void {
    this.storage.setItem(FILTERS_STORAGE_KEY, {
      tab: this.activeTab(), filters: { ...this.filters, sorts: [...this.sorts] },
    });
  }

  private restoreFiltersFromStorage(): void {
    const saved = this.storage.getItem<{ tab: OvertimeTab; filters: OvertimeUiFilters }>(
      FILTERS_STORAGE_KEY,
    );
    if (!saved || !saved.filters) return;
    if (saved.tab === 'sunday' || saved.tab === 'overtime') this.activeTab.set(saved.tab);
    const previous = saved.filters;
    const limit = [5, 10, 25, 50].includes(previous.limit) ? previous.limit : 5;
    const allowedSorts = new Set([
      'employee_name', 'area', 'work_date', 'project_name', 'overtime_minutes',
      'worked_until', 'amount', 'status', 'authorized_by',
    ]);
    this.sorts = Array.isArray(previous.sorts)
      ? previous.sorts.filter((x) => x && allowedSorts.has(x.key) &&
          (x.direction === 'asc' || x.direction === 'desc'))
      : [];
    this.filters = {
      workDate: typeof previous.workDate === 'string' ? previous.workDate : '',
      employee: sanitizeSelectedCatalogs(previous.employee),
      area: Number.isSafeInteger(Number(previous.area)) && Number(previous.area) > 0
        ? Number(previous.area) : null,
      project: sanitizeSelectedCatalogs(previous.project),
      status: previous.status === 'pending' || previous.status === 'authorized' ||
        previous.status === 'cancelled' ? previous.status : null,
      page: Number.isSafeInteger(previous.page) && previous.page > 0 ? previous.page : 1,
      limit,
      sorts: [...this.sorts],
    };
    this.formFilters.patchValue({
      workDate: this.filters.workDate, employee: [...this.filters.employee],
      area: this.filters.area, project: [...this.filters.project], status: this.filters.status,
    }, { emitEvent: false });
  }

  onHeaderAction(action: string): void {

    if (action !== 'new') return;

    if (this.savingAction() || this.loadingTable()) return;

    if (!this.auth.hasRole('ASISTENCIA_EDITOR')) {

      return;

    }

    const kind = this.activeTab();

    const date = new Date();

    if (kind === 'sunday') {

      // Selecciona el domingo más reciente, incluido hoy.

      date.setDate(date.getDate() - date.getDay());

    }

    const defaultDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const data: OvertimeFormModalData = { kind, defaultDate };

    this.dialogService.open(ModalOvertimeForm, data, 'medium')

      .afterClosed()

      .pipe(take(1), takeUntilDestroyed(this.destroyRef))

      .subscribe((created: boolean | null) => {

        if (created === true) this.loadRecords();

      });

  }

  onBtnsSectionAction(action: string): void {
    if (action === 'search') this.searchWithFilters();
    else if (action === 'clean') this.clearFilters();
  }

  private searchWithFilters(): void {
    const value = this.formFilters.getRawValue();
    this.filters = {
      workDate: value.workDate, employee: sanitizeSelectedCatalogs(value.employee),
      area: value.area, project: sanitizeSelectedCatalogs(value.project), status: value.status,
      page: 1, limit: this.filters.limit, sorts: [...this.sorts],
    };
    this.saveFiltersToStorage();
    this.loadRecords();
  }

  setActiveTab(tab: OvertimeTab): void {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    this.sorts = [];
    this.formFilters.reset({
      workDate: '', employee: [], area: null, project: [], status: null,
    });
    this.filters = {
      workDate: '', employee: [], area: null, project: [],
      status: null, page: 1, limit: this.filters.limit, sorts: [],
    };
    this.setTableConfig();
    this.saveFiltersToStorage();
    this.loadRecords();
  }

  clearFilters(): void {
    this.sorts = [];
    this.formFilters.reset({
      workDate: '', employee: [], area: null, project: [], status: null,
    });
    this.filters = {
      workDate: '', employee: [], area: null, project: [],
      status: null, page: 1, limit: this.filters.limit, sorts: [],
    };
    this.saveFiltersToStorage();
    this.loadRecords();
  }

  onSortChange(event: DataTableSortEvent): void {
    this.sorts = [...event.sorts];
    this.filters.page = 1;
    this.filters.sorts = [...this.sorts];
    this.saveFiltersToStorage();
    this.loadRecords();
  }

  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;
    this.saveFiltersToStorage();
    this.loadRecords();
  }

  onTableAction(event: DataTableActionEvent<OvertimeRow>): void {

    if (this.savingAction() || this.loadingTable()) return;

    switch (event.type) {

      case 'authorize':

        this.openAuthorizeModal(event.row);

        break;

      case 'cancel':

        this.openReasonModal(event.row, 'cancel');

        break;

      case 'reverse':

        this.openReasonModal(event.row, 'reverse');

        break;

    }

  }

  private openAuthorizeModal(row: OvertimeRow): void {

    if (row.status !== 'pending' || !this.auth.hasRole('HORAS_EXTRA_AUTORIZADOR')) return;

    const data: OvertimeAuthorizeModalData = {

      id: row.id,

      kind: row.kind,

      employee_name: row.employee_name,

      area_label: row.area_label,

      work_date: row.work_date,

      project_name: row.project_name,

      overtime_label: row.overtime_label ?? null,

      worked_until: row.worked_until ?? null,

      extra_days_label: row.extra_days_label ?? null,

      amount: row.amount,

      authorized_by: row.authorized_by,

    };

    this.dialogService.open(ModalOvertime, data, 'mini')

      .afterClosed()

      .pipe(take(1), takeUntilDestroyed(this.destroyRef))

      .subscribe((result: OvertimeAuthorizeModalResult | null) => {

        if (result?.action !== 'authorized' || result.payload.id !== row.id) return;

        // No se envía authorization_note: el endpoint actual no recibe ese campo.

        const request: Observable<AuthorizedLabourExtraDto> = row.kind === 'overtime'

          ? this.overtimeService.authorizeOvertime(row.id)

          : this.overtimeService.authorizeSunday(row.id);

        this.runMutation(request);

      });

  }

  private openReasonModal(row: OvertimeRow, action: 'cancel' | 'reverse'): void {

    const requiredRole = action === 'cancel' ? 'ASISTENCIA_EDITOR' : 'HORAS_EXTRA_AUTORIZADOR';

    const requiredStatus: LabourExtraStatus = action === 'cancel' ? 'pending' : 'authorized';

    if (!this.auth.hasRole(requiredRole) || row.status !== requiredStatus) return;

    const data: LabourExtraReasonDialogData = {

      action,

      kind: row.kind,

      employeeName: row.employee_name,

      workDate: row.work_date,

      amount: row.amount,

    };

    this.dialogService.open(ModalLabourExtraReason, data, 'small')

      .afterClosed()

      .pipe(take(1), takeUntilDestroyed(this.destroyRef))

      .subscribe((reason: string | null) => {

        if (typeof reason !== 'string' || reason.trim().length < 5 || reason.trim().length > 255) return;

        const trimmedReason = reason.trim();

        if (action === 'cancel') {

          const request: Observable<CancelledLabourExtraDto> = row.kind === 'overtime'

            ? this.overtimeService.cancelPendingOvertime(row.id, trimmedReason)

            : this.overtimeService.cancelPendingSunday(row.id, trimmedReason);

          this.runMutation(request);

        } else {

          const request: Observable<ReversedLabourExtraDto> = row.kind === 'overtime'

            ? this.overtimeService.reverseOvertime(row.id, trimmedReason)

            : this.overtimeService.reverseSunday(row.id, trimmedReason);

          this.runMutation(request);

        }

      });

  }

  private runMutation(request: Observable<unknown>): void {

    if (this.savingAction() || this.loadingTable()) return;

    this.savingAction.set(true);

    request.pipe(

      take(1),

      takeUntilDestroyed(this.destroyRef),

      finalize(() => this.savingAction.set(false)),

    ).subscribe({

      next: () => {

        // La respuesta exitosa la notifica AuthInterceptor.

        // Recargar los datos reales desde NestJS.

        this.loadRecords();

      },

      error: (error) => {

        console.error(

          'Error al actualizar horas extra o domingo trabajado',

          error,

        );

        // AuthInterceptor ya muestra los errores HTTP.

        if (error?.status === 409) {

          this.loadRecords();

        }

      },

    });

  }

  private resolveStatusVariant(row: OvertimeRow): ColumnVariant {

    switch (row.status) {

      case 'pending': return 'chip-warning';

      case 'authorized': return 'chip-success';

      case 'cancelled': return 'chip-danger';

    }

  }

  private setTableConfig(): void {

    if (this.activeTab() === 'overtime') {

      this.displayedColumns = [

        'employee_name', 'area_label', 'work_date', 'project_name',

        'overtime_label', 'amount', 'status_label', 'authorized_by', 'actions',

      ];

      this.columnsConfig = [

        { key: 'employee_name', label: 'Empleado', sortable: true, sortKey: 'employee_name' },

        { key: 'area_label', label: 'Área', type: 'chip', typeVariant: 'chip-neutral', sortable: true, sortKey: 'area' },

        { key: 'work_date', label: 'Fecha', type: 'date', sortable: true, sortKey: 'work_date' },

        { key: 'project_name', label: 'Proyecto', sortable: true, sortKey: 'project_name' },

        { key: 'overtime_label', label: 'Horas extra', sortable: true, sortKey: 'overtime_minutes' },

        { key: 'amount', label: 'Importe', type: 'money', align: 'right', sortable: true, sortKey: 'amount' },

        {

          key: 'status_label', label: 'Estatus', type: 'chip',

          variantResolver: (row: OvertimeRow) => this.resolveStatusVariant(row),
          sortable: true, sortKey: 'status',

        },

        { key: 'authorized_by', label: 'Autorizó', fallback: '—', sortable: true, sortKey: 'authorized_by' },

      ];

    } else {

      this.displayedColumns = [

        'employee_name', 'area_label', 'work_date', 'project_name',

        'worked_until', 'extra_days_label', 'amount', 'status_label', 'authorized_by', 'actions',

      ];

      this.columnsConfig = [

        { key: 'employee_name', label: 'Empleado', sortable: true, sortKey: 'employee_name' },

        { key: 'area_label', label: 'Área', type: 'chip', typeVariant: 'chip-neutral', sortable: true, sortKey: 'area' },

        { key: 'work_date', label: 'Fecha', type: 'date', sortable: true, sortKey: 'work_date' },

        { key: 'project_name', label: 'Proyecto', sortable: true, sortKey: 'project_name' },

        { key: 'worked_until', label: 'Trabajó hasta', sortable: true, sortKey: 'worked_until' },

        { key: 'extra_days_label', label: 'Tiempo pagado' },

        { key: 'amount', label: 'Importe', type: 'money', align: 'right', sortable: true, sortKey: 'amount' },

        {

          key: 'status_label', label: 'Estatus', type: 'chip',

          variantResolver: (row: OvertimeRow) => this.resolveStatusVariant(row),
          sortable: true, sortKey: 'status',

        },

        { key: 'authorized_by', label: 'Autorizó', fallback: '—', sortable: true, sortKey: 'authorized_by' },

      ];

    }

  }

}
