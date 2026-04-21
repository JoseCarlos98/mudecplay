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
import {
  InputSelect,
  SelectCatalogOption,
} from '../../../shared/ui/input-select/input-select';
import { LocalStorageService } from '../../../shared/services/local-storage.service';
import { DialogService } from '../../../shared/services/dialog.service';

import * as entity from './interfaces/attendance-tardiness.interfaces';
import { AttendanceTardinessService } from './services/attendance-tardiness.service';
import { PaginatedResponse } from '../../../shared/interfaces/general-interfaces';
import {
  MarkAttendanceModalData,
  MarkAttendanceModalResult,
  MarkAttendanceMode,
  ModalMarkAttendance,
} from './components/modal-mark-attendance/modal-mark-attendance';

const ATTENDANCE_TARDINESS_FILTERS_KEY = 'mp_attendance_tardiness_filters_v1';

const HEADER_CONFIG: ModuleHeaderConfig = {
  showNew: false,
  showUploadXml: false,
};

const COLUMNS_CONFIG: ColumnsConfig[] = [
  { key: 'employee_name', label: 'Empleado' },
  {
    key: 'area_name',
    label: 'Área',
    type: 'chip',
    fallback: 'Sin dato',
  },
  { key: 'work_date', label: 'Fecha asistencia', type: 'date' },
  { key: 'arrival_time', label: 'Hora llegada' },
  {
    key: 'arrival_status_label',
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

const STATUS_OPTIONS: SelectCatalogOption[] = [
  { id: 'pending', name: 'Pendiente' },
  { id: 'on_time', name: 'A tiempo' },
  { id: 'tardy', name: 'Retardo' },
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
  private readonly attendanceTardinessService = inject(AttendanceTardinessService);
  private readonly dialogService = inject(DialogService);

  readonly headerConfig = HEADER_CONFIG;
  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;
  readonly statusOptions = STATUS_OPTIONS;

  areaOptions: SelectCatalogOption[] = [];

  readonly extraActions: DataTableExtraAction<entity.AttendanceTardinessRow>[] = [
    {
      type: 'markArrival',
      icon: 'how_to_reg',
      tooltip: 'Marcar llegada',
      visible: (row) => row.arrival_status === 'pending',
    },
    {
      type: 'editArrival',
      icon: 'edit_calendar',
      tooltip: 'Editar hora de llegada',
      visible: (row) => row.arrival_status !== 'pending',
    },
  ];

  filters: entity.AttendanceTardinessUiFilters = {
    workDate: this.getTodayApiDate(),
    employeeName: '',
    employeeAreaId: null,
    status: null,
    page: 1,
    limit: 5,
  };

  attendanceTableData!: PaginatedResponse<entity.AttendanceTardinessRow>;

  formFilters = this.fb.group({
    workDate: this.fb.control<string | null>(this.getTodayApiDate()),
    employeeName: this.fb.control<string>(''),
    employeeAreaId: this.fb.control<number | null>(null),
    status: this.fb.control<entity.AttendanceArrivalStatus | null>(null),
  });

  ngOnInit(): void {
    this.loadEmployeeAreasCatalog();
    this.restoreFiltersFromStorage();
  }

  private getTodayApiDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private buildBackendFiltersFromUi(
    ui: entity.AttendanceTardinessUiFilters,
  ): entity.AttendanceTardinessFilters {
    return {
      page: ui.page,
      limit: ui.limit,
      work_date: ui.workDate ?? null,
      employee_name: ui.employeeName?.trim() || null,
      employee_area_id: ui.employeeAreaId ?? null,
      arrival_status: ui.status ?? null,
    };
  }

  private mapRow(
    row: entity.EmployeeAttendanceResponseDto,
  ): entity.AttendanceTardinessRow {
    return {
      id: row.id,
      employee_id: row.employee_id,
      employee_name: row.employee_name ?? null,
      employee_area_id: row.employee_area_id ?? null,
      area_name: row.employee_area_name ?? null,
      work_date: row.work_date,
      arrival_time: row.arrival_time ?? null,
      arrival_status: row.arrival_status,
      arrival_status_label: row.arrival_status_label,
      tardiness_minutes: row.tardiness_minutes ?? null,
      tardiness_discount: row.tardiness_discount ?? null,
      tardiness_reason: row.tardiness_reason ?? null,
      daily_salary: Number(row.daily_salary_snapshot ?? 0),
    };
  }

  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();

    const uiState: entity.AttendanceTardinessUiFilters = {
      workDate: value.workDate ?? this.getTodayApiDate(),
      employeeName: value.employeeName ?? '',
      employeeAreaId: value.employeeAreaId ?? null,
      status: value.status ?? null,
      page: 1,
      limit: this.filters.limit,
    };

    this.filters = uiState;
    this.saveFiltersToStorage(uiState);
    this.loadAttendanceTardiness();
  }

  loadAttendanceTardiness(): void {
    const backendFilters = this.buildBackendFiltersFromUi(this.filters);

    this.attendanceTardinessService.getAttendances(backendFilters).subscribe({
      next: (response) => {
        const data = (response.data ?? []).map((row) => this.mapRow(row));

        this.attendanceTableData = {
          ...response,
          data,
        };
      },
      error: (err) => {
        console.error('Error al cargar llegadas y retardos:', err);
      },
    });
  }

  private loadEmployeeAreasCatalog(): void {
    this.attendanceTardinessService.getEmployeeAreasCatalog().subscribe({
      next: (rows) => {
        this.areaOptions = (rows ?? []).map((row) => ({
          id: row.id,
          name: row.name,
        }));
      },
      error: (err) => {
        console.error('Error al cargar catálogo de áreas:', err);
      },
    });
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

  onTableAction(ev: DataTableActionEvent<entity.AttendanceTardinessRow>): void {
    switch (ev.type) {
      case 'markArrival':
        this.openAttendanceModal(ev.row, 'mark');
        break;

      case 'editArrival':
        this.openAttendanceModal(ev.row, 'edit');
        break;

      case 'delete':
        console.log('Eliminar:', ev.row.id);
        break;
    }
  }

  private openAttendanceModal(
    row: entity.AttendanceTardinessRow,
    mode: MarkAttendanceMode,
  ): void {
    const modalData: MarkAttendanceModalData = {
      mode,
      id: row.id,
      employee_name: row.employee_name ?? 'Sin nombre',
      area_name: row.area_name,
      work_date: row.work_date,
      arrival_time: row.arrival_time,
      tardiness_reason: row.tardiness_reason,
      daily_salary: row.daily_salary ?? null,
    };

    this.dialogService
      .open(ModalMarkAttendance, modalData, 'mini')
      .afterClosed()
      .subscribe((result: MarkAttendanceModalResult | null) => {
        if (!result || result.action !== 'saved') return;

        this.saveArrival(row.id, result.payload);
      });
  }

  private saveArrival(
    attendanceId: number,
    payload: MarkAttendanceModalResult['payload'],
  ): void {
    this.attendanceTardinessService
      .upsertArrival(attendanceId, {
        arrival_time: payload.arrival_time,
        tardiness_reason: payload.tardiness_reason,
      })
      .subscribe({
        next: () => {
          this.loadAttendanceTardiness();
        },
        error: (err) => {
          console.error('Error al guardar llegada:', err);

          this.dialogService
            .confirm({
              title: 'Error',
              message: 'No se pudo guardar la hora de llegada.',
              confirmText: 'OK',
              cancelText: '',
            })
            .subscribe();
        },
      });
  }

  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();

    const hasEmployeeName = !!form.employeeName?.trim();
    const hasArea = form.employeeAreaId !== null && form.employeeAreaId !== undefined;
    const hasStatus = !!form.status;

    return hasEmployeeName || hasArea || hasStatus;
  }

  clearAllAndSearch(): void {
    const today = this.getTodayApiDate();

    this.formFilters.reset(
      {
        workDate: today,
        employeeName: '',
        employeeAreaId: null,
        status: null,
      },
      { emitEvent: false },
    );

    this.filters = {
      workDate: today,
      employeeName: '',
      employeeAreaId: null,
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

    const saved = this.storage.getItem<entity.AttendanceTardinessUiFilters>(
      ATTENDANCE_TARDINESS_FILTERS_KEY,
    );

    if (!saved) {
      this.formFilters.patchValue(
        {
          workDate: today,
          employeeName: '',
          employeeAreaId: null,
          status: null,
        },
        { emitEvent: false },
      );

      this.filters = {
        workDate: today,
        employeeName: '',
        employeeAreaId: null,
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
        employeeName: saved.employeeName,
        employeeAreaId: saved.employeeAreaId,
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

  private saveFiltersToStorage(state?: entity.AttendanceTardinessUiFilters): void {
    if (!state) {
      const value = this.formFilters.getRawValue();

      state = {
        workDate: value.workDate ?? this.getTodayApiDate(),
        employeeName: value.employeeName ?? '',
        employeeAreaId: value.employeeAreaId ?? null,
        status: value.status ?? null,
        page: this.filters.page,
        limit: this.filters.limit,
      };
    }

    this.storage.setItem(ATTENDANCE_TARDINESS_FILTERS_KEY, state);
  }
}