import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { InputDate } from '../../../shared/ui/input-date/input-date';
import { ModuleHeaderConfig } from '../../../shared/ui/module-header/interfaces/module-header-interface';
import {
  ColumnsConfig,
  DataTableActionEvent,
  DataTableExtraAction,
} from '../../../shared/ui/data-table/interfaces/table-interfaces';
import { ModuleHeader } from '../../../shared/ui/module-header/module-header';
import { DataTable } from '../../../shared/ui/data-table/data-table';
import { BtnsSection } from '../../../shared/ui/btns-section/btns-section';
import { InputField } from '../../../shared/ui/input-field/input-field';
import { InputSelect, SelectCatalogOption } from '../../../shared/ui/input-select/input-select';
import { LocalStorageService } from '../../../shared/services/local-storage.service';
import { ModalMarkAttendance } from './components/modal-mark-attendance/modal-mark-attendance';
import { DialogService } from '../../../shared/services/dialog.service';

const ATTENDANCE_TARDINESS_FILTERS_KEY = 'mp_attendance_tardiness_filters_v1';

type ArrivalStatus = 'Pendiente' | 'A tiempo' | 'Retardo';

interface AttendanceTardinessRow {
  id: number;
  employee_name: string;
  area_name: string | null;
  work_date: string;
  arrival_time: string | null;
  arrival_status: ArrivalStatus;
  tardiness_minutes: number | null;
  tardiness_discount: number | null;
  tardiness_reason: string | null;
}

interface AttendanceTardinessUiFilters {
  workDate: string | null;
  employeeQuery: string;
  areaName: string | null;
  status: ArrivalStatus | null;
  page: number;
  limit: number;
}

interface PaginatedLocalResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const HEADER_CONFIG: ModuleHeaderConfig = {
  showNew: false,
  showUploadXml: false,
};

const COLUMNS_CONFIG: ColumnsConfig[] = [
  { key: 'employee_name', label: 'Empleado' },
  { key: 'area_name', label: 'Área', type: 'chip', fallback: 'No asignado', fallbackVariant: 'chip-warning', },
  { key: 'work_date', label: 'Fecha asistencia', type: 'date' },
  { key: 'arrival_time', label: 'Hora llegada' },
  {
    key: 'arrival_status',
    label: 'Estatus llegada',
    type: 'chip',
    typeVariant: 'chip-neutral',
  },
  { key: 'tardiness_minutes', label: 'Min. retardo', align: 'center' },
  {
    key: 'tardiness_discount',
    label: 'Descuento',
    type: 'money',
    align: 'right',
  },
  { key: 'tardiness_reason', label: 'Motivo retardo' },
];

const DISPLAYED_COLUMNS: string[] = [...COLUMNS_CONFIG.map((c) => c.key), 'actions'];

const AREA_OPTIONS: SelectCatalogOption[] = [
  { id: 'Carpinteros', name: 'Carpinteros' },
  { id: 'Barnizadores', name: 'Barnizadores' },
  { id: 'Pintores', name: 'Pintores' },
  { id: 'Jardineros', name: 'Jardineros' },
  { id: 'Choferes', name: 'Choferes' },
  { id: 'Arquitectos', name: 'Arquitectos' },
  { id: 'Ingenieros', name: 'Ingenieros' },
  { id: 'Administrativos', name: 'Administrativos' },
  { id: 'Eléctricos', name: 'Eléctricos' },
  { id: 'Plomeros', name: 'Plomeros' },
  { id: 'Técnicos', name: 'Técnicos' },
];

const STATUS_OPTIONS: SelectCatalogOption[] = [
  { id: 'Pendiente', name: 'Pendiente' },
  { id: 'A tiempo', name: 'A tiempo' },
  { id: 'Retardo', name: 'Retardo' },
];

