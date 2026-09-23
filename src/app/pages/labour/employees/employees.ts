import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import {
  CommonModule,
} from '@angular/common';

import {
  Router,
} from '@angular/router';

import {
  FormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';

import {
  finalize,
} from 'rxjs';


// =========================================================
// ANGULAR MATERIAL
// =========================================================

import {
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';


// =========================================================
// SHARED UI
// =========================================================

import {
  ColumnsConfig,
  ColumnVariant,
  DataTableActionEvent,
  DataTableSortEvent,
} from '../../../shared/ui/data-table/interfaces/table-interfaces';

import {
  ModuleHeaderConfig,
} from '../../../shared/ui/module-header/interfaces/module-header-interface';

import {
  ModuleHeader,
} from '../../../shared/ui/module-header/module-header';

import {
  DataTable,
} from '../../../shared/ui/data-table/data-table';

import {
  InputField,
} from '../../../shared/ui/input-field/input-field';

import {
  InputSelect,
} from '../../../shared/ui/input-select/input-select';

import {
  HasRoleDirective,
} from '../../../auth/directives/has-role.directive';

import {
  BtnsSection,
} from '../../../shared/ui/btns-section/btns-section';

import {
  Catalog,
  PaginatedResponse,
} from '../../../shared/interfaces/general-interfaces';

import {
  LoadingOverlay,
} from '../../../shared/ui/loading-overlay/loading-overlay';


// =========================================================
// SERVICE / INTERFACES
// =========================================================

import {
  EmployeesService,
} from './services/employees.service';

import * as entity
  from './interfaces/employees-interfaces';

import {
  DialogService,
} from '../../../shared/services/dialog.service';


// =========================================================
// OPCIONES
// =========================================================

const STATUS_OPTIONS:
  Catalog[] = [

    {
      id: 'active',
      name: 'Activo',
    },

    {
      id: 'inactive',
      name: 'Baja',
    },

    {
      id: 'reentry',
      name: 'Reingreso',
    },
  ];


// =========================================================
// RESOLVERS
// =========================================================

function resolveEmploymentStatusVariant(
  row:
    entity.EmployeeRow,
): ColumnVariant {

  switch (
  row.employment_status
  ) {

    case 'active':
      return 'chip-success';


    case 'reentry':
      return 'chip-warning';


    case 'inactive':
    default:
      return 'chip-danger';
  }
}


// =========================================================
// COLUMNAS
// =========================================================

const COLUMNS_CONFIG:
  ColumnsConfig[] = [

    {
      key: 'full_name',
      label: 'Nombre completo',

      sortable: true,
      sortKey: 'full_name',
    },

    {
      key: 'curp',
      label: 'CURP',

      sortable: true,
      sortKey: 'curp',
    },

    {
      key: 'area_label',
      label: 'Área',
      type: 'chip',
      typeVariant: 'chip-neutral',

      sortable: true,
      sortKey: 'area',
    },

    {
      key: 'position',
      label: 'Puesto',

      sortable: true,
      sortKey: 'position',
    },

    {
      key: 'age',
      label: 'Edad',

      sortable: true,
      sortKey: 'age',
    },

    {
      key: 'entry_date',
      label: 'Fecha ingreso',
      type: 'date',

      sortable: true,
      sortKey: 'entry_date',
    },

    {
      key: 'weekly_salary',
      label: 'Salario semanal',
      type: 'money',
      align: 'right',

      sortable: true,
      sortKey: 'weekly_salary',
    },

    {
      key: 'employment_status_label',
      label: 'Estatus',
      type: 'chip',

      sortable: true,
      sortKey: 'employment_status',

      variantResolver: (
        row:
          entity.EmployeeRow,
      ) =>
        resolveEmploymentStatusVariant(
          row,
        ),
    },
  ];


const DISPLAYED_COLUMNS:
  string[] = [
    ...COLUMNS_CONFIG.map(
      (column) =>
        column.key,
    ),
    'actions',
  ];


// =========================================================
// HEADER
// =========================================================

const HEADER_CONFIG:
  ModuleHeaderConfig = {

  showNew: true,

  newRoles: [
    'EMPLEADOS_EDITOR',
  ],
};


// =========================================================
// COMPONENT
// =========================================================

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

  templateUrl:
    './employees.html',

  styleUrl:
    './employees.scss',
})
export class Employees
  implements OnInit {

  // =========================================================
  // INYECCIONES
  // =========================================================

  private readonly fb =
    inject(
      FormBuilder,
    );


  private readonly router =
    inject(
      Router,
    );


  private readonly employeesService =
    inject(
      EmployeesService,
    );


  private readonly dialogService =
    inject(
      DialogService,
    );


  // =========================================================
  // UI
  // =========================================================

  readonly columnsConfig =
    COLUMNS_CONFIG;


  readonly displayedColumns =
    DISPLAYED_COLUMNS;


  readonly headerConfig =
    HEADER_CONFIG;


  readonly statusOptions =
    STATUS_OPTIONS;


  readonly loadingTable =
    signal(
      false,
    );


  areaOptions:
    Catalog[] = [];


  // =========================================================
  // SORTING
  // =========================================================

  sorts:
    entity.EmployeeSortItem[] = [];


  // =========================================================
  // FILTROS
  // =========================================================

  filters:
    entity.FiltersEmployees = {

      page:
        1,

      limit:
        5,

      full_name:
        null,

      curp:
        null,

      employee_area_id:
        null,

      employment_status:
        null,

      sorts: [],
    };


  // =========================================================
  // TABLA
  // =========================================================

  employeesTableData:
    PaginatedResponse<
      entity.EmployeeRow
    > = {

      data: [],

      meta: {

        total:
          0,

        page:
          1,

        limit:
          5,
      },
    };


  // =========================================================
  // FORMULARIO
  // =========================================================

  formFilters =
    this.fb.group({

      fullName:
        this.fb.control<string>(
          '',
        ),

      curp:
        this.fb.control<string>(
          '',
        ),

      area:
        this.fb.control<
          number |
          null
        >(
          null,
        ),

      employmentStatus:
        this.fb.control<
          entity.EmployeeStatus |
          null
        >(
          null,
        ),
    });


  // =========================================================
  // CICLO DE VIDA
  // =========================================================

  ngOnInit(): void {

    this.loadEmployeeAreasCatalog();

    this.loadEmployees();
  }


  // =========================================================
  // HEADER
  // =========================================================

  onHeaderAction(
    action:
      string,
  ): void {

    switch (
    action
    ) {

      case 'new':

        this.router.navigateByUrl(
          '/mano-de-obra/empleados/nuevo',
        );

        break;


      case '':

        this.router.navigateByUrl(
          '/mano-de-obra/empleados/nuevo',
        );

        break;
    }
  }


  // =========================================================
  // BOTONES DE FILTROS
  // =========================================================

  onBtnsSectionAction(
    action:
      string,
  ): void {

    switch (
    action
    ) {

      case 'search':

        this.searchWithFilters();

        break;


      case 'clean':

        this.clearAllAndSearch();

        break;
    }
  }


  // =========================================================
  // ACCIONES TABLA
  // =========================================================

  onTableAction(
    ev:
      DataTableActionEvent<
        entity.EmployeeRow
      >,
  ): void {

    switch (
    ev.type
    ) {

      case 'edit':

        this.router.navigateByUrl(
          `/mano-de-obra/empleados/editar/${ev.row.id}`,
        );

        break;


      case 'delete':

        this.onDelete(
          ev.row,
        );

        break;
    }
  }


  // =========================================================
  // ELIMINAR
  // =========================================================

  onDelete(
    employee:
      entity.EmployeeRow,
  ): void {

    this.dialogService
      .confirm({
        message:
          `¿Quieres eliminar al empleado:\n"${employee?.full_name?.trim()}"?`,

        confirmText:
          'Eliminar',

        cancelText:
          'Cancelar',

        size:
          'mini',
      })
      .subscribe(
        (
          confirmed,
        ) => {

          if (
            !confirmed
          ) {
            return;
          }


          this.employeesService
            .remove(
              employee.id,
            )
            .subscribe({

              next:
                () =>
                  this.loadEmployees(),

              error:
                (
                  err,
                ) =>
                  console.error(
                    'Error al eliminar empleado:',
                    err,
                  ),
            });
        },
      );
  }


  // =========================================================
  // PAGINACIÓN
  // =========================================================

  onPageChange(
    event:
      PageEvent,
  ): void {

    this.filters.page =
      event.pageIndex + 1;


    this.filters.limit =
      event.pageSize;


    this.loadEmployees();
  }


  // =========================================================
  // BUSCAR
  // =========================================================

  searchWithFilters(): void {

    const value =
      this.formFilters
        .getRawValue();


    this.filters = {

      ...this.filters,

      page:
        1,

      full_name:
        value.fullName
          ?.trim() ||
        null,

      curp:
        value.curp
          ?.trim() ||
        null,

      employee_area_id:
        value.area ??
        null,

      employment_status:
        value.employmentStatus ??
        null,

      sorts: [
        ...this.sorts,
      ],
    };


    this.loadEmployees();
  }


  // =========================================================
  // ORDENAMIENTO
  // =========================================================

  onSortChange(
    event:
      DataTableSortEvent,
  ): void {

    this.sorts = [
      ...event.sorts,
    ];


    this.filters = {

      ...this.filters,

      page:
        1,

      sorts: [
        ...this.sorts,
      ],
    };


    this.loadEmployees();
  }


  // =========================================================
  // LIMPIAR
  // =========================================================

  clearAllAndSearch(): void {

    this.formFilters.reset(
      {

        fullName:
          '',

        curp:
          '',

        area:
          null,

        employmentStatus:
          null,
      },
      {
        emitEvent:
          false,
      },
    );


    this.sorts = [];


    this.filters = {

      page:
        1,

      limit:
        this.filters.limit,

      full_name:
        null,

      curp:
        null,

      employee_area_id:
        null,

      employment_status:
        null,

      sorts: [],
    };


    this.loadEmployees();
  }


  // =========================================================
  // FILTROS ACTIVOS
  // =========================================================

  get hasActiveFilters():
    boolean {

    const form =
      this.formFilters
        .getRawValue();


    return !!(
      form.fullName
        ?.trim() ||

      form.curp
        ?.trim() ||

      form.area ||

      form.employmentStatus ||

      this.sorts.length >
      0
    );
  }


  // =========================================================
  // CATÁLOGO DE ÁREAS
  // =========================================================

  private loadEmployeeAreasCatalog():
    void {

    this.employeesService
      .getEmployeeAreasCatalog()
      .subscribe({

        next:
          (
            response,
          ) => {

            this.areaOptions =
              response ??
              [];
          },

        error:
          (
            err,
          ) => {

            console.error(
              'Error cargando catálogo de áreas de empleados:',
              err,
            );
          },
      });
  }


  // =========================================================
  // CARGAR EMPLEADOS
  // =========================================================

  private loadEmployees():
    void {

    if (
      this.loadingTable()
    ) {
      return;
    }


    this.loadingTable.set(
      true,
    );


    this.employeesService
      .getEmployees(
        this.filters,
      )
      .pipe(
        finalize(
          () =>
            this.loadingTable.set(
              false,
            ),
        ),
      )
      .subscribe({

        next:
          (
            response,
          ) => {

            const mappedRows:
              entity.EmployeeRow[] =
              (
                response.data ??
                []
              ).map(
                (
                  row,
                ) => ({

                  ...row,

                  area_label:
                    row.employee_area
                      ?.name ??
                    'Sin área',
                }),
              );


            this.employeesTableData = {

              ...response,

              data:
                mappedRows,
            };
          },

        error:
          (
            err,
          ) => {

            console.error(
              'Error cargando empleados:',
              err,
            );
          },
      });
  }
}