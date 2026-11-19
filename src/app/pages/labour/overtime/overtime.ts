import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { catchError, finalize, forkJoin, Observable, of, take } from 'rxjs';

import { ModuleHeader } from '../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../shared/ui/module-header/interfaces/module-header-interface';
import { InputDate } from '../../../shared/ui/input-date/input-date';
import { InputSelect, SelectCatalogOption } from '../../../shared/ui/input-select/input-select';
import { InputField } from '../../../shared/ui/input-field/input-field';
import { BtnsSection } from '../../../shared/ui/btns-section/btns-section';
import { DataTable } from '../../../shared/ui/data-table/data-table';
import { LoadingOverlay } from '../../../shared/ui/loading-overlay/loading-overlay';
import { DialogService } from '../../../shared/services/dialog.service';
import { AuthService } from '../../../auth/services/auth.service';
import { ModalOvertimeForm, OvertimeFormModalData } from './components/modal-overtime-form/modal-overtime-form';
import { ModalOvertime, OvertimeAuthorizeModalData, OvertimeAuthorizeModalResult } from './components/modal-overtime/modal-overtime';
import { ModalLabourExtraReason, LabourExtraReasonDialogData } from './components/modal-labour-extra-reason/modal-labour-extra-reason';
import { Catalog } from '../../../shared/interfaces/general-interfaces';
import { CatalogsService } from '../../../shared/services/catalogs.service';
import {
  ColumnsConfig,
  ColumnVariant,
  DataTableActionEvent,
  DataTableExtraAction,
  TableActionPermissions,
} from '../../../shared/ui/data-table/interfaces/table-interfaces';

import { EmployeesService } from '../employees/services/employees.service';
import { DailyAssistanceService } from '../daily-assistance/services/daily-assistance.service';
import { EmployeeAttendanceCatalogRow } from '../daily-assistance/interfaces/daily-assistance-interfaces';
import {
  AuthorizedLabourExtraDto, CancelledLabourExtraDto,
  LabourExtraRecordDto, LabourExtraStatus, ReversedLabourExtraDto,
} from './interfaces/overtime-interfaces';
import { OvertimeService } from './services/overtime.service';

type OvertimeTab = 'overtime' | 'sunday';

