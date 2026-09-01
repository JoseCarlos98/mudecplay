import {
  CommonModule,
} from '@angular/common';

import {
  ModalAccountsReceivableClassification,
} from './components/modal-accounts-receivable-classification/modal-accounts-receivable-classification';

import {
  ModalAccountsReceivableBulkClassification,
} from './components/modal-accounts-receivable-bulk-classification/modal-accounts-receivable-bulk-classification';

import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';

import {
  finalize,
  forkJoin,
} from 'rxjs';

import {
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';

import {
  MatIconModule,
} from '@angular/material/icon';

import {
  MatButtonModule,
} from '@angular/material/button';


// =========================================================
// UI COMPARTIDA
// =========================================================

import {
  ModuleHeader,
} from '../../../../shared/ui/module-header/module-header';

import {
  ModuleHeaderConfig,
} from '../../../../shared/ui/module-header/interfaces/module-header-interface';

import {
  DataTable,
} from '../../../../shared/ui/data-table/data-table';

import {
  ColumnsConfig,
  ColumnVariant,
  DataTableActionEvent,
  DataTableExtraAction,
} from '../../../../shared/ui/data-table/interfaces/table-interfaces';

import {
  InputField,
} from '../../../../shared/ui/input-field/input-field';

import {
  InputSelect,
} from '../../../../shared/ui/input-select/input-select';

import {
  DateRangeValue,
  InputDate,
} from '../../../../shared/ui/input-date/input-date';

import {
  BtnsSection,
} from '../../../../shared/ui/btns-section/btns-section';

import {
  LoadingOverlay,
} from '../../../../shared/ui/loading-overlay/loading-overlay';

import {
  Autocomplete,
} from '../../../../shared/ui/autocomplete/autocomplete';


// =========================================================
// SERVICIOS
// =========================================================

import {
  TreasuryAccountsReceivableService,
} from './services/treasury-accounts-receivable.service';

import {
  CatalogsService,
} from '../../../../shared/services/catalogs.service';

import {
  LocalStorageService,
} from '../../../../shared/services/local-storage.service';


// =========================================================
// HELPERS / INTERFACES
// =========================================================

import {
  Catalog,
} from '../../../../shared/interfaces/general-interfaces';

import {
  roundMoney,
  getTreasuryMovementDescriptionDisplay
} from '../../../../shared/helpers/general-helpers';

import * as entity
  from './interfaces/treasury-accounts-receivable.interfaces';
import type {
  TreasuryAvailableInflowTableRow,
  TreasuryPendingReceivableTableRow,
  TreasuryAvailableInflowUiFilters,
  TreasuryPendingReceivableUiFilters,
} from './interfaces/treasury-accounts-receivable.interfaces';
export type {
  TreasuryAvailableInflowTableRow,
} from './interfaces/treasury-accounts-receivable.interfaces';
import { DialogService } from '../../../../shared/services/dialog.service';
import { ModalTreasuryAccountsReceivable } from './components/modal-treasury-accounts-receivable/modal-treasury-accounts-receivable';
import { ModalReceivableHistory } from './components/modal-receivable-history/modal-receivable-history';
import { PermissionsService } from '../../../../auth/services/permissions.service';
import { ModalAccountsReceivableManualClose } from './components/modal-accounts-receivable-manual-close/modal-accounts-receivable-manual-close';
import { ModalReceivableMovementHistory } from './components/modal-receivable-movement-history/modal-receivable-movement-history';


// =========================================================
// STORAGE
// =========================================================

const AVAILABLE_INFLOWS_FILTERS_KEY =
  'mp_treasury_accounts_receivable_inflows_v1';

const PENDING_RECEIVABLES_FILTERS_KEY =
  'mp_treasury_accounts_receivable_pending_v1';


// =========================================================
// HEADER
// =========================================================

const HEADER_CONFIG:
  ModuleHeaderConfig = {};


// =========================================================
// OPCIONES
// =========================================================

const COMPANY_CODE_OPTIONS:
  Catalog[] = [

    {
      id: 'MUDECPLAY',
      name: 'MUDECPLAY',
    },

    {
      id: 'CONSTRUCTORA_PELEN',
      name: 'CONSTRUCTORA PELEN',
    },
  ];


// =========================================================
// CHIPS: MOVIMIENTOS
// =========================================================

function resolveInflowStatusVariant(
  row:
    TreasuryAvailableInflowTableRow,
): ColumnVariant {

  switch (row.status) {

    case 'matched':
    case 'manually_closed':
      return 'chip-success';

    case 'unmatched':
    case 'partially_matched':
      return 'chip-warning';

    case 'cancelled':
      return 'chip-danger';

    default:
      return 'chip-neutral';
  }
}


function resolveInflowClassificationVariant(
  row:
    TreasuryAvailableInflowTableRow,
): ColumnVariant {

  return row.is_collectable
    ? 'chip-success'
    : 'chip-warning';
}


function resolveInflowReviewVariant(
  row:
    TreasuryAvailableInflowTableRow,
): ColumnVariant {

  return row.classification_reviewed
    ? 'chip-success'
    : 'chip-warning';
}


// =========================================================
// CHIPS: CxC
// =========================================================

function resolveReceivableStatusVariant(
  row:
    TreasuryPendingReceivableTableRow,
): ColumnVariant {

  switch (row.status) {

    case 'partial':
      return 'chip-warning';

    case 'collected':
      return 'chip-success';

    case 'pending':
    default:
      return 'chip-danger';
  }
}


function resolveMigrationVariant(
  row:
    TreasuryPendingReceivableTableRow,
): ColumnVariant {

  return row.requires_legacy_migration
    ? 'chip-danger'
    : 'chip-success';
}


// =========================================================
// COLUMNAS: ENTRADAS BANCARIAS
// =========================================================

const AVAILABLE_INFLOW_COLUMNS:
  ColumnsConfig[] = [

    {
      key: 'classification_selected',
      label: 'Elegir',
      type: 'select',
      align: 'center',

      selectActionType:
        'toggleClassificationSelection',

      selectedResolver: (
        row:
          TreasuryAvailableInflowTableRow,
      ) =>
        row.classification_selected === true,

      selectDisabledResolver: (
        row:
          TreasuryAvailableInflowTableRow,
      ) =>
        row.status !== 'unmatched',

      selectTooltip: (
        row:
          TreasuryAvailableInflowTableRow,
      ) => {

        if (
          row.status !== 'unmatched'
        ) {
          return (
            'El movimiento ya tiene aplicaciones y no puede reclasificarse.'
          );
        }

        return row.classification_selected
          ? 'Quitar de la selección'
          : 'Seleccionar para revisión';
      },
    },

    {
      key: 'movement_date',
      label: 'Fecha',
      type: 'date',
    },
    {
      key: 'amount',
      label: 'Monto original',
      type: 'money',
      align: 'right',
    },

    {
      key: 'available_amount',
      label: 'Disponible',
      type: 'money',
      align: 'right',
    },


    {
      key: 'description_display',
      label: 'Descripción',
    },

    {
      key: 'classification_label',
      label: 'Clasificación',
      type: 'chip',

      variantResolver: (
        row:
          TreasuryAvailableInflowTableRow,
      ) =>
        resolveInflowClassificationVariant(
          row,
        ),
    },

    {
      key: 'classification_review_label',
      label: 'Revisión',
      type: 'chip',

      variantResolver: (
        row:
          TreasuryAvailableInflowTableRow,
      ) =>
        resolveInflowReviewVariant(
          row,
        ),
    },

    {
      key: 'company_name',
      label: 'Empresa',
    },

    {
      key: 'bank_name',
      label: 'Banco',
    },

    {
      key: 'bank_account_display',
      label: 'Cuenta',
    },

    {
      key: 'status_label',
      label: 'Estatus',
      type: 'chip',

      variantResolver: (
        row:
          TreasuryAvailableInflowTableRow,
      ) =>
        resolveInflowStatusVariant(
          row,
        ),
    },
  ];


const AVAILABLE_INFLOW_DISPLAYED_COLUMNS =
  [
    ...AVAILABLE_INFLOW_COLUMNS.map(
      (
        column,
      ) =>
        column.key,
    ),

    'actions',
  ];


// =========================================================
// COLUMNAS: CxC PENDIENTES
// =========================================================

const PENDING_RECEIVABLE_COLUMNS:
  ColumnsConfig[] = [

    {
      key: 'issue_date',
      label: 'Fecha',
      type: 'date',
    },

    {
      key: 'pending_amount',
      label: 'Pendiente',
      type: 'money',
      align: 'right',
    },

    {
      key: 'total',
      label: 'Total',
      type: 'money',
      align: 'right',
    },

    {
      key: 'collected_amount',
      label: 'Cobrado',
      type: 'money',
      align: 'right',
    },

    {
      key: 'invoice_display',
      label: 'Factura',
    },

    {
      key: 'receiver_name',
      label: 'Cliente',
    },

    {
      key: 'project_name',
      label: 'Proyecto',
    },

    {
      key: 'estimated_collection_date',
      label: 'Cobro estimado',
      type: 'date',
    },

    {
      key: 'status_label',
      label: 'Estatus',
      type: 'chip',

      variantResolver: (
        row:
          TreasuryPendingReceivableTableRow,
      ) =>
        resolveReceivableStatusVariant(
          row,
        ),
    },

    {
      key: 'migration_label',
      label: 'Migración',
      type: 'chip',

      variantResolver: (
        row:
          TreasuryPendingReceivableTableRow,
      ) =>
        resolveMigrationVariant(
          row,
        ),
    },
  ];


const PENDING_RECEIVABLE_DISPLAYED_COLUMNS =
  [
    ...PENDING_RECEIVABLE_COLUMNS.map(
      (
        column,
      ) =>
        column.key,
    ),

    'actions',
  ];


// =========================================================
// COMPONENT
// =========================================================

@Component({
  selector:
    'app-treasury-accounts-receivable',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,

    ModuleHeader,
    DataTable,

    InputDate,
    InputField,
    InputSelect,
    Autocomplete,

    BtnsSection,
    LoadingOverlay,

    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
  ],

  templateUrl:
    './treasury-accounts-receivable.html',

  styleUrl:
    './treasury-accounts-receivable.scss',
})
export class TreasuryAccountsReceivable
  implements OnInit {

  // =======================================================
  // INYECCIONES
  // =======================================================

  private readonly accountsReceivableService =
    inject(
      TreasuryAccountsReceivableService,
    );

  private readonly catalogsService =
    inject(
      CatalogsService,
    );

  private readonly dialogService =
    inject(
      DialogService,
    );

  private readonly permissionsService =
    inject(
      PermissionsService,
    );

  private readonly storage =
    inject(
      LocalStorageService,
    );

  private readonly fb =
    inject(
      FormBuilder,
    );


  // =======================================================
  // UI
  // =======================================================

  readonly headerConfig =
    HEADER_CONFIG;

  readonly companyCodeOptions =
    COMPANY_CODE_OPTIONS;

  readonly availableInflowColumns =
    AVAILABLE_INFLOW_COLUMNS;

  readonly availableInflowDisplayedColumns =
    AVAILABLE_INFLOW_DISPLAYED_COLUMNS;

  readonly pendingReceivableColumns =
    PENDING_RECEIVABLE_COLUMNS;

  readonly pendingReceivableDisplayedColumns =
    PENDING_RECEIVABLE_DISPLAYED_COLUMNS;

  readonly tableActionPermissions = {
    showEdit: false,
    showDelete: false,
  };


  // =======================================================
  // LOADING
  // =======================================================

  readonly loadingClassification =
    signal(false);

  readonly loadingCatalogs =
    signal(false);

  readonly loadingInflows =
    signal(false);

  readonly loadingReceivables =
    signal(false);

  readonly loadingPage =
    computed(
      () =>
        this.loadingCatalogs() ||
        this.loadingInflows() ||
        this.loadingReceivables() ||
        this.loadingClassification(),
    );


  // =======================================================
  // CATÁLOGOS
  // =======================================================

  companyOptions:
    Catalog[] = [];

  bankOptions:
    Catalog[] = [];

  bankAccountOptions:
    Catalog[] = [];

  get isAdmin():
    boolean {

    return this
      .permissionsService
      .isAdmin();
  }

  // =======================================================
  // FILTROS BACKEND
  // =======================================================

  inflowFilters:
    entity.TreasuryAvailableInflowFilters = {

      page:
        1,

      limit:
        10,

      search:
        '',

      amount: null,

      company_id:
        null,

      bank_id:
        null,

      bank_account_id:
        null,

      date_from:
        null,

      date_to:
        null,
    };


  receivableFilters:
    entity.TreasuryPendingReceivableFilters = {

      page:
        1,

      limit:
        10,

      search:
        '',
      amount: null,

      project_id:
        null,

      company_code:
        null,

      date_from:
        null,

      date_to:
        null,
    };


  // =======================================================
  // FORMULARIOS DE FILTROS
  // =======================================================

  readonly inflowFilterForm =
    this.fb.group({

      dateRange:
        this.fb.control<
          DateRangeValue | null
        >(
          null,
        ),

      search:
        this.fb.control<string>(
          '',
        ),

      amount:
        this.fb.control<
          number | string | null
        >(null),

      company_id:
        this.fb.control<
          Catalog |
          number |
          string |
          null
        >(
          null,
        ),

      bank_id:
        this.fb.control<
          Catalog |
          number |
          string |
          null
        >(
          null,
        ),

      bank_account_id:
        this.fb.control<
          Catalog |
          number |
          string |
          null
        >(
          null,
        ),
    });


  readonly receivableFilterForm =
    this.fb.group({

      dateRange:
        this.fb.control<
          DateRangeValue | null
        >(
          null,
        ),

      search:
        this.fb.control<string>(
          '',
        ),

      amount:
        this.fb.control<
          number | string | null
        >(null),

      project_id:
        this.fb.control<
          Catalog |
          number |
          string |
          null
        >(
          null,
        ),

      company_code:
        this.fb.control<
          string | null
        >(
          null,
        ),
    });


  // =======================================================
  // RESPUESTAS
  // =======================================================

  inflowsTableData:
    entity.TreasuryAvailableInflowsResponse = {

      data:
        [],

      summary: {
        movements_count:
          0,

        available_amount:
          0,
      },

      meta: {
        page:
          1,

        limit:
          10,

        total:
          0,

        total_pages:
          0,
      },
    };


  receivablesTableData:
    entity.TreasuryPendingReceivablesResponse = {

      data:
        [],

      summary: {
        receivables_count:
          0,

        total_amount:
          0,

        collected_amount:
          0,

        pending_amount:
          0,
      },

      meta: {
        page:
          1,

        limit:
          10,

        total:
          0,

        total_pages:
          0,
      },
    };


  availableInflowRows:
    TreasuryAvailableInflowTableRow[] =
    [];


  pendingReceivableRows:
    TreasuryPendingReceivableTableRow[] =
    [];


  // =======================================================
  // SELECCIÓN PARA COBRO
  // =======================================================

  readonly selectedClassificationMovements =
    signal<
      Map<
        string,
        TreasuryAvailableInflowTableRow
      >
    >(
      new Map<
        string,
        TreasuryAvailableInflowTableRow
      >(),
    );


  readonly selectedClassificationCount =
    computed(
      () =>
        this
          .selectedClassificationMovements()
          .size,
    );


  readonly selectedClassificationAmount =
    computed(() => {

      const total =
        Array.from(
          this
            .selectedClassificationMovements()
            .values(),
        )
          .reduce(
            (
              sum,
              movement,
            ) =>
              sum +
              Number(
                movement.available_amount ||
                0,
              ),
            0,
          );

      return roundMoney(
        total,
      );
    });


  readonly selectedClassificationRows =
    computed(
      () =>
        Array.from(
          this
            .selectedClassificationMovements()
            .values(),
        ),
    );


  readonly canConfirmSelectedClassifications =
    computed(() => {

      const rows =
        this.selectedClassificationRows();

      if (
        rows.length === 0
      ) {
        return false;
      }

      return rows.every(
        (row) =>
          row.status === 'unmatched' &&
          row.requires_classification_review &&
          this.isReviewClassification(
            row.classification,
          ),
      );
    });

  readonly selectedMovement =
    signal<
      TreasuryAvailableInflowTableRow |
      null
    >(
      null,
    );


  readonly selectedApplications =
    signal<
      Map<
        number,
        number
      >
    >(
      new Map<
        number,
        number
      >(),
    );


  readonly selectedReceivables =
    signal<
      Map<
        number,
        TreasuryPendingReceivableTableRow
      >
    >(
      new Map<
        number,
        TreasuryPendingReceivableTableRow
      >(),
    );


  readonly selectedApplicationsCount =
    computed(
      () =>
        this
          .selectedApplications()
          .size,
    );


  readonly selectedApplicationsTotal =
    computed(
      () => {

        const total =
          Array
            .from(
              this
                .selectedApplications()
                .values(),
            )
            .reduce(
              (
                sum,
                amount,
              ) =>
                sum +
                Number(
                  amount ||
                  0,
                ),
              0,
            );

        return roundMoney(
          total,
        );
      },
    );


  readonly selectedMovementRemaining =
    computed(
      () => {

        const movement =
          this.selectedMovement();

        if (!movement) {
          return 0;
        }

        const available =
          roundMoney(
            Number(
              movement
                .available_amount ??
              0,
            ),
          );

        return roundMoney(
          Math.max(
            available -
            this.selectedApplicationsTotal(),
            0,
          ),
        );
      },
    );


  readonly selectedReceivablesRemaining =
    computed(
      () => {

        const applications =
          this.selectedApplications();

        const total =
          Array
            .from(
              this
                .selectedReceivables()
                .entries(),
            )
            .reduce(
              (
                sum,
                [
                  receivableId,
                  receivable,
                ],
              ) => {

                const currentPending =
                  roundMoney(
                    Number(
                      receivable
                        .pending_amount ??
                      0,
                    ),
                  );

                const amountToApply =
                  roundMoney(
                    Number(
                      applications.get(
                        receivableId,
                      ) ??
                      0,
                    ),
                  );

                return (
                  sum +
                  Math.max(
                    currentPending -
                    amountToApply,
                    0,
                  )
                );
              },
              0,
            );

        return roundMoney(
          total,
        );
      },
    );


  readonly canPrepareCollection =
    computed(
      () => {

        const movement =
          this.selectedMovement();

        if (!movement) {
          return false;
        }

        const amount =
          this.selectedApplicationsTotal();

        return (
          amount > 0 &&
          this.selectedApplicationsCount() >
          0 &&
          this.selectedApplicationsCount() <=
          200 &&
          amount <=
          Number(
            movement
              .available_amount ??
            0,
          )
        );
      },
    );


  // =======================================================
  // ACCIONES TABLA: MOVIMIENTOS
  // =======================================================

  readonly inflowExtraActions:
    DataTableExtraAction<
      TreasuryAvailableInflowTableRow
    >[] = [
      {
        type: 'confirmClassification',
        icon: 'task_alt',

        tooltip: (row) =>
          row.classification
            ? `Confirmar: ${row.classification_label}`
            : 'El movimiento no tiene clasificación',

        iconClass:
          'table-action-icon--success',

        visible: (row) =>
          row.status === 'unmatched' &&
          row.requires_classification_review &&
          !!row.classification,

        disabled: () =>
          this.loadingClassification(),
      },
      {
        type: 'changeClassification',
        icon: 'edit',

        tooltip:
          'Cambiar clasificación',

        visible: (row) =>
          row.status === 'unmatched',

        disabled: () =>
          this.loadingClassification(),
      },
      {
        type:
          'selectMovement',

        icon:
          'check_circle',

        tooltip: (
          row,
        ) => {

          if (
            row.requires_classification_review
          ) {
            return (
              'Primero confirma o cambia la clasificación'
            );
          }

          if (
            !row.is_collectable
          ) {
            return (
              'Esta clasificación no puede utilizarse para Cuentas por Cobrar'
            );
          }

          return (
            'Seleccionar movimiento para cobro'
          );
        },

        disabled: (
          row,
        ) =>
          row.requires_classification_review ||
          !row.is_collectable,

        visible: (
          row,
        ) =>
          this.selectedMovement()
            ?.id !==
          row.id,
      },

      {
        type:
          'clearMovementSelection',

        icon:
          'cancel',

        iconClass:
          'table-action-icon--danger',

        tooltip:
          'Deseleccionar movimiento',

        visible: (
          row,
        ) =>
          this
            .selectedMovement()
            ?.id ===
          row.id,
      },

      {
        type:
          'movementHistory',

        icon:
          'history',

        tooltip:
          'Ver historial',
      },

      {
        type:
          'manualClose',

        icon:
          'lock',

        tooltip:
          'Cerrar saldo disponible',

        roles: [
          'ADMIN_GENERAL',
        ],

        visible: (
          row,
        ) =>
          row.is_collectable &&
          Number(
            row.available_amount,
          ) > 0,
      },
    ];


  // =======================================================
  // ACCIONES TABLA: CxC
  // =======================================================

  readonly receivableExtraActions:
    DataTableExtraAction<
      TreasuryPendingReceivableTableRow
    >[] = [
     

      {
        type:
          'addReceivable',

        icon:
          'add_circle',

        iconClass:
          'table-action-icon--success',

        tooltip: (
          row,
        ) => {

          if (
            row
              .requires_legacy_migration
          ) {

            return (
              'Esta CxC requiere migración de información financiera legacy'
            );
          }

          if (
            !this
              .selectedMovement()
          ) {

            return (
              'Primero selecciona una entrada bancaria'
            );
          }

          return (
            'Agregar cuenta por cobrar'
          );
        },

        visible: (
          row,
        ) =>
          !this
            .selectedApplications()
            .has(
              row.id,
            ),

        disabled: (
          row,
        ) =>
          !this
            .selectedMovement() ||
          row
            .requires_legacy_migration,
      },

      {
        type:
          'removeReceivable',

        icon:
          'remove_circle',

        iconClass:
          'table-action-icon--danger',

        tooltip:
          'Quitar cuenta por cobrar',

        visible: (
          row,
        ) =>
          this
            .selectedApplications()
            .has(
              row.id,
            ),
      },

         {
        type:
          'receivableHistory',

        icon:
          'history',

        tooltip:
          'Ver historial de cobros',

        visible: (
          row,
        ) =>
          row.has_treasury_history,
      },
    ];


  // =======================================================
  // CICLO DE VIDA
  // =======================================================

  ngOnInit():
    void {

    this.restoreFiltersFromStorage();

    this.loadCatalogs();

    this.loadAvailableInflows();

    this.loadPendingReceivables();
  }


  // =======================================================
  // CATÁLOGOS
  // =======================================================

  private loadCatalogs():
    void {

    this.loadingCatalogs.set(
      true,
    );

    forkJoin({

      companies:
        this.catalogsService
          .treasuryCompaniesCatalog(),

      banks:
        this.catalogsService
          .treasuryBanksCatalog(),

      bankAccounts:
        this.catalogsService
          .treasuryBankAccountsCatalog(
            false,
          ),
    })
      .pipe(
        finalize(
          () =>
            this.loadingCatalogs.set(
              false,
            ),
        ),
      )
      .subscribe({

        next: ({
          companies,
          banks,
          bankAccounts,
        }) => {

          this.companyOptions =
            companies ??
            [];

          this.bankOptions =
            banks ??
            [];

          this.bankAccountOptions =
            bankAccounts ??
            [];
        },

        error: (
          error:
            unknown,
        ) => {

          console.error(
            'Error cargando catálogos de Tesorería CxC:',
            error,
          );
        },
      });
  }


  // =======================================================
  // CARGAR ENTRADAS BANCARIAS
  // =======================================================

  loadAvailableInflows():
    void {

    if (
      this.loadingInflows()
    ) {
      return;
    }

    this.loadingInflows.set(
      true,
    );

    this.accountsReceivableService
      .getAvailableInflows(
        this.inflowFilters,
      )
      .pipe(
        finalize(
          () =>
            this.loadingInflows.set(
              false,
            ),
        ),
      )
      .subscribe({

        next: (
          response,
        ) => {

          this.inflowsTableData =
            response;

          this.availableInflowRows =
            (
              response.data ??
              []
            ).map(
              (
                row,
              ) =>
                this.mapAvailableInflowRow(
                  row,
                ),
            );

          const selected =
            this.selectedMovement();

          if (
            selected &&
            !this
              .availableInflowRows
              .some(
                (
                  row,
                ) =>
                  row.id ===
                  selected.id,
              )
          ) {

            this.clearCollectionSelection();
          }
        },

        error: (
          error:
            unknown,
        ) => {

          console.error(
            'Error cargando entradas bancarias disponibles:',
            error,
          );
        },
      });
  }


  // =======================================================
  // CARGAR CxC PENDIENTES
  // =======================================================

  loadPendingReceivables():
    void {

    if (
      this.loadingReceivables()
    ) {
      return;
    }

    this.loadingReceivables.set(
      true,
    );

    this.accountsReceivableService
      .getPendingReceivables(
        this.receivableFilters,
      )
      .pipe(
        finalize(
          () =>
            this.loadingReceivables.set(
              false,
            ),
        ),
      )
      .subscribe({

        next: (
          response,
        ) => {

          this.receivablesTableData =
            response;

          this.pendingReceivableRows =
            (
              response.data ??
              []
            ).map(
              (
                row,
              ) =>
                this.mapPendingReceivableRow(
                  row,
                ),
            );
        },

        error: (
          error:
            unknown,
        ) => {

          console.error(
            'Error cargando cuentas por cobrar pendientes:',
            error,
          );
        },
      });
  }


  // =======================================================
  // MAPEO: MOVIMIENTO
  // =======================================================

  private mapAvailableInflowRow(
    row:
      entity.TreasuryAvailableInflow,
  ): TreasuryAvailableInflowTableRow {

    return {
      ...row,

      classification_selected: false,
      company_name:
        row.company
          ?.name ??
        'Empresa no identificada',

      bank_name:
        row.bank
          ?.name ??
        'Sin banco',

      bank_account_display:
        this.getBankAccountDisplay(
          row,
        ),

      reference_display:
        row.bank_reference
          ?.trim() ||
        row.receipt_number
          ?.trim() ||
        row.tracking_key
          ?.trim() ||
        `Movimiento ${row.id}`,
      description_display:
        getTreasuryMovementDescriptionDisplay(
          row,
        ),

      classification_label:
        this.getClassificationLabel(
          row.classification,
        ),

      classification_review_label:
        row.classification_reviewed
          ? 'Revisada'
          : 'Pendiente',

      status_label:
        this.getMovementStatusLabel(
          row.status,
        ),
    };
  }


  // =======================================================
  // MAPEO: CxC
  // =======================================================

  private mapPendingReceivableRow(
    row:
      entity.TreasuryPendingReceivable,
  ): TreasuryPendingReceivableTableRow {

    return {
      ...row,

      invoice_display:
        row.series
          ? `${row.series}-${row.folio}`
          : row.folio,

      project_name:
        row.project
          ?.name
          ?.trim() ||
        'Sin proyecto',

      status_label:
        this.getReceivableStatusLabel(
          row.status,
        ),

      migration_label:
        row.requires_legacy_migration
          ? 'Requiere migración'
          : 'Lista',
    };
  }


  // =======================================================
  // FILTROS: ENTRADAS
  // =======================================================

  searchAvailableInflows():
    void {

    const value =
      this.inflowFilterForm
        .getRawValue();

    const uiState:
      TreasuryAvailableInflowUiFilters = {

      dateRange:
        value.dateRange ??
        null,

      amount:
        this.normalizeAmountFilter(
          value.amount,
        ),

      search:
        value.search
          ?.trim() ||
        '',

      company_id:
        value.company_id ??
        null,

      bank_id:
        value.bank_id ??
        null,

      bank_account_id:
        value.bank_account_id ??
        null,

      page:
        1,

      limit:
        this
          .inflowFilters
          .limit,
    };

    this.inflowFilters =
      this.buildInflowBackendFiltersFromUi(
        uiState,
      );

    this.saveInflowFiltersToStorage(
      uiState,
    );

    this.loadAvailableInflows();
  }


  clearAvailableInflowFilters():
    void {

    this.inflowFilterForm.reset(
      {
        dateRange:
          null,

        search:
          '',

        amount: null,

        company_id:
          null,

        bank_id:
          null,

        bank_account_id:
          null,
      },
      {
        emitEvent:
          false,
      },
    );

    this.inflowFilters = {

      page:
        1,

      limit:
        this
          .inflowFilters
          .limit,

      search:
        '',

      amount: null,

      company_id:
        null,

      bank_id:
        null,

      bank_account_id:
        null,

      date_from:
        null,

      date_to:
        null,
    };

    this.storage.removeItem(
      AVAILABLE_INFLOWS_FILTERS_KEY,
    );

    this.loadAvailableInflows();
  }


  private buildInflowBackendFiltersFromUi(
    ui:
      TreasuryAvailableInflowUiFilters,
  ): entity.TreasuryAvailableInflowFilters {

    return {

      page:
        ui.page,

      limit:
        ui.limit,

      search:
        ui.search
          ?.trim() ||
        '',

      amount:
        ui.amount ?? null,

      company_id:
        this.getNumberId(
          ui.company_id,
        ),

      bank_id:
        this.getNumberId(
          ui.bank_id,
        ),

      bank_account_id:
        this.getNumberId(
          ui.bank_account_id,
        ),

      date_from:
        ui.dateRange
          ?.startDate ??
        null,

      date_to:
        ui.dateRange
          ?.endDate ??
        null,
    };
  }


  onAvailableInflowPageChange(
    event:
      PageEvent,
  ): void {

    this.inflowFilters.page =
      event.pageIndex + 1;

    this.inflowFilters.limit =
      event.pageSize;

    this.saveInflowFiltersToStorage();

    this.loadAvailableInflows();
  }


  get hasActiveInflowFilters():
    boolean {

    const value =
      this.inflowFilterForm
        .getRawValue();

    return Boolean(

      value.dateRange
        ?.startDate ||

      value.dateRange
        ?.endDate ||

      value.search
        ?.trim() ||

      this.normalizeAmountFilter(
        value.amount,
      ) !== null ||

      this.getCatalogValue(
        value.company_id,
      ) ||

      this.getCatalogValue(
        value.bank_id,
      ) ||

      this.getCatalogValue(
        value.bank_account_id,
      )
    );
  }


  // =======================================================
  // FILTROS: CxC
  // =======================================================

  searchPendingReceivables():
    void {

    const value =
      this.receivableFilterForm
        .getRawValue();

    const uiState:
      TreasuryPendingReceivableUiFilters = {

      dateRange:
        value.dateRange ??
        null,

      search:
        value.search
          ?.trim() ||
        '',

      amount:
        this.normalizeAmountFilter(
          value.amount,
        ),

      project_id:
        value.project_id ??
        null,

      company_code:
        value.company_code ??
        null,

      page:
        1,

      limit:
        this
          .receivableFilters
          .limit,
    };

    this.receivableFilters =
      this.buildReceivableBackendFiltersFromUi(
        uiState,
      );

    this.saveReceivableFiltersToStorage(
      uiState,
    );

    this.loadPendingReceivables();
  }


  clearPendingReceivableFilters():
    void {

    this.receivableFilterForm.reset(
      {
        dateRange:
          null,

        search:
          '',
        amount: null,

        project_id:
          null,

        company_code:
          null,
      },
      {
        emitEvent:
          false,
      },
    );

    this.receivableFilters = {

      page:
        1,

      limit:
        this
          .receivableFilters
          .limit,

      search:
        '',

      amount: null,

      project_id:
        null,

      company_code:
        null,

      date_from:
        null,

      date_to:
        null,
    };

    this.storage.removeItem(
      PENDING_RECEIVABLES_FILTERS_KEY,
    );

    this.loadPendingReceivables();
  }


  private buildReceivableBackendFiltersFromUi(
    ui:
      TreasuryPendingReceivableUiFilters,
  ): entity.TreasuryPendingReceivableFilters {

    return {

      page:
        ui.page,

      limit:
        ui.limit,

      search:
        ui.search
          ?.trim() ||
        '',

      amount:
        ui.amount ?? null,

      project_id:
        this.getNumberId(
          ui.project_id,
        ),

      company_code:
        ui.company_code ??
        null,

      date_from:
        ui.dateRange
          ?.startDate ??
        null,

      date_to:
        ui.dateRange
          ?.endDate ??
        null,
    };
  }


  onPendingReceivablePageChange(
    event:
      PageEvent,
  ): void {

    this.receivableFilters.page =
      event.pageIndex + 1;

    this.receivableFilters.limit =
      event.pageSize;

    this.saveReceivableFiltersToStorage();

    this.loadPendingReceivables();
  }


  get hasActiveReceivableFilters():
    boolean {

    const value =
      this.receivableFilterForm
        .getRawValue();

    return Boolean(

      value.dateRange
        ?.startDate ||

      value.dateRange
        ?.endDate ||

      this.normalizeAmountFilter(
        value.amount,
      ) !== null ||

      value.search
        ?.trim() ||

      this.getCatalogValue(
        value.project_id,
      ) ||

      value.company_code
    );
  }


  // =======================================================
  // BTN SECTIONS
  // =======================================================

  onInflowBtnsSectionAction(
    action:
      string,
  ): void {

    switch (action) {

      case 'search':

        this.searchAvailableInflows();

        break;


      case 'clean':

        this.clearAvailableInflowFilters();

        break;
    }
  }


  onReceivableBtnsSectionAction(
    action:
      string,
  ): void {

    switch (action) {

      case 'search':

        this.searchPendingReceivables();

        break;


      case 'clean':

        this.clearPendingReceivableFilters();

        break;
    }
  }


  // =======================================================
  // ACCIONES: MOVIMIENTO
  // =======================================================

  onInflowTableAction(
    event:
      DataTableActionEvent<
        TreasuryAvailableInflowTableRow
      >,
  ): void {

    switch (event.type) {

      case 'selectMovement':

        this.selectMovement(
          event.row,
        );

        break;

      case 'movementHistory':

        this.openMovementHistory(
          event.row,
        );

        break;


      case 'manualClose':

        this.openManualClose(
          event.row,
        );

        break;

      case 'toggleClassificationSelection':

        this.toggleClassificationSelection(
          event.row,
        );

        break;


      case 'confirmClassification':
        this.confirmMovementClassification(
          event.row,
        );
        break;


      case 'changeClassification':
        this.openClassificationModal(
          event.row,
        );
        break;


      case 'clearMovementSelection':

        this.clearCollectionSelection();

        break;
    }
  }

  private openClassificationModal(
    movement:
      entity.TreasuryAvailableInflow,
  ): void {

    if (
      !movement?.id ||
      movement.status !== 'unmatched'
    ) {
      return;
    }

    const modalData:
      entity.TreasuryBankMovementClassificationModalData = {
      movement,
    };

    this.dialogService
      .open(
        ModalAccountsReceivableClassification,
        modalData,
        'medium',
      )
      .afterClosed()
      .subscribe(
        (
          result:
            | entity.TreasuryUpdateBankMovementClassificationResponse
            | null,
        ) => {

          if (!result?.success) {
            return;
          }

          if (
            this.selectedMovement()?.id ===
            movement.id
          ) {
            this.clearCollectionSelection();
          }

          this.loadAvailableInflows();
        },
      );
  }


  private confirmMovementClassification(
    row:
      TreasuryAvailableInflowTableRow,
  ): void {

    if (
      this.loadingClassification() ||
      !row?.id ||
      row.status !== 'unmatched' ||
      !row.classification ||
      !row.requires_classification_review
    ) {
      return;
    }


    this.loadingClassification.set(
      true,
    );


    this.accountsReceivableService
      .updateBankMovementClassification(
        row.id,
        {
          classification:
            row.classification as
            entity.TreasuryBankMovementInflowReviewClassification,

          reason:
            'Clasificación revisada y confirmada desde Cuentas por cobrar.',
        },
      )
      .pipe(
        finalize(() =>
          this.loadingClassification.set(
            false,
          ),
        ),
      )
      .subscribe({
        next: (response) => {

          if (!response?.success) {
            return;
          }

          this.loadAvailableInflows();
        },

        error: (
          error: unknown,
        ) => {

          console.error(
            'Error confirmando clasificación de entrada:',
            error,
          );
        },
      });
  }

  openManualClose(
    movement:
      TreasuryAvailableInflowTableRow,
  ): void {

    if (
      !this.permissionsService.isAdmin() ||
      !movement?.id ||
      Number(
        movement.available_amount ??
        0,
      ) <= 0
    ) {

      return;
    }


    const modalData:
      entity.TreasuryReceivableManualCloseModalData = {

      movement,

    };


    this.dialogService
      .open(
        ModalAccountsReceivableManualClose,
        modalData,
        'medium',
      )
      .afterClosed()
      .subscribe(
        (
          result:
            | entity.TreasuryReceivableMovementMutationResponse
            | null,
        ) => {

          if (
            !result?.success
          ) {

            return;
          }


          /*
           * El residual quedó cerrado y el movimiento
           * dejará de formar parte de available-inflows.
           *
           * También limpiamos las CxC seleccionadas
           * porque ya no pueden utilizar ese movimiento.
           */
          this.clearCollectionSelection();


          /*
           * Refrescamos ambos paneles.
           */
          this.loadAvailableInflows();

          this.loadPendingReceivables();
        },
      );
  }


  private selectMovement(
    row:
      TreasuryAvailableInflowTableRow,
  ): void {

    if (
      !row.is_collectable ||
      row
        .requires_classification_review
    ) {

      return;
    }

    const current =
      this.selectedMovement();

    if (
      current &&
      current.id !==
      row.id
    ) {

      this.selectedApplications.set(
        new Map<
          number,
          number
        >(),
      );

      this.selectedReceivables.set(
        new Map<
          number,
          TreasuryPendingReceivableTableRow
        >(),
      );
    }

    this.selectedMovement.set(
      row,
    );
  }


  // =======================================================
  // ACCIONES: CxC
  // =======================================================

  onReceivableTableAction(
    event:
      DataTableActionEvent<
        TreasuryPendingReceivableTableRow
      >,
  ): void {

    switch (event.type) {

      case 'receivableHistory':

        this.openReceivableHistory(
          event.row,
        );

        break;

      case 'addReceivable':

        this.addReceivable(
          event.row,
        );

        break;


      case 'removeReceivable':

        this.removeReceivable(
          event.row,
        );

        break;
    }
  }

  private openReceivableHistory(
    row:
      TreasuryPendingReceivableTableRow,
  ): void {

    if (
      !row?.id ||
      !row.has_treasury_history
    ) {

      return;
    }


    const modalData:
      entity.TreasuryReceivableHistoryModalData = {

      receivable:
        row,
    };


    this.dialogService
      .open(
        ModalReceivableHistory,
        modalData,
        'large',
      )
      .afterClosed()
      .subscribe(
        (
          changed:
            boolean |
            undefined,
        ) => {

          if (
            !changed
          ) {

            return;
          }


          this.clearCollectionSelection();

          this.reloadCollectionTables();
        },
      );
  }

  private addReceivable(
    row:
      TreasuryPendingReceivableTableRow,
  ): void {

    const movement =
      this.selectedMovement();

    if (!movement) {
      return;
    }

    if (
      row
        .requires_legacy_migration
    ) {

      return;
    }

    if (
      this
        .selectedReceivables()
        .has(
          row.id,
        )
    ) {

      return;
    }

    if (
      this
        .selectedMovementRemaining() <=
      0
    ) {

      return;
    }

    this.selectedReceivables
      .update(
        (
          current,
        ) => {

          const next =
            new Map(
              current,
            );

          next.set(
            row.id,
            row,
          );

          return next;
        },
      );

    this.recalculateSelectedApplications();
  }


  private removeReceivable(
    row:
      TreasuryPendingReceivableTableRow,
  ): void {

    this.selectedReceivables
      .update(
        (
          current,
        ) => {

          const next =
            new Map(
              current,
            );

          next.delete(
            row.id,
          );

          return next;
        },
      );

    this.recalculateSelectedApplications();
  }


  // =======================================================
  // DISTRIBUCIÓN AUTOMÁTICA
  // =======================================================

  private recalculateSelectedApplications():
    void {

    const movement =
      this.selectedMovement();

    if (!movement) {

      this.selectedApplications.set(
        new Map<
          number,
          number
        >(),
      );

      return;
    }

    let remaining =
      roundMoney(
        Number(
          movement
            .available_amount ??
          0,
        ),
      );

    const applications =
      new Map<
        number,
        number
      >();


    /*
     * Map conserva el orden de inserción.
     *
     * Por lo tanto, el disponible del movimiento
     * se distribuye en el mismo orden en que el
     * usuario agregó las CxC.
     */
    for (
      const [
        receivableId,
        receivable,
      ]
      of this
        .selectedReceivables()
    ) {

      if (
        remaining <=
        0
      ) {
        break;
      }

      const pending =
        roundMoney(
          Number(
            receivable
              .pending_amount ??
            0,
          ),
        );

      if (
        pending <=
        0
      ) {
        continue;
      }

      const amountToApply =
        roundMoney(
          Math.min(
            remaining,
            pending,
          ),
        );

      if (
        amountToApply <=
        0
      ) {
        continue;
      }

      applications.set(
        receivableId,
        amountToApply,
      );

      remaining =
        roundMoney(
          remaining -
          amountToApply,
        );
    }

    this.selectedApplications.set(
      applications,
    );
  }


  // =======================================================
  // PREPARAR COBRO
  // =======================================================

  prepareCollection():
    void {

    const movement =
      this.selectedMovement();


    if (
      !movement ||
      !this.canPrepareCollection()
    ) {

      return;
    }


    const selectedRows =
      this.selectedReceivables();


    const applications:
      entity.TreasuryApplyCollectionModalApplication[] =
      [];


    for (
      const [
        receivableId,
        amount,
      ]
      of this
        .selectedApplications()
        .entries()
    ) {

      const receivable =
        selectedRows.get(
          receivableId,
        );


      if (!receivable) {
        continue;
      }


      applications.push({
        receivable,

        amount:
          roundMoney(
            amount,
          ),
      });
    }

    // =====================================================
    // VALIDAR CONSISTENCIA DE LA SELECCIÓN
    // =====================================================

    if (
      applications.length !==
      this.selectedApplicationsCount()
    ) {

      this.dialogService
        .confirm({
          title:
            'Selección incompleta',

          message:
            'No fue posible recuperar todas las cuentas por cobrar seleccionadas. Quita la selección y vuelve a intentarlo.',

          confirmText:
            'Aceptar',

          cancelText:
            '',
        })
        .subscribe();


      return;
    }


    // =====================================================
    // DATA DEL MODAL
    // =====================================================

    const modalData:
      entity.TreasuryApplyCollectionModalData = {

      movement,

      applications,
    };


    // =====================================================
    // ABRIR MODAL
    // =====================================================

    this.dialogService
      .open(
        ModalTreasuryAccountsReceivable,
        modalData,
        'medium',
      )
      .afterClosed()
      .subscribe(
        (
          saved:
            boolean |
            null |
            undefined,
        ) => {

          if (!saved) {
            return;
          }


          // El cobro ya fue guardado.
          this.clearCollectionSelection();


          // Refrescamos movimiento y CxC.
          this.reloadCollectionTables();
        },
      );
  }

  // =======================================================
  // LIMPIAR SELECCIÓN
  // =======================================================

  clearCollectionSelection():
    void {

    this.selectedMovement.set(
      null,
    );

    this.selectedApplications.set(
      new Map<
        number,
        number
      >(),
    );

    this.selectedReceivables.set(
      new Map<
        number,
        TreasuryPendingReceivableTableRow
      >(),
    );
  }


  // =======================================================
  // REFRESCAR AMBOS PANELES
  // Será utilizado después por apply/reverse/close.
  // =======================================================

  reloadCollectionTables():
    void {

    this.loadAvailableInflows();

    this.loadPendingReceivables();
  }


  // =======================================================
  // STORAGE
  // =======================================================

  private restoreFiltersFromStorage():
    void {

    const savedInflows =
      this.storage.getItem<
        TreasuryAvailableInflowUiFilters
      >(
        AVAILABLE_INFLOWS_FILTERS_KEY,
      );

    if (savedInflows) {

      this.inflowFilterForm
        .patchValue(
          {
            dateRange:
              savedInflows
                .dateRange,

            search:
              savedInflows
                .search,

            amount:
              savedInflows.amount ?? null,

            company_id:
              savedInflows
                .company_id,

            bank_id:
              savedInflows
                .bank_id,

            bank_account_id:
              savedInflows
                .bank_account_id,
          },
          {
            emitEvent:
              false,
          },
        );

      this.inflowFilters =
        this.buildInflowBackendFiltersFromUi(
          savedInflows,
        );
    }


    const savedReceivables =
      this.storage.getItem<
        TreasuryPendingReceivableUiFilters
      >(
        PENDING_RECEIVABLES_FILTERS_KEY,
      );

    if (savedReceivables) {

      this.receivableFilterForm
        .patchValue(
          {
            dateRange:
              savedReceivables
                .dateRange,

            search:
              savedReceivables
                .search,

            project_id:
              savedReceivables
                .project_id,

            company_code:
              savedReceivables
                .company_code,
          },
          {
            emitEvent:
              false,
          },
        );

      this.receivableFilters =
        this.buildReceivableBackendFiltersFromUi(
          savedReceivables,
        );
    }
  }


  private saveInflowFiltersToStorage(
    state?:
      TreasuryAvailableInflowUiFilters,
  ): void {

    if (!state) {

      const value =
        this.inflowFilterForm
          .getRawValue();

      state = {

        amount:
          this.normalizeAmountFilter(
            value.amount,
          ),

        dateRange:
          value.dateRange ??
          null,

        search:
          value.search ??
          '',

        company_id:
          value.company_id ??
          null,

        bank_id:
          value.bank_id ??
          null,

        bank_account_id:
          value.bank_account_id ??
          null,

        page:
          this
            .inflowFilters
            .page,

        limit:
          this
            .inflowFilters
            .limit,
      };
    }

    this.storage.setItem(
      AVAILABLE_INFLOWS_FILTERS_KEY,
      state,
    );
  }


  private saveReceivableFiltersToStorage(
    state?:
      TreasuryPendingReceivableUiFilters,
  ): void {

    if (!state) {

      const value =
        this.receivableFilterForm
          .getRawValue();

      state = {

        dateRange:
          value.dateRange ??
          null,

        amount:
          this.normalizeAmountFilter(
            value.amount,
          ),

        search:
          value.search ??
          '',

        project_id:
          value.project_id ??
          null,

        company_code:
          value.company_code ??
          null,

        page:
          this
            .receivableFilters
            .page,

        limit:
          this
            .receivableFilters
            .limit,
      };
    }

    this.storage.setItem(
      PENDING_RECEIVABLES_FILTERS_KEY,
      state,
    );
  }


  // =======================================================
  // HELPERS
  // =======================================================

  private getCatalogValue(
    value:
      | Catalog
      | number
      | string
      | null
      | undefined,
  ):
    number |
    string |
    null {

    if (
      value ===
      null ||
      value ===
      undefined ||
      value ===
      ''
    ) {

      return null;
    }

    if (
      typeof value ===
      'number' ||
      typeof value ===
      'string'
    ) {

      return value;
    }

    return value.id;
  }


  private getNumberId(
    value:
      unknown,
  ): number | null {

    const raw =
      this.getCatalogValue(
        value as
        | Catalog
        | number
        | string
        | null,
      );

    if (
      raw ===
      null
    ) {

      return null;
    }

    const parsed =
      Number(
        raw,
      );

    if (
      !Number.isInteger(
        parsed,
      ) ||
      parsed <=
      0
    ) {

      return null;
    }

    return parsed;
  }


  private getBankAccountDisplay(
    row:
      entity.TreasuryAvailableInflow,
  ): string {

    const alias =
      row.bank_account
        ?.alias
        ?.trim();

    const identifier =
      row.bank_account
        ?.account_identifier
        ?.trim();

    if (
      alias &&
      identifier
    ) {

      return (
        `${alias} · ${identifier}`
      );
    }

    if (alias) {
      return alias;
    }

    if (identifier) {
      return identifier;
    }

    return 'Sin cuenta';
  }


  private getMovementStatusLabel(
    status:
      string |
      null |
      undefined,
  ): string {

    switch (status) {

      case 'unmatched':
        return 'Sin conciliar';

      case 'partially_matched':
        return 'Parcial';

      case 'matched':
        return 'Conciliado';

      case 'manually_closed':
        return 'Cerrado manualmente';

      case 'cancelled':
        return 'Cancelado';

      default:
        return (
          status ||
          'Sin estatus'
        );
    }
  }


  private getReceivableStatusLabel(
    status:
      entity.TreasuryAccountsReceivableFinancialStatus,
  ): string {

    switch (status) {

      case 'partial':
        return 'Parcial';

      case 'collected':
        return 'Cobrada';

      case 'pending':
      default:
        return 'Pendiente';
    }
  }


  /**
   * No mantenemos un catálogo paralelo
   * hardcodeado de clasificaciones.
   *
   * Solo convertimos el código recibido
   * por backend a una etiqueta legible.
   */
  private getClassificationLabel(
    classification:
      string |
      null |
      undefined,
  ): string {

    if (
      !classification
        ?.trim()
    ) {

      return 'Sin clasificación';
    }

    const normalized =
      classification
        .trim()
        .replace(
          /_/g,
          ' ',
        );

    return (
      normalized
        .charAt(
          0,
        )
        .toUpperCase() +
      normalized.slice(
        1,
      )
    );
  }


  private toggleClassificationSelection(
    row:
      TreasuryAvailableInflowTableRow,
  ): void {

    if (
      !row?.id ||
      row.status !== 'unmatched'
    ) {
      return;
    }

    const movementId =
      String(
        row.id,
      );

    const isSelected =
      this
        .selectedClassificationMovements()
        .has(
          movementId,
        );

    this
      .selectedClassificationMovements
      .update(
        (current) => {

          const next =
            new Map(
              current,
            );

          if (
            isSelected
          ) {

            next.delete(
              movementId,
            );

          } else {

            next.set(
              movementId,
              {
                ...row,

                classification_selected:
                  true,
              },
            );
          }

          return next;
        },
      );

    this.availableInflowRows =
      this.availableInflowRows.map(
        (
          movement,
        ) => {

          if (
            String(
              movement.id,
            ) !==
            movementId
          ) {
            return movement;
          }

          return {
            ...movement,

            classification_selected:
              !isSelected,
          };
        },
      );
  }


  clearClassificationSelection():
    void {

    if (
      this
        .selectedClassificationMovements()
        .size === 0
    ) {
      return;
    }

    this
      .selectedClassificationMovements
      .set(
        new Map<
          string,
          TreasuryAvailableInflowTableRow
        >(),
      );

    this.availableInflowRows =
      this.availableInflowRows.map(
        (
          movement,
        ) => ({
          ...movement,

          classification_selected:
            false,
        }),
      );
  }

  openBulkClassificationModal():
    void {

    if (
      this.loadingClassification()
    ) {
      return;
    }

    const movements =
      this.selectedClassificationRows();

    if (
      movements.length === 0
    ) {
      return;
    }

    const modalData:
      entity.TreasuryBulkBankMovementClassificationModalData = {

      movements:
        [...movements],
    };

    const movementIds =
      movements.map(
        (
          movement,
        ) =>
          String(
            movement.id,
          ),
      );

    this.dialogService
      .open(
        ModalAccountsReceivableBulkClassification,
        modalData,
        'medium',
      )
      .afterClosed()
      .subscribe(
        (
          result:
            | entity.TreasuryUpdateBankMovementsClassificationResponse
            | null,
        ) => {

          if (
            !result?.success
          ) {
            return;
          }

          const selectedCollectionMovement =
            this.selectedMovement();

          if (
            selectedCollectionMovement &&
            movementIds.includes(
              String(
                selectedCollectionMovement.id,
              ),
            )
          ) {

            this.clearCollectionSelection();
          }

          this.clearClassificationSelection();

          this.loadAvailableInflows();
        },
      );
  }

  confirmSelectedClassifications():
    void {

    if (
      this.loadingClassification() ||
      !this.canConfirmSelectedClassifications()
    ) {
      return;
    }

    const rows =
      this.selectedClassificationRows();

    if (
      rows.length === 0
    ) {
      return;
    }

    const movementIds =
      rows.map(
        (
          row,
        ) =>
          String(
            row.id,
          ),
      );

    this.loadingClassification.set(
      true,
    );

    this.accountsReceivableService
      .confirmBankMovementsClassification({
        movement_ids:
          movementIds,

        reason:
          'Clasificaciones revisadas y confirmadas de forma masiva desde Cuentas por cobrar.',
      })
      .pipe(
        finalize(
          () =>
            this
              .loadingClassification
              .set(
                false,
              ),
        ),
      )
      .subscribe({

        next: (
          response,
        ) => {

          if (
            !response?.success
          ) {
            return;
          }

          const selectedCollectionMovement =
            this.selectedMovement();

          if (
            selectedCollectionMovement &&
            movementIds.includes(
              String(
                selectedCollectionMovement.id,
              ),
            )
          ) {
            this.clearCollectionSelection();
          }

          this.clearClassificationSelection();

          this.loadAvailableInflows();
        },

        error: (
          error:
            unknown,
        ) => {

          console.error(
            'Error confirmando clasificaciones masivas de entradas:',
            error,
          );
        },
      });
  }

  private isReviewClassification(
    classification:
      string |
      null |
      undefined,
  ): classification is
    entity.TreasuryBankMovementInflowReviewClassification {

    return (
      classification ===
      'transferencia_entrada' ||
      classification ===
      'traspaso_interno_entrada' ||
      classification ===
      'pago_tercero' ||
      classification ===
      'prestamo'
    );
  }

  openMovementHistory(
    movement:
      TreasuryAvailableInflowTableRow,
  ): void {

    if (
      !movement?.id
    ) {
      return;
    }

    const modalData:
      entity.TreasuryReceivableBankMovementHistoryModalData = {

      movement_id:
        String(
          movement.id,
        ),
    };

    this.dialogService
      .open(
        ModalReceivableMovementHistory,
        modalData,
        'large',
      );
  }

  private normalizeAmountFilter(
    value: unknown,
  ): number | null {

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    const amount =
      Number(value);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return null;
    }

    return roundMoney(amount);
  }
}