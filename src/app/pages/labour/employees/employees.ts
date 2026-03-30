import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

// Angular Material
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ColumnsConfig, DataTableActionEvent } from '../../../shared/ui/data-table/interfaces/table-interfaces';
import { ModuleHeaderConfig } from '../../../shared/ui/module-header/interfaces/module-header-interface';
import { ModuleHeader } from '../../../shared/ui/module-header/module-header';
import { DataTable } from '../../../shared/ui/data-table/data-table';
import { InputField } from '../../../shared/ui/input-field/input-field';
import { InputSelect } from '../../../shared/ui/input-select/input-select';
import { HasRoleDirective } from '../../../auth/directives/has-role.directive';
import { BtnsSection } from '../../../shared/ui/btns-section/btns-section';


const AREA_OPTIONS: CatalogOption[] = [
  { id: 'CARPINTEROS', name: 'Carpinteros' },
  { id: 'BARNIZADORES', name: 'Barnizadores' },
  { id: 'PINTORES', name: 'Pintores' },
  { id: 'JARDINEROS', name: 'Jardineros' },
  { id: 'CHOFERES', name: 'Choferes' },
  { id: 'ARQUITECTOS', name: 'Arquitectos' },
  { id: 'INGENIEROS', name: 'Ingenieros' },
  { id: 'ADMINISTRATIVOS', name: 'Administrativos' },
  { id: 'ELECTRICOS', name: 'Eléctricos' },
  { id: 'PLOMEROS', name: 'Plomeros' },
  { id: 'TECNICOS', name: 'Técnicos' },
];

const STATUS_OPTIONS: CatalogOption[] = [
  { id: 'active', name: 'Activo' },
  { id: 'inactive', name: 'Baja' },
  { id: 'reentry', name: 'Reingreso' },
];

const DUMMY_EMPLOYEES: Omit<EmployeeRow, 'area_label' | 'employment_status_label'>[] = [
  {
    id: 1,
    full_name: 'Luis Fernando López',
    curp: 'LOLF900101HSLPRS01',
    area: 'CARPINTEROS',
    position: 'Oficial carpintero',
    age: 36,
    entry_date: '2026-01-08',
    weekly_salary: 4200,
    employment_status: 'active',
    birth_date: '1990-01-01',
    address: 'Los Mochis, Sinaloa',
    discharge_date: null,
    reentry_date: null,
  },
  {
    id: 2,
    full_name: 'José Manuel Cuevas',
    curp: 'CUJM880315HSLPRS02',
    area: 'PINTORES',
    position: 'Pintor',
    age: 38,
    entry_date: '2025-11-20',
    weekly_salary: 3950,
    employment_status: 'active',
    birth_date: '1988-03-15',
    address: 'Ahome, Sinaloa',
    discharge_date: null,
    reentry_date: null,
  },
  {
    id: 3,
    full_name: 'Carlos Alberto Pérez',
    curp: 'PECA950722HSLRRR03',
    area: 'JARDINEROS',
    position: 'Jardinero',
    age: 30,
    entry_date: '2026-02-01',
    weekly_salary: 3500,
    employment_status: 'reentry',
    birth_date: '1995-07-22',
    address: 'Guasave, Sinaloa',
    discharge_date: '2025-12-18',
    reentry_date: '2026-02-01',
  },
  {
    id: 4,
    full_name: 'Miguel Ángel Soto',
    curp: 'SOMM920910HSLTRG04',
    area: 'CHOFERES',
    position: 'Chofer',
    age: 33,
    entry_date: '2024-09-15',
    weekly_salary: 4100,
    employment_status: 'inactive',
    birth_date: '1992-09-10',
    address: 'Culiacán, Sinaloa',
    discharge_date: '2026-03-10',
    reentry_date: null,
  },
  {
    id: 5,
    full_name: 'Roberto Hernández García',
    curp: 'HEGR870501HSLRBR05',
    area: 'PLOMEROS',
    position: 'Plomero',
    age: 39,
    entry_date: '2025-05-12',
    weekly_salary: 4300,
    employment_status: 'active',
    birth_date: '1987-05-01',
    address: 'Los Mochis, Sinaloa',
    discharge_date: null,
    reentry_date: null,
  },
  {
    id: 6,
    full_name: 'Juan Pablo Martínez',
    curp: 'MAJJ930824HSLNNT06',
    area: 'ELECTRICOS',
    position: 'Eléctrico',
    age: 32,
    entry_date: '2026-03-01',
    weekly_salary: 4450,
    employment_status: 'active',
    birth_date: '1993-08-24',
    address: 'El Fuerte, Sinaloa',
    discharge_date: null,
    reentry_date: null,
  },
  {
    id: 7,
    full_name: 'Eduardo Ramírez Castro',
    curp: 'RACE910207HSLMDS07',
    area: 'TECNICOS',
    position: 'Técnico instalador',
    age: 35,
    entry_date: '2025-08-05',
    weekly_salary: 4000,
    employment_status: 'active',
    birth_date: '1991-02-07',
    address: 'Mazatlán, Sinaloa',
    discharge_date: null,
    reentry_date: null,
  },
  {
    id: 8,
    full_name: 'Francisco Javier Núñez',
    curp: 'NUJF890611HSLVRC08',
    area: 'ADMINISTRATIVOS',
    position: 'Auxiliar administrativo',
    age: 36,
    entry_date: '2026-01-15',
    weekly_salary: 3700,
    employment_status: 'active',
    birth_date: '1989-06-11',
    address: 'Los Mochis, Sinaloa',
    discharge_date: null,
    reentry_date: null,
  },
];