const DUMMY_DATA: AttendanceTardinessRow[] = [
  {
    id: 1,
    employee_name: 'Juan Pérez',
    area_name: null,
    work_date: '2026-04-19',
    arrival_time: null,
    arrival_status: 'Pendiente',
    tardiness_minutes: null,
    tardiness_discount: null,
    tardiness_reason: null,
  },
  {
    id: 2,
    employee_name: 'Luis Ramos',
    area_name: 'Pintores',
    work_date: '2026-04-19',
    arrival_time: '08:06',
    arrival_status: 'A tiempo',
    tardiness_minutes: 0,
    tardiness_discount: 0,
    tardiness_reason: null,
  },
  {
    id: 3,
    employee_name: 'Miguel Castro',
    area_name: 'Eléctricos',
    work_date: '2026-04-19',
    arrival_time: '08:17',
    arrival_status: 'Retardo',
    tardiness_minutes: 17,
    tardiness_discount: 89.25,
    tardiness_reason: 'Tráfico',
  },
  {
    id: 4,
    employee_name: 'José Hernández',
    area_name: 'Choferes',
    work_date: '2026-04-19',
    arrival_time: null,
    arrival_status: 'Pendiente',
    tardiness_minutes: null,
    tardiness_discount: null,
    tardiness_reason: null,
  },
  {
    id: 5,
    employee_name: 'Carlos Soto',
    area_name: 'Plomeros',
    work_date: '2026-04-18',
    arrival_time: '08:10',
    arrival_status: 'A tiempo',
    tardiness_minutes: 0,
    tardiness_discount: 0,
    tardiness_reason: null,
  },
  {
    id: 6,
    employee_name: 'Marco Ibarra',
    area_name: 'Técnicos',
    work_date: '2026-04-18',
    arrival_time: '08:24',
    arrival_status: 'Retardo',
    tardiness_minutes: 24,
    tardiness_discount: 126.5,
    tardiness_reason: 'Ponchadura',
  },
  {
    id: 7,
    employee_name: 'Pedro López',
    area_name: 'Jardineros',
    work_date: '2026-04-18',
    arrival_time: null,
    arrival_status: 'Pendiente',
    tardiness_minutes: null,
    tardiness_discount: null,
    tardiness_reason: null,
  },
];

