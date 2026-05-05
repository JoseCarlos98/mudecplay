import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

// Angular Material
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

// Shared UI
import { ColumnsConfig, ColumnVariant, DataTableActionEvent } from '../../../shared/ui/data-table/interfaces/table-interfaces';
import { ModuleHeaderConfig } from '../../../shared/ui/module-header/interfaces/module-header-interface';
import { ModuleHeader } from '../../../shared/ui/module-header/module-header';
import { DataTable } from '../../../shared/ui/data-table/data-table';
import { InputField } from '../../../shared/ui/input-field/input-field';
import { InputSelect } from '../../../shared/ui/input-select/input-select';
import { HasRoleDirective } from '../../../auth/directives/has-role.directive';
import { BtnsSection } from '../../../shared/ui/btns-section/btns-section';
import { Catalog, PaginatedResponse } from '../../../shared/interfaces/general-interfaces';
import { LoadingOverlay } from '../../../shared/ui/loading-overlay/loading-overlay';

// Service / interfaces
import { EmployeesService } from './services/employees.service';
import * as entity from './interfaces/employees-interfaces';
import { DialogService } from '../../../shared/services/dialog.service';

const STATUS_OPTIONS: Catalog[] = [
  { id: 'active', name: 'Activo' },
  { id: 'inactive', name: 'Baja' },
  { id: 'reentry', name: 'Reingreso' },
];

function resolveEmploymentStatusVariant(row: entity.EmployeeRow): ColumnVariant {
  switch (row.employment_status) {
    case 'active':
      return 'chip-success';

    case 'reentry':
      return 'chip-warning';

    case 'inactive':
    default:
      return 'chip-danger';
  }
}

const COLUMNS_CONFIG: ColumnsConfig[] = [
  { key: 'full_name', label: 'Nombre completo' },
  { key: 'curp', label: 'CURP' },
  { key: 'area_label', label: 'Área', type: 'chip', typeVariant: 'chip-neutral' },
  { key: 'position', label: 'Puesto' },
  { key: 'age', label: 'Edad' },
  { key: 'entry_date', label: 'Fecha ingreso', type: 'date' },
  { key: 'weekly_salary', label: 'Salario semanal', type: 'money', align: 'right' },
  {
    key: 'employment_status_label',
    label: 'Estatus',
    type: 'chip',
    variantResolver: (row: entity.EmployeeRow) => resolveEmploymentStatusVariant(row),
  },
];

const DISPLAYED_COLUMNS: string[] = [...COLUMNS_CONFIG.map((c) => c.key), 'actions'];

const HEADER_CONFIG: ModuleHeaderConfig = {
  showNew: true,
  newRoles: ['MANO_OBRA_EMPLEADOS_EDITOR'],
};

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModuleHeader,
    DataTable,
    InputField,
    InputSelect,
    BtnsSection,
    MatPaginatorModule,
    HasRoleDirective,
    LoadingOverlay,
  ],
  templateUrl: './employees.html',
  styleUrl: './employees.scss',
})
export class Employees implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly employeesService = inject(EmployeesService);
  private readonly dialogService = inject(DialogService);

  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;
  readonly headerConfig = HEADER_CONFIG;
  readonly statusOptions = STATUS_OPTIONS;

  readonly loadingTable = signal(false);

  areaOptions: Catalog[] = [];

  filters: entity.FiltersEmployees = {
    page: 1,
    limit: 5,
    full_name: null,
    curp: null,
    employee_area_id: null,
    employment_status: null,
  };

  employeesTableData: PaginatedResponse<entity.EmployeeRow> = {
    data: [],
    meta: {
      total: 0,
      page: 1,
      limit: 5,
    },
  };

  formFilters = this.fb.group({
    fullName: this.fb.control<string>(''),
    curp: this.fb.control<string>(''),
    area: this.fb.control<number | null>(null),
    employmentStatus: this.fb.control<entity.EmployeeStatus | null>(null),
  });

  ngOnInit(): void {
    this.loadEmployeeAreasCatalog();
    this.loadEmployees();
  }

  onHeaderAction(action: string): void {
    switch (action) {
      case 'new':
        this.router.navigateByUrl('/mano-de-obra/empleados/nuevo');
        break;

      case '':
        this.router.navigateByUrl('/mano-de-obra/empleados/nuevo');
        break;
    }
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

  onTableAction(ev: DataTableActionEvent<entity.EmployeeRow>): void {
    switch (ev.type) {
      case 'edit':
        this.router.navigateByUrl(`/mano-de-obra/empleados/editar/${ev.row.id}`);
        break;

      case 'delete':
        this.onDelete(ev.row);
        break;
    }
  }

  onDelete(employee: entity.EmployeeRow): void {
    this.dialogService
      .confirm({
        message: `¿Quieres eliminar al empleado:\n"${employee?.full_name?.trim()}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        size: 'mini',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.employeesService.remove(employee.id).subscribe({
          next: () => this.loadEmployees(),
          error: (err) => console.error('Error al eliminar empleado:', err),
        });
      });
  }

  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;
    this.loadEmployees();
  }

  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();

    this.filters = {
      ...this.filters,
      page: 1,
      full_name: value.fullName?.trim() || null,
      curp: value.curp?.trim() || null,
      employee_area_id: value.area ?? null,
      employment_status: value.employmentStatus ?? null,
    };

    this.loadEmployees();
  }

  clearAllAndSearch(): void {
    this.formFilters.reset(
      {
        fullName: '',
        curp: '',
        area: null,
        employmentStatus: null,
      },
      { emitEvent: false },
    );

    this.filters = {
      page: 1,
      limit: this.filters.limit,
      full_name: null,
      curp: null,
      employee_area_id: null,
      employment_status: null,
    };

    this.loadEmployees();
  }

  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();

    return !!(
      form.fullName?.trim() ||
      form.curp?.trim() ||
      form.area ||
      form.employmentStatus
    );
  }

  private loadEmployeeAreasCatalog(): void {
    this.employeesService.getEmployeeAreasCatalog().subscribe({
      next: (response) => {
        this.areaOptions = response ?? [];
      },
      error: (err) => {
        console.error('Error cargando catálogo de áreas de empleados:', err);
      },
    });
  }

  private loadEmployees(): void {
    if (this.loadingTable()) return;

    this.loadingTable.set(true);

    this.employeesService
      .getEmployees(this.filters)
      .pipe(finalize(() => this.loadingTable.set(false)))
      .subscribe({
        next: (response) => {
          const mappedRows: entity.EmployeeRow[] = (response.data ?? []).map((row) => ({
            ...row,
            area_label: row.employee_area?.name ?? 'Sin área',
          }));

          this.employeesTableData = {
            ...response,
            data: mappedRows,
          };
        },
        error: (err) => {
          console.error('Error cargando empleados:', err);
        },
      });
  }
}