const COLUMNS_CONFIG: ColumnsConfig[] = [
  { key: 'full_name', label: 'Nombre completo' },
  { key: 'curp', label: 'CURP' },
  { key: 'area_label', label: 'Área', type: 'chip', typeVariant: 'chip-neutral' },
  { key: 'position', label: 'Puesto' },
  { key: 'age', label: 'Edad' },
  { key: 'entry_date', label: 'Fecha ingreso', type: 'date' },
  { key: 'weekly_salary', label: 'Salario semanal', type: 'money', align: 'right' },
  { key: 'employment_status_label', label: 'Estatus', type: 'chip', typeVariant: 'chip-neutral' },
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
  ],
  templateUrl: './employees.html',
  styleUrl: './employees.scss',
})
export class Employees implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;
  readonly headerConfig = HEADER_CONFIG;
  readonly areaOptions = AREA_OPTIONS;
  readonly statusOptions = STATUS_OPTIONS;

  filters: EmployeesFilters = {
    page: 1,
    limit: 5,
    fullName: null,
    curp: null,
    area: null,
    employmentStatus: null,
  };

  employeesTableData: EmployeesTableData = {
    data: [],
    meta: { total: 0 },
  };

  formFilters = this.fb.group({
    fullName: this.fb.control<string>(''),
    curp: this.fb.control<string>(''),
    area: this.fb.control<string | null>(null),
    employmentStatus: this.fb.control<EmployeeStatus | null>(null),
  });

  ngOnInit(): void {
    this.loadEmployees();
  }

  onHeaderAction(action: string): void {
    switch (action) {
      case 'new':
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

  onTableAction(ev: DataTableActionEvent<EmployeeRow>): void {
    switch (ev.type) {
      case 'edit':
        this.router.navigateByUrl(`/mano-de-obra/empleados/editar/${ev.row.id}`);
        break;
    }
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
      fullName: value.fullName?.trim() || null,
      curp: value.curp?.trim() || null,
      area: value.area ?? null,
      employmentStatus: value.employmentStatus ?? null,
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
      fullName: null,
      curp: null,
      area: null,
      employmentStatus: null,
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

  private loadEmployees(): void {
    const filtered = DUMMY_EMPLOYEES
      .map((row) => ({
        ...row,
        area_label: this.resolveAreaLabel(row.area),
        employment_status_label: this.resolveStatusLabel(row.employment_status),
      }))
      .filter((row) => {
        const matchesName =
          !this.filters.fullName ||
          row.full_name.toLowerCase().includes(this.filters.fullName.toLowerCase());

        const matchesCurp =
          !this.filters.curp ||
          row.curp.toLowerCase().includes(this.filters.curp.toLowerCase());

        const matchesArea =
          !this.filters.area || row.area === this.filters.area;

        const matchesStatus =
          !this.filters.employmentStatus ||
          row.employment_status === this.filters.employmentStatus;

        return matchesName && matchesCurp && matchesArea && matchesStatus;
      });

    const start = (this.filters.page - 1) * this.filters.limit;
    const end = start + this.filters.limit;

    this.employeesTableData = {
      data: filtered.slice(start, end),
      meta: {
        total: filtered.length,
      },
    };
  }

  private resolveAreaLabel(area: string): string {
    return this.areaOptions.find((option) => option.id === area)?.name ?? area;
  }

  private resolveStatusLabel(status: EmployeeStatus): string {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'inactive':
        return 'Baja';
      case 'reentry':
        return 'Reingreso';
      default:
        return status;
    }
  }
}