@Component({
  selector: 'app-attendance-tardiness',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModuleHeader,
    DataTable,
    BtnsSection,
    InputDate,
    InputField,
    InputSelect,
    MatPaginatorModule,
  ],
  templateUrl: './attendance-tardiness.html',
  styleUrl: './attendance-tardiness.scss',
})
export class AttendanceTardiness implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly storage = inject(LocalStorageService);
  private readonly dialogService = inject(DialogService);

  readonly headerConfig = HEADER_CONFIG;
  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;

  readonly areaOptions = AREA_OPTIONS;
  readonly statusOptions = STATUS_OPTIONS;

  readonly extraActions: DataTableExtraAction<AttendanceTardinessRow>[] = [
    {
      type: 'markArrival',
      icon: 'how_to_reg',
      tooltip: 'Marcar llegada',
      visible: (row) => row.arrival_status === 'Pendiente',
    },
    {
      type: 'editArrival',
      icon: 'edit_calendar',
      tooltip: 'Editar hora de llegada',
      visible: (row) => row.arrival_status !== 'Pendiente',
    },
  ];

  filters: AttendanceTardinessUiFilters = {
    workDate: this.getTodayApiDate(),
    employeeQuery: '',
    areaName: null,
    status: null,
    page: 1,
    limit: 5,
  };

  attendanceTableData!: PaginatedLocalResponse<AttendanceTardinessRow>;

  formFilters = this.fb.group({
    workDate: this.fb.control<string | null>(this.getTodayApiDate()),
    employeeQuery: this.fb.control<string>(''),
    areaName: this.fb.control<string | null>(null),
    status: this.fb.control<ArrivalStatus | null>(null),
  });

  ngOnInit(): void {
    this.restoreFiltersFromStorage();
  }

  private getTodayApiDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();

    const uiState: AttendanceTardinessUiFilters = {
      workDate: value.workDate ?? this.getTodayApiDate(),
      employeeQuery: value.employeeQuery ?? '',
      areaName: value.areaName ?? null,
      status: value.status ?? null,
      page: 1,
      limit: this.filters.limit,
    };

    this.filters = uiState;
    this.saveFiltersToStorage(uiState);
    this.loadAttendanceTardiness();
  }

  loadAttendanceTardiness(): void {
    let filtered = [...DUMMY_DATA];

    const workDate = this.filters.workDate;
    const employeeQuery = this.filters.employeeQuery.trim().toLowerCase();
    const areaName = this.filters.areaName;
    const status = this.filters.status;

    if (workDate) {
      filtered = filtered.filter((row) => row.work_date === workDate);
    }

    if (employeeQuery) {
      filtered = filtered.filter((row) =>
        row.employee_name.toLowerCase().includes(employeeQuery),
      );
    }

    if (areaName) {
      filtered = filtered.filter((row) => row.area_name === areaName);
    }

    if (status) {
      filtered = filtered.filter((row) => row.arrival_status === status);
    }

    const total = filtered.length;
    const start = (this.filters.page - 1) * this.filters.limit;
    const end = start + this.filters.limit;
    const paginatedData = filtered.slice(start, end);

    this.attendanceTableData = {
      data: paginatedData,
      meta: {
        total,
        page: this.filters.page,
        limit: this.filters.limit,
        totalPages: Math.max(Math.ceil(total / this.filters.limit), 1),
      },
    };
  }

  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;

    this.saveFiltersToStorage();
    this.loadAttendanceTardiness();
  }

  onHeaderAction(action: string): void {
    console.log('Header action:', action);
  }

  onBtnsSectionAction(action: string): void {
    switch (action) {
      case 'search':
        this.searchWithFilters();
        break;
      case 'clean':
        this.clearAllAndSearch();
        break;
    }
  }

  onTableAction(ev: DataTableActionEvent<AttendanceTardinessRow>): void {
    console.log('Table action:', ev);

    switch (ev.type) {
      case 'markArrival':
        this.openMarkAttendanceModal(ev.row);
        break;

      case 'editArrival':
        console.log('Editar llegada de:', ev.row.employee_name);
        break;

      case 'delete':
        console.log('Eliminar:', ev.row.id);
        break;
    }
  }

  private openMarkAttendanceModal(row: AttendanceTardinessRow): void {
    this.dialogService
      .open(ModalMarkAttendance, row, 'mini')
      .afterClosed()
      .subscribe((result) => {
        if (!result || result.action !== 'saved') return;

        console.log('Payload modal marcar llegada:', result.payload);

        // aquí después llamas al servicio real
        // y al guardar:
        // this.loadAttendanceTardiness();
      });
  }

  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();

    const hasEmployeeQuery = !!form.employeeQuery?.trim();
    const hasArea = !!form.areaName;
    const hasStatus = !!form.status;

    return hasEmployeeQuery || hasArea || hasStatus;
  }

  clearAllAndSearch(): void {
    const today = this.getTodayApiDate();

    this.formFilters.reset(
      {
        workDate: today,
        employeeQuery: '',
        areaName: null,
        status: null,
      },
      { emitEvent: false },
    );

    this.filters = {
      workDate: today,
      employeeQuery: '',
      areaName: null,
      status: null,
      page: 1,
      limit: this.filters.limit,
    };

    this.storage.removeItem(ATTENDANCE_TARDINESS_FILTERS_KEY);
    this.saveFiltersToStorage(this.filters);
    this.loadAttendanceTardiness();
  }

  private restoreFiltersFromStorage(): void {
    const today = this.getTodayApiDate();

    const saved = this.storage.getItem<AttendanceTardinessUiFilters>(
      ATTENDANCE_TARDINESS_FILTERS_KEY,
    );

    if (!saved) {
      this.formFilters.patchValue(
        {
          workDate: today,
          employeeQuery: '',
          areaName: null,
          status: null,
        },
        { emitEvent: false },
      );

      this.filters = {
        workDate: today,
        employeeQuery: '',
        areaName: null,
        status: null,
        page: 1,
        limit: this.filters.limit,
      };

      this.saveFiltersToStorage(this.filters);
      this.loadAttendanceTardiness();
      return;
    }

    this.formFilters.patchValue(
      {
        workDate: saved.workDate ?? today,
        employeeQuery: saved.employeeQuery,
        areaName: saved.areaName,
        status: saved.status,
      },
      { emitEvent: false },
    );

    this.filters = {
      ...saved,
      workDate: saved.workDate ?? today,
    };

    this.loadAttendanceTardiness();
  }

  private saveFiltersToStorage(state?: AttendanceTardinessUiFilters): void {
    if (!state) {
      const value = this.formFilters.getRawValue();

      state = {
        workDate: value.workDate ?? this.getTodayApiDate(),
        employeeQuery: value.employeeQuery ?? '',
        areaName: value.areaName ?? null,
        status: value.status ?? null,
        page: this.filters.page,
        limit: this.filters.limit,
      };
    }

    this.storage.setItem(ATTENDANCE_TARDINESS_FILTERS_KEY, state);
  }
}