type OvertimeFilters = {
  workDate: string;
  employeeName: string;
  area: string;
  project: string;
  status: string;
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
    InputField,
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
  private readonly employeesService = inject(EmployeesService);
  private readonly dailyAssistanceService = inject(DailyAssistanceService);
  private readonly catalogsService = inject(CatalogsService);

  readonly headerConfig = HEADER_CONFIG;
  readonly activeTab = signal<OvertimeTab>('overtime');
  readonly loadingTable = signal(false);
  readonly savingAction = signal(false);

  filters = { page: 1, limit: 5 };

  // Una fecha fija de abril de 2026 impediría ver los registros recientes.
  formFilters = this.fb.nonNullable.group({
    workDate: [''],
    employeeName: [''],
    area: [''],
    project: [''],
    status: [''],
  });

  private readonly appliedFilters = signal<OvertimeFilters>({
    workDate: '',
    employeeName: '',
    area: '',
    project: '',
    status: '',
  });

  areaOptions: SelectCatalogOption[] = [];
  projectOptions: SelectCatalogOption[] = [];

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

  private readonly overtimeRows = signal<OvertimeRow[]>([]);
  private readonly sundayRows = signal<OvertimeRow[]>([]);

  overtimeTableData: TableResponse<OvertimeRow> = {
    data: [],
    meta: { total: 0 },
  };

  displayedColumns: string[] = [];
  columnsConfig: ColumnsConfig[] = [];

  readonly currentTitle = computed(() =>
    this.activeTab() === 'overtime' ? 'Horas extra' : 'Domingo trabajado',
  );

  readonly filteredRows = computed(() => {
    const filters = this.appliedFilters();
    const term = filters.employeeName.trim().toLocaleLowerCase('es-MX');
    const source = this.activeTab() === 'overtime'
      ? this.overtimeRows()
      : this.sundayRows();

    return source.filter((row) =>
      (!filters.workDate || row.work_date === filters.workDate) &&
      (!term || row.employee_name.toLocaleLowerCase('es-MX').includes(term)) &&
      (!filters.area || row.area_label === filters.area) &&
      (!filters.project || row.project_name === filters.project) &&
      (!filters.status || row.status === filters.status),
    );
  });

  readonly pendingCount = computed(() =>
    this.filteredRows().filter((row) => row.status === 'pending').length,
  );

  readonly authorizedCount = computed(() =>
    this.filteredRows().filter((row) => row.status === 'authorized').length,
  );

  readonly totalAmount = computed(() =>
    this.filteredRows()
      .filter((row) => row.status !== 'cancelled')
      .reduce((total, row) => total + row.amount, 0),
  );

  readonly totalRegisteredLabel = computed(() => {
    const rows = this.filteredRows();
    if (this.activeTab() === 'sunday') return String(rows.length);

    const minutes = rows.reduce((sum, row) => {
      const match = row.overtime_label?.match(/(\d+)\s*h\s*(\d+)\s*min/i);
      return sum + (match ? Number(match[1]) * 60 + Number(match[2]) : 0);
    }, 0);
    return `${(minutes / 60).toFixed(1)} h`;
  });

  ngOnInit(): void {
    this.setTableConfig();
    this.loadRecords();
  }

  get hasActiveFilters(): boolean {
    const raw = this.formFilters.getRawValue();
    return !!(
      raw.workDate || raw.employeeName.trim() || raw.area || raw.project || raw.status
    );
  }

  /** Lectura de máximo 100 registros por tipo; la API todavía no pagina. */
  private loadRecords(): void {
    if (this.loadingTable()) return;
    this.loadingTable.set(true);

    forkJoin({
      overtime: this.overtimeService.getOvertime().pipe(
        catchError((error) => {
          console.error('Error consultando horas extra', error);
          return of([] as LabourExtraRecordDto[]);
        }),
      ),
      sundays: this.overtimeService.getSundays().pipe(
        catchError((error) => {
          console.error('Error consultando domingos', error);
          return of([] as LabourExtraRecordDto[]);
        }),
      ),
      employees: this.employeesService.getCatalog().pipe(
        catchError((error) => {
          console.warn('Catálogo de empleados no disponible', error);
          return of([] as Catalog[]);
        }),
      ),
      attendanceEmployees: this.dailyAssistanceService.getAttendanceEmployees('').pipe(
        catchError((error) => {
          console.warn('Áreas de empleados no disponibles', error);
          return of([] as EmployeeAttendanceCatalogRow[]);
        }),
      ),
      projects: this.catalogsService.projectsCatalog('').pipe(
        catchError((error) => {
          console.warn('Catálogo de proyectos no disponible', error);
          return of([] as Catalog[]);
        }),
      ),
    })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loadingTable.set(false)))
      .subscribe({
        next: ({ overtime, sundays, employees, attendanceEmployees, projects }) => {
          const employeeNames = new Map(
            employees.map((item) => [Number(item.id), item.name]),
          );
          const areas = new Map(
            attendanceEmployees.map((item) => [Number(item.id), item.employee_area_name ?? 'Sin área']),
          );
          const projectNames = new Map(
            projects.map((item) => [Number(item.id), item.name]),
          );

          const toRow = (item: LabourExtraRecordDto): OvertimeRow => {
            const extraDays = item.extra_days_snapshot == null
              ? null
              : Number(item.extra_days_snapshot);

            const workedUntil = item.worked_until?.slice(0, 5) ?? '';

            const [hour, minute] = workedUntil.split(':').map(Number);

            const workedUntilMinutes = /^\d{2}:\d{2}$/.test(workedUntil)
              ? hour * 60 + minute
              : null;

            const isThreeHourPayment =
              item.kind === 'sunday' &&
              workedUntil === '12:00' &&
              item.sunday_payment_choice === 'hours';

            // Después de las 13:00 se pagan horas adicionales al día completo.
            const additionalMinutes =
              item.kind === 'sunday' &&
                extraDays === 1 &&
                workedUntilMinutes !== null &&
                workedUntilMinutes > 13 * 60 &&
                workedUntilMinutes < 16 * 60
                ? workedUntilMinutes - 13 * 60
                : 0;

            const additionalHours = Math.floor(additionalMinutes / 60);
            const remainingMinutes = additionalMinutes % 60;

            const additionalTimeLabel = [
              additionalHours > 0
                ? `${additionalHours} ${additionalHours === 1 ? 'hora' : 'horas'}`
                : '',
              remainingMinutes > 0 ? `${remainingMinutes} min` : '',
            ]
              .filter(Boolean)
              .join(' ');

            const extraDaysLabel = isThreeHourPayment
              ? '3 horas'
              : extraDays == null || !Number.isFinite(extraDays)
                ? 'Sin dato'
                : additionalMinutes > 0
                  ? `1 día + ${additionalTimeLabel}`
                  : `${extraDays.toLocaleString('es-MX', {
                    maximumFractionDigits: 3,
                  })} ${extraDays === 1 ? 'día extra' : 'días extra'}`;


            return {
              id: item.id,
              kind: item.kind,
              employee_name: employeeNames.get(item.employee_id) ?? `Empleado #${item.employee_id}`,
              area_label: areas.get(item.employee_id) ?? 'Sin área',
              work_date: item.work_date,
              project_name: projectNames.get(item.project_id) ?? `Proyecto #${item.project_id}`,
              overtime_label: item.kind === 'overtime'
                ? `${Number(item.overtime_hours ?? 0)} h ${String(Number(item.overtime_minutes ?? 0)).padStart(2, '0')} min`
                : undefined,
              worked_until: item.worked_until?.slice(0, 5) ?? undefined,
              extra_days_label: item.kind === 'sunday' ? extraDaysLabel : undefined,
              amount: Number(item.amount_snapshot),
              status: item.status,
              status_label: this.statusLabel(item.status),
              authorized_by: item.authorized_by_user_id == null
                ? null
                : `Usuario #${item.authorized_by_user_id}`,
            };
          };

          this.overtimeRows.set(overtime.map(toRow));
          this.sundayRows.set(sundays.map(toRow));
          this.updateFilterOptions();
          this.refreshTable();

        },
        error: (error) => {
          console.error('Error inesperado al cargar horas extra y domingos', error);
        },
      });
  }

  private statusLabel(status: LabourExtraStatus): string {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'authorized': return 'Autorizada';
      case 'cancelled': return 'Cancelada';
    }
  }

  private updateFilterOptions(): void {
    const rows = [...this.overtimeRows(), ...this.sundayRows()];
    this.areaOptions = [...new Set(rows.map((row) => row.area_label))]
      .sort((a, b) => a.localeCompare(b, 'es-MX'))
      .map((name) => ({ id: name, name }));
    this.projectOptions = [...new Set(rows.map((row) => row.project_name))]
      .sort((a, b) => a.localeCompare(b, 'es-MX'))
      .map((name) => ({ id: name, name }));
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
    if (action === 'search') {
      this.appliedFilters.set(this.formFilters.getRawValue());
      this.filters.page = 1;
      this.refreshTable();
    } else if (action === 'clean') {
      this.clearFilters();
    }
  }

  setActiveTab(tab: OvertimeTab): void {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    this.filters.page = 1;
    this.formFilters.reset({ workDate: '', employeeName: '', area: '', project: '', status: '' });
    this.appliedFilters.set(this.formFilters.getRawValue());
    this.setTableConfig();
    this.refreshTable();
  }

  clearFilters(): void {
    this.formFilters.reset({ workDate: '', employeeName: '', area: '', project: '', status: '' });
    this.appliedFilters.set(this.formFilters.getRawValue());
    this.filters.page = 1;
    this.refreshTable();
  }

  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;
    this.refreshTable();
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
        { key: 'employee_name', label: 'Empleado' },
        { key: 'area_label', label: 'Área', type: 'chip', typeVariant: 'chip-neutral' },
        { key: 'work_date', label: 'Fecha', type: 'date' },
        { key: 'project_name', label: 'Proyecto' },
        { key: 'overtime_label', label: 'Horas extra' },
        { key: 'amount', label: 'Importe', type: 'money', align: 'right' },
        {
          key: 'status_label', label: 'Estatus', type: 'chip',
          variantResolver: (row: OvertimeRow) => this.resolveStatusVariant(row),
        },
        { key: 'authorized_by', label: 'Autorizó', fallback: '—' },
      ];
    } else {
      this.displayedColumns = [
        'employee_name', 'area_label', 'work_date', 'project_name',
        'worked_until', 'extra_days_label', 'amount', 'status_label', 'authorized_by', 'actions',
      ];
      this.columnsConfig = [
        { key: 'employee_name', label: 'Empleado' },
        { key: 'area_label', label: 'Área', type: 'chip', typeVariant: 'chip-neutral' },
        { key: 'work_date', label: 'Fecha', type: 'date' },
        { key: 'project_name', label: 'Proyecto' },
        { key: 'worked_until', label: 'Trabajó hasta' },
        { key: 'extra_days_label', label: 'Tiempo pagado' },
        { key: 'amount', label: 'Importe', type: 'money', align: 'right' },
        {
          key: 'status_label', label: 'Estatus', type: 'chip',
          variantResolver: (row: OvertimeRow) => this.resolveStatusVariant(row),
        },
        { key: 'authorized_by', label: 'Autorizó', fallback: '—' },
      ];
    }
  }

  private refreshTable(): void {
    const rows = this.filteredRows();
    const start = (this.filters.page - 1) * this.filters.limit;
    this.overtimeTableData = {
      data: rows.slice(start, start + this.filters.limit),
      meta: { total: rows.length },
    };
  }
}
