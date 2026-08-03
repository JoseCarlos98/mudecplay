import { CommonModule } from '@angular/common';

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

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import {
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';

// UI compartida
import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';

import {
  ModuleHeaderConfig,
} from '../../../../shared/ui/module-header/interfaces/module-header-interface';

import { DataTable } from '../../../../shared/ui/data-table/data-table';

import {
  ColumnsConfig,
  ColumnVariant,
  DataTableActionEvent,
  DataTableExtraAction,
} from '../../../../shared/ui/data-table/interfaces/table-interfaces';

import { InputField } from '../../../../shared/ui/input-field/input-field';
import { InputSelect } from '../../../../shared/ui/input-select/input-select';

import {
  DateRangeValue,
  InputDate,
} from '../../../../shared/ui/input-date/input-date';

import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';

import { LoadingOverlay } from '../../../../shared/ui/loading-overlay/loading-overlay';

// Servicios compartidos
import { CatalogsService } from '../../../../shared/services/catalogs.service';

import { LocalStorageService } from '../../../../shared/services/local-storage.service';

// Interfaces compartidas
import { Catalog } from '../../../../shared/interfaces/general-interfaces';

// Módulo
import * as entity from './interfaces/treasury-accounts-payable.interfaces';

import {
  TreasuryAccountsPayableService,
} from './services/treasury-accounts-payable.service';
import { roundMoney } from '../../../../shared/helpers/general-helpers';
import { DialogService } from '../../../../shared/services/dialog.service';
import { ModalTreasuryAccountsPayable } from './components/modal-treasury-accounts-payable/modal-treasury-accounts-payable';
import { ModalAccountsPayableHistory } from './components/modal-accounts-payable-history/modal-accounts-payable-history';
import { ModalAccountsPayableManualClose } from './components/modal-accounts-payable-manual-close/modal-accounts-payable-manual-close';
import { ModalRegularizeHistoricalPayment } from './components/modal-regularize-historical-payment/modal-regularize-historical-payment';
import { ModalReopenHistoricalRegularization } from './components/modal-reopen-historical-regularization/modal-reopen-historical-regularization';
import { ModalHistoricalPaymentHistory } from './components/modal-historical-payment-history/modal-historical-payment-history';
import { ModalExpenseItemPaymentHistory } from './components/modal-expense-item-payment-history/modal-expense-item-payment-history';
import { ModalCashPayment } from './components/modal-cash-payment/modal-cash-payment';
import { PermissionsService } from '../../../../auth/services/permissions.service';

// =========================================================
// STORAGE
// =========================================================

const AVAILABLE_OUTFLOWS_FILTERS_KEY =
  'mp_treasury_accounts_payable_outflows_v1';

const PENDING_EXPENSE_ITEMS_FILTERS_KEY =
  'mp_treasury_accounts_payable_pending_items_v1';

const HISTORICAL_PENDING_FILTERS_KEY =
  'mp_treasury_accounts_payable_historical_pending_v1';

const HISTORICAL_REGULARIZED_FILTERS_KEY =
  'mp_treasury_accounts_payable_historical_regularized_v1';

const DEFAULT_HISTORICAL_PAYMENTS_LIMIT = 10;
// =========================================================
// HEADER
// =========================================================

const HEADER_CONFIG: ModuleHeaderConfig = {};

// =========================================================
// OPCIONES
// =========================================================

const ITEM_TYPE_OPTIONS: Catalog[] = [
  {
    id: 'direct',
    name: 'Directo',
  },
  {
    id: 'warehouse',
    name: 'Almacén',
  },
];

const REGULARIZATION_TYPE_OPTIONS: Catalog[] = [
  {
    id: 'bank_transfer_matched',
    name: 'Transferencia conciliada',
  },
  {
    id: 'historical_transfer_without_movement',
    name: 'Transferencia sin movimiento',
  },
  {
    id: 'cash',
    name: 'Efectivo',
  },
];

const MISSING_PAYMENT_DATE_OPTIONS: Catalog[] = [
  {
    id: '',
    name: 'Todas las fechas',
  },
  {
    id: 'true',
    name: 'Solo sin fecha',
  },
  {
    id: 'false',
    name: 'Solo con fecha',
  },
];

// =========================================================
// COLUMNAS: MOVIMIENTOS
// Ordenadas según su importancia para la conciliación.
// =========================================================

const AVAILABLE_OUTFLOW_COLUMNS: ColumnsConfig[] = [
  {
    key: 'movement_date',
    label: 'Fecha',
    type: 'date',
  },
  {
    key: 'available_amount',
    label: 'Disponible',
    type: 'money',
    align: 'right',
  },
  {
    key: 'description_original',
    label: 'Descripción',
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
    key: 'company_name',
    label: 'Empresa',
  },
  {
    key: 'reference_display',
    label: 'Referencia',
  },
  {
    key: 'amount',
    label: 'Monto original',
    type: 'money',
    align: 'right',
  },
  {
    key: 'status_label',
    label: 'Estatus',
    type: 'chip',
    variantResolver: (
      row: entity.TreasuryAvailableOutflowTableRow,
    ) => resolveAvailableOutflowStatusVariant(row),
  },
];

const AVAILABLE_OUTFLOW_DISPLAYED_COLUMNS = [
  ...AVAILABLE_OUTFLOW_COLUMNS.map(
    (column) => column.key,
  ),
  'actions',
];

// =========================================================
// COLUMNAS: CONCEPTOS
// =========================================================

const PENDING_EXPENSE_ITEM_COLUMNS: ColumnsConfig[] = [
  {
    key: 'expense_date',
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
    key: 'amount',
    label: 'Monto',
    type: 'money',
    align: 'right',
  },
  {
    key: 'paid_amount',
    label: 'Pagado',
    type: 'money',
    align: 'right',
  },
  {
    key: 'internal_folio',
    label: 'Folio',
  },
  {
    key: 'concept',
    label: 'Concepto',
  },
  {
    key: 'supplier_display_name',
    label: 'Proveedor',
  },


  {
    key: 'project_name',
    label: 'Proyecto',
  },
  {
    key: 'item_type_label',
    label: 'Tipo',
    type: 'chip',
    variantResolver: (
      row: entity.TreasuryPendingExpenseItemTableRow,
    ) => resolveExpenseItemTypeVariant(row),
  },

  {
    key: 'payment_status_label',
    label: 'Estatus',
    type: 'chip',
    variantResolver: (
      row: entity.TreasuryPendingExpenseItemTableRow,
    ) => resolvePendingPaymentStatusVariant(row),
  },
];

const PENDING_EXPENSE_ITEM_DISPLAYED_COLUMNS = [
  ...PENDING_EXPENSE_ITEM_COLUMNS.map(
    (column) => column.key,
  ),
  'actions',
];

// =========================================================
// COLUMNAS: HISTÓRICOS
// =========================================================

const HISTORICAL_PAYMENT_COLUMNS: ColumnsConfig[] = [
  {
    key: 'payment_date_display',
    label: 'Fecha pago',
  },
  {
    key: 'internal_folio',
    label: 'Folio',
  },
  {
    key: 'supplier_display_name',
    label: 'Proveedor',
  },
  {
    key: 'project_name',
    label: 'Proyecto',
  },
  {
    key: 'concept',
    label: 'Concepto',
  },
  {
    key: 'amount',
    label: 'Importe',
    type: 'money',
    align: 'right',
  },
  {
    key: 'payment_method_label',
    label: 'Método',
    type: 'chip',
    variantResolver: (
      row: entity.TreasuryHistoricalPaymentTableRow,
    ) => resolveHistoricalPaymentMethodVariant(row),
  },
  {
    key: 'company_name',
    label: 'Empresa',
  },
  {
    key: 'regularization_status_label',
    label: 'Regularización',
    type: 'chip',
    variantResolver: (
      row: entity.TreasuryHistoricalPaymentTableRow,
    ) => resolveRegularizationStatusVariant(row),
  },
];

const HISTORICAL_PAYMENT_DISPLAYED_COLUMNS = [
  ...HISTORICAL_PAYMENT_COLUMNS.map(
    (column) => column.key,
  ),
  'actions',
];

// =========================================================
// RESOLVERS DE CHIPS
// =========================================================

function resolveAvailableOutflowStatusVariant(
  row: entity.TreasuryAvailableOutflowTableRow,
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

function resolveExpenseItemTypeVariant(
  row: entity.TreasuryPendingExpenseItemTableRow,
): ColumnVariant {
  return row.item_type === 'warehouse'
    ? 'chip-warning'
    : 'chip-neutral';
}

function resolvePendingPaymentStatusVariant(
  row: entity.TreasuryPendingExpenseItemTableRow,
): ColumnVariant {
  return row.payment_status === 'partial'
    ? 'chip-warning'
    : 'chip-danger';
}

function resolveHistoricalPaymentMethodVariant(
  row: entity.TreasuryHistoricalPaymentTableRow,
): ColumnVariant {
  switch (row.payment_method) {
    case 'transfer':
      return 'chip-success';

    case 'cash':
      return 'chip-warning';

    case 'unknown':
    default:
      return 'chip-neutral';
  }
}

function resolveRegularizationStatusVariant(
  row: entity.TreasuryHistoricalPaymentTableRow,
): ColumnVariant {
  return row.regularization_status === 'regularized'
    ? 'chip-success'
    : 'chip-warning';
}

type AccountsPayableTab =
  | 'pending'
  | 'historical_pending'
  | 'historical_regularized';

@Component({
  selector: 'app-treasury-accounts-payable',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    ModuleHeader,
    DataTable,
    InputDate,
    InputField,
    InputSelect,
    BtnsSection,
    LoadingOverlay,

    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './treasury-accounts-payable.html',
  styleUrl: './treasury-accounts-payable.scss',
})
export class TreasuryAccountsPayable
  implements OnInit {

  // =========================================================
  // INYECCIONES
  // =========================================================

  private readonly dialogService = inject(DialogService);

  private readonly permissionsService =
    inject(PermissionsService);

  private readonly accountsPayableService =
    inject(TreasuryAccountsPayableService);

  private readonly catalogsService =
    inject(CatalogsService);

  private readonly storage =
    inject(LocalStorageService);

  private readonly fb =
    inject(FormBuilder);

  // =========================================================
  // UI
  // =========================================================

  readonly headerConfig = HEADER_CONFIG;

  readonly activeTab =
    signal<AccountsPayableTab>('pending');

  readonly availableOutflowColumns =
    AVAILABLE_OUTFLOW_COLUMNS;

  readonly availableOutflowDisplayedColumns =
    AVAILABLE_OUTFLOW_DISPLAYED_COLUMNS;

  readonly pendingExpenseItemColumns =
    PENDING_EXPENSE_ITEM_COLUMNS;

  readonly pendingExpenseItemDisplayedColumns =
    PENDING_EXPENSE_ITEM_DISPLAYED_COLUMNS;

  readonly historicalPaymentColumns =
    HISTORICAL_PAYMENT_COLUMNS;

  readonly historicalPaymentDisplayedColumns =
    HISTORICAL_PAYMENT_DISPLAYED_COLUMNS;

  readonly itemTypeOptions =
    ITEM_TYPE_OPTIONS;

  readonly regularizationTypeOptions =
    REGULARIZATION_TYPE_OPTIONS;

  readonly missingPaymentDateOptions =
    MISSING_PAYMENT_DATE_OPTIONS;

  readonly tableActionPermissions = {
    showEdit: false,
    showDelete: false,
  };

  // =========================================================
  // LOADING
  // =========================================================

  readonly loadingCatalogs =
    signal(false);

  readonly loadingOutflows =
    signal(false);

  readonly loadingPendingItems =
    signal(false);

  readonly loadingHistorical =
    signal(false);

  /*
   * Identifica la solicitud histórica más reciente.
   * Evita que una respuesta anterior sobrescriba
   * los datos de la pestaña actualmente seleccionada.
   */
  private historicalRequestSequence = 0;

  readonly loadingPage = computed(
    () =>
      this.loadingCatalogs() ||
      this.loadingOutflows() ||
      this.loadingPendingItems() ||
      this.loadingHistorical(),
  );

  // =========================================================
  // CATÁLOGOS
  // =========================================================

  companyOptions: Catalog[] = [];
  bankOptions: Catalog[] = [];
  bankAccountOptions: Catalog[] = [];

  // Se dejan preparados para cuando agreguemos
  // proveedor y proyecto a los filtros.
  supplierOptions: Catalog[] = [];
  projectOptions: Catalog[] = [];

  // =========================================================
  // FILTROS BACKEND
  // =========================================================

  outflowFilters:
    entity.TreasuryAvailableOutflowFilters = {
      page: 1,
      limit: 10,
      search: '',
      company_id: null,
      bank_id: null,
      bank_account_id: null,
      date_from: null,
      date_to: null,
    };

  pendingItemFilters:
    entity.TreasuryPendingExpenseItemFilters = {
      page: 1,
      limit: 10,
      search: '',
      supplier_id: null,
      project_id: null,
      item_type: null,
      date_from: null,
      date_to: null,
    };

  historicalFilters:
    entity.TreasuryHistoricalPaymentFilters = {
      page: 1,
      limit: 10,
      search: '',
      supplier_id: null,
      project_id: null,
      regularization_status: 'pending',
      regularization_type: null,
      missing_payment_date: null,
      date_from: null,
      date_to: null,
    };

  // =========================================================
  // FORMULARIOS UI
  // =========================================================

  readonly outflowFilterForm =
    this.fb.group({
      dateRange:
        this.fb.control<DateRangeValue | null>(null),

      search:
        this.fb.control<string>(''),

      company_id:
        this.fb.control<
          Catalog | number | string | null
        >(null),

      bank_id:
        this.fb.control<
          Catalog | number | string | null
        >(null),

      bank_account_id:
        this.fb.control<
          Catalog | number | string | null
        >(null),
    });

  readonly pendingItemFilterForm =
    this.fb.group({
      dateRange:
        this.fb.control<DateRangeValue | null>(null),

      search:
        this.fb.control<string>(''),

      supplier_id:
        this.fb.control<
          Catalog | number | string | null
        >(null),

      project_id:
        this.fb.control<
          Catalog | number | string | null
        >(null),

      item_type:
        this.fb.control<
          entity.TreasuryPendingExpenseItemType | ''
        >(''),
    });

  readonly historicalFilterForm =
    this.fb.group({
      dateRange:
        this.fb.control<DateRangeValue | null>(null),

      search:
        this.fb.control<string>(''),

      supplier_id:
        this.fb.control<
          Catalog | number | string | null
        >(null),

      project_id:
        this.fb.control<
          Catalog | number | string | null
        >(null),

      regularization_status:
        this.fb.control<
          entity.TreasuryHistoricalRegularizationStatus
          | ''
        >('pending'),

      regularization_type:
        this.fb.control<
          entity.TreasuryHistoricalRegularizationType
          | ''
        >(''),

      missing_payment_date:
        this.fb.control<
          'true' | 'false' | ''
        >(''),
    });

  // =========================================================
  // RESPUESTAS
  // =========================================================

  outflowsTableData:
    entity.TreasuryAvailableOutflowsResponse = {
      data: [],
      summary: {
        movements_count: 0,
        available_amount: 0,
      },
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        total_pages: 0,
      },
    };

  pendingItemsTableData:
    entity.TreasuryPendingExpenseItemsResponse = {
      data: [],
      summary: {
        items_count: 0,
        original_amount: 0,
        paid_amount: 0,
        pending_amount: 0,
      },
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        total_pages: 0,
      },
    };

  historicalTableData:
    entity.TreasuryHistoricalPaymentsResponse = {
      data: [],
      summary: {
        payments_count: 0,
        total_amount: 0,
        missing_payment_date_count: 0,
        regularization_status: 'pending',
      },
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        total_pages: 0,
      },
    };

  availableOutflowRows:
    entity.TreasuryAvailableOutflowTableRow[] = [];

  pendingExpenseItemRows:
    entity.TreasuryPendingExpenseItemTableRow[] = [];

  historicalPaymentRows:
    entity.TreasuryHistoricalPaymentTableRow[] = [];

  // =========================================================
  // SELECCIÓN PARA PAGO
  // =========================================================

  readonly selectedMovement =
    signal<entity.TreasuryAvailableOutflowTableRow | null>(
      null,
    );

  readonly selectedApplications =
    signal<Map<number, number>>(
      new Map<number, number>(),
    );

  readonly selectedExpenseItems =
    signal<
      Map<
        number,
        entity.TreasuryPendingExpenseItemTableRow
      >
    >(
      new Map<
        number,
        entity.TreasuryPendingExpenseItemTableRow
      >(),
    );

  readonly selectedApplicationsCount =
    computed(
      () => this.selectedApplications().size,
    );

  readonly selectedApplicationsTotal =
    computed(() => {
      const total = Array
        .from(
          this.selectedApplications().values(),
        )
        .reduce(
          (sum, amount) =>
            sum + Number(amount || 0),
          0,
        );

      return roundMoney(total);
    });

  readonly selectedConceptsRemaining =
    computed(() => {
      const applications =
        this.selectedApplications();

      const total =
        Array.from(
          this.selectedExpenseItems().entries(),
        ).reduce(
          (
            sum,
            [expenseItemId, item],
          ) => {
            const currentPending =
              roundMoney(
                Number(
                  item.pending_amount || 0,
                ),
              );

            const amountToApply =
              roundMoney(
                Number(
                  applications.get(
                    expenseItemId,
                  ) || 0,
                ),
              );

            const remaining =
              Math.max(
                currentPending -
                amountToApply,
                0,
              );

            return sum + remaining;
          },
          0,
        );

      return roundMoney(total);
    });

  readonly selectedMovementRemaining =
    computed(() => {
      const movement =
        this.selectedMovement();

      if (!movement) {
        return 0;
      }

      const available =
        roundMoney(
          Number(movement.available_amount),
        );

      const remaining =
        available -
        this.selectedApplicationsTotal();

      return roundMoney(
        Math.max(remaining, 0),
      );
    });

  readonly canPreparePayment =
    computed(() => {
      const movement =
        this.selectedMovement();

      if (!movement) return false;

      const amount =
        this.selectedApplicationsTotal();

      return (
        amount > 0 &&
        this.selectedApplicationsCount() > 0 &&
        amount <=
        Number(movement.available_amount)
      );
    });

  // =========================================================
  // ACCIONES DE TABLA
  // =========================================================

  readonly outflowExtraActions:
    DataTableExtraAction<
      entity.TreasuryAvailableOutflowTableRow
    >[] = [
      {
        type: 'selectMovement',
        icon: 'check_circle',
        tooltip: 'Seleccionar movimiento',

        /*
         * El icono para seleccionar solamente aparece
         * cuando esta fila todavía no está seleccionada.
         */
        visible: (row) =>
          this.selectedMovement()?.id !== row.id,
      },
      {
        type: 'clearMovementSelection',
        icon: 'cancel',
        tooltip: 'Deseleccionar movimiento',

        /*
         * La X roja solamente aparece en el movimiento
         * que se encuentra seleccionado actualmente.
         */
        iconClass: 'table-action-icon--danger',

        visible: (row) =>
          this.selectedMovement()?.id === row.id,
      },
      {
        type: 'movementHistory',
        icon: 'history',
        tooltip: 'Ver historial',
      },
      {
        type: 'manualClose',
        icon: 'lock',
        tooltip: 'Cerrar saldo disponible',

        roles: [
          'ADMIN_GENERAL',
        ],

        visible: (row) =>
          Number(
            row.available_amount,
          ) > 0,
      },
    ];

  readonly pendingItemExtraActions:
    DataTableExtraAction<
      entity.TreasuryPendingExpenseItemTableRow
    >[] = [
      {
        type: 'addExpenseItem',
        icon: 'add_circle',
        tooltip: 'Agregar al pago',
        iconClass:
          'table-action-icon--success',

        visible: (row) =>
          !this.selectedApplications().has(
            row.expense_item_id,
          ),

        disabled: () =>
          !this.selectedMovement(),
      },
      {
        type: 'removeExpenseItem',
        icon: 'remove_circle',
        tooltip: 'Quitar del pago',
        iconClass:
          'table-action-icon--danger',

        visible: (row) =>
          this.selectedApplications().has(
            row.expense_item_id,
          ),
      },
      {
        type: 'cashPayment',
        icon: 'payments',
        tooltip:
          'Registrar pago en efectivo',
        iconClass:
          'table-action-icon--success',

        /*
         * Evita registrar efectivo mientras el mismo
         * concepto está preparado para transferencia.
         */
        disabled: (row) =>
          this.selectedApplications().has(
            row.expense_item_id,
          ),
      },
      {
        type: 'expensePaymentHistory',
        icon: 'history',
        tooltip:
          'Ver historial de pagos',
      },
    ];

  readonly historicalExtraActions:
    DataTableExtraAction<
      entity.TreasuryHistoricalPaymentTableRow
    >[] = [
      {
        type: 'regularize',
        icon: 'fact_check',
        tooltip: 'Regularizar pago',
        visible: (row) =>
          row.can_regularize,
      },
      {
        type: 'historicalHistory',
        icon: 'history',
        tooltip: 'Ver historial',
      },
      {
        type:
          'reopenRegularization',
        icon:
          'restart_alt',
        tooltip:
          'Reabrir regularización',
        roles: [
          'ADMIN_GENERAL',
        ],
        visible: (
          row:
            entity.TreasuryHistoricalPaymentTableRow,
        ) =>
          row.can_reopen_regularization,
      },
    ];

  // =========================================================
  // CICLO DE VIDA
  // =========================================================

  ngOnInit(): void {
    this.restoreFiltersFromStorage();
    this.loadCatalogs();

    this.loadAvailableOutflows();
    this.loadPendingExpenseItems();
    this.loadHistoricalPayments();
  }

  // =========================================================
  // TABS
  // =========================================================

  setActiveTab(
    tab: AccountsPayableTab,
  ): void {
    if (
      this.activeTab() === tab
    ) {
      return;
    }

    /*
     * Guarda los filtros de la pestaña que
     * se está abandonando.
     */
    const previousStatus =
      this.getHistoricalStatusForTab(
        this.activeTab(),
      );

    this.saveHistoricalFiltersToStorage(
      undefined,
      previousStatus,
    );

    this.activeTab.set(tab);

    /*
     * Restaura únicamente los filtros
     * pertenecientes a la nueva pestaña.
     */
    const nextStatus =
      this.getHistoricalStatusForTab(
        tab,
      );

    this.restoreHistoricalFilters(
      nextStatus,
    );

    this.loadHistoricalPayments();
  }

  // =========================================================
  // CATÁLOGOS
  // =========================================================

  private loadCatalogs(): void {
    this.loadingCatalogs.set(true);

    forkJoin({
      companies:
        this.catalogsService
          .treasuryCompaniesCatalog(),

      banks:
        this.catalogsService
          .treasuryBanksCatalog(),

      bankAccounts:
        this.catalogsService
          .treasuryBankAccountsCatalog(false),
    })
      .pipe(
        finalize(() =>
          this.loadingCatalogs.set(false),
        ),
      )
      .subscribe({
        next: ({
          companies,
          banks,
          bankAccounts,
        }) => {
          this.companyOptions =
            companies ?? [];

          this.bankOptions =
            banks ?? [];

          this.bankAccountOptions =
            bankAccounts ?? [];
        },
        error: (error: unknown) => {
          console.error(
            'Error cargando catálogos de cuentas por pagar:',
            error,
          );
        },
      });
  }

  get isAdmin(): boolean {
    return this.permissionsService.isAdmin();
  }

  // =========================================================
  // CARGAS
  // =========================================================

  loadAvailableOutflows(): void {
    if (this.loadingOutflows()) return;

    this.loadingOutflows.set(true);

    this.accountsPayableService
      .getAvailableOutflows(
        this.outflowFilters,
      )
      .pipe(
        finalize(() =>
          this.loadingOutflows.set(false),
        ),
      )
      .subscribe({
        next: (
          response:
            entity.TreasuryAvailableOutflowsResponse,
        ) => {
          this.outflowsTableData =
            response;

          this.availableOutflowRows =
            (response.data ?? []).map(
              (
                row:
                  entity.TreasuryAvailableOutflow,
              ) =>
                this.mapAvailableOutflowRow(
                  row,
                ),
            );

          const selected =
            this.selectedMovement();

          if (
            selected &&
            !this.availableOutflowRows.some(
              (row) =>
                row.id === selected.id,
            )
          ) {
            this.clearPaymentSelection();
          }
        },
        error: (error: unknown) => {
          console.error(
            'Error cargando salidas bancarias disponibles:',
            error,
          );
        },
      });
  }

  loadPendingExpenseItems(): void {
    if (this.loadingPendingItems()) return;

    this.loadingPendingItems.set(true);

    this.accountsPayableService
      .getPendingExpenseItems(
        this.pendingItemFilters,
      )
      .pipe(
        finalize(() =>
          this.loadingPendingItems.set(false),
        ),
      )
      .subscribe({
        next: (
          response:
            entity.TreasuryPendingExpenseItemsResponse,
        ) => {
          this.pendingItemsTableData =
            response;

          this.pendingExpenseItemRows =
            (response.data ?? []).map(
              (
                row:
                  entity.TreasuryPendingExpenseItem,
              ) =>
                this.mapPendingExpenseItemRow(
                  row,
                ),
            );
        },
        error: (error: unknown) => {
          console.error(
            'Error cargando conceptos pendientes:',
            error,
          );
        },
      });
  }

  loadHistoricalPayments(): void {
    const requestSequence =
      ++this.historicalRequestSequence;

    /*
     * Se crea una copia para que un cambio posterior
     * de pestaña no modifique los filtros de esta petición.
     */
    const filters = {
      ...this.historicalFilters,
    };

    this.loadingHistorical.set(true);

    this.accountsPayableService
      .getHistoricalPayments(
        filters,
      )
      .pipe(
        finalize(() => {
          /*
           * Una petición anterior no puede apagar
           * el loading de la petición vigente.
           */
          if (
            requestSequence ===
            this.historicalRequestSequence
          ) {
            this.loadingHistorical.set(false);
          }
        }),
      )
      .subscribe({
        next: (
          response:
            entity.TreasuryHistoricalPaymentsResponse,
        ) => {
          /*
           * Ignora respuestas pertenecientes
           * a una pestaña seleccionada anteriormente.
           */
          if (
            requestSequence !==
            this.historicalRequestSequence
          ) {
            return;
          }

          this.historicalTableData =
            response;

          this.historicalPaymentRows =
            (response.data ?? []).map(
              (
                row:
                  entity.TreasuryHistoricalPayment,
              ) =>
                this.mapHistoricalPaymentRow(
                  row,
                ),
            );
        },

        error: (error: unknown) => {
          if (
            requestSequence !==
            this.historicalRequestSequence
          ) {
            return;
          }

          console.error(
            'Error cargando pagos históricos:',
            error,
          );
        },
      });
  }

  // =========================================================
  // MAPEO
  // =========================================================

  private mapAvailableOutflowRow(
    row: entity.TreasuryAvailableOutflow,
  ): entity.TreasuryAvailableOutflowTableRow {
    return {
      ...row,

      company_name:
        row.company?.name ??
        'Empresa no identificada',

      bank_name:
        row.bank?.name ??
        'Sin banco',

      bank_account_display:
        this.getBankAccountDisplay(row),

      reference_display:
        row.bank_reference?.trim() ||
        row.receipt_number?.trim() ||
        row.tracking_key?.trim() ||
        `Movimiento ${row.id}`,

      counterparty_display:
        row.counterparty_name?.trim() ||
        row.counterparty_account?.trim() ||
        'Sin contraparte',

      status_label:
        this.getMovementStatusLabel(
          row.status,
        ),

      classification_label:
        this.getClassificationLabel(
          row.classification,
        ),
    };
  }

  private mapPendingExpenseItemRow(
    row: entity.TreasuryPendingExpenseItem,
  ): entity.TreasuryPendingExpenseItemTableRow {
    return {
      ...row,

      id:
        row.expense_item_id,

      supplier_display_name:
        row.supplier?.display_name ||
        'Sin proveedor',

      project_name:
        row.project?.name?.trim() ||
        'Sin proyecto',

      item_type_label:
        row.item_type === 'warehouse'
          ? 'Almacén'
          : 'Directo',

      payment_status_label:
        row.payment_status === 'partial'
          ? 'Parcial'
          : 'Pendiente',
    };
  }

  private mapHistoricalPaymentRow(
    row: entity.TreasuryHistoricalPayment,
  ): entity.TreasuryHistoricalPaymentTableRow {
    return {
      ...row,

      id:
        row.payment_id,

      payment_date_display:
        row.payment_date ||
        'Sin fecha',

      internal_folio:
        row.expense?.internal_folio ||
        'Sin folio',

      supplier_display_name:
        row.supplier?.display_name ||
        'Sin proveedor',

      project_name:
        row.project?.name?.trim() ||
        'Sin proyecto',

      concept:
        row.expense_item?.concept?.trim() ||
        'Sin concepto',

      payment_method_label:
        this.getHistoricalPaymentMethodLabel(
          row.payment_method,
        ),

      company_name:
        row.company?.name ||
        'Empresa no identificada',

      bank_movement_reference:
        row.bank_movement
          ?.bank_reference ||
        'Sin movimiento',

      regularization_status_label:
        row.regularization_status ===
          'regularized'
          ? 'Regularizado'
          : 'Pendiente',

      regularization_type_label:
        this.getRegularizationTypeLabel(
          row.regularization_type,
        ),
    };
  }

  // =========================================================
  // FILTROS: MOVIMIENTOS
  // =========================================================

  searchAvailableOutflows(): void {
    const value =
      this.outflowFilterForm.getRawValue();

    const uiState:
      entity.TreasuryAvailableOutflowUiFilters = {
      dateRange:
        value.dateRange ?? null,

      search:
        value.search?.trim() || '',

      company_id:
        value.company_id ?? null,

      bank_id:
        value.bank_id ?? null,

      bank_account_id:
        value.bank_account_id ?? null,

      page: 1,
      limit:
        this.outflowFilters.limit,
    };

    this.outflowFilters =
      this.buildOutflowBackendFiltersFromUi(
        uiState,
      );

    this.saveOutflowFiltersToStorage(
      uiState,
    );

    this.loadAvailableOutflows();
  }

  clearAvailableOutflowFilters(): void {
    this.outflowFilterForm.reset(
      {
        dateRange: null,
        search: '',
        company_id: null,
        bank_id: null,
        bank_account_id: null,
      },
      {
        emitEvent: false,
      },
    );

    this.outflowFilters = {
      page: 1,
      limit:
        this.outflowFilters.limit,

      search: '',
      company_id: null,
      bank_id: null,
      bank_account_id: null,
      date_from: null,
      date_to: null,
    };

    this.storage.removeItem(
      AVAILABLE_OUTFLOWS_FILTERS_KEY,
    );

    this.loadAvailableOutflows();
  }

  private buildOutflowBackendFiltersFromUi(
    ui: entity.TreasuryAvailableOutflowUiFilters,
  ): entity.TreasuryAvailableOutflowFilters {
    return {
      page:
        ui.page,

      limit:
        ui.limit,

      search:
        ui.search?.trim() || '',

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
        ui.dateRange?.startDate ??
        null,

      date_to:
        ui.dateRange?.endDate ??
        null,
    };
  }

  onAvailableOutflowPageChange(
    event: PageEvent,
  ): void {
    this.outflowFilters.page =
      event.pageIndex + 1;

    this.outflowFilters.limit =
      event.pageSize;

    this.saveOutflowFiltersToStorage();
    this.loadAvailableOutflows();
  }

  get hasActiveOutflowFilters(): boolean {
    const value =
      this.outflowFilterForm.getRawValue();

    return Boolean(
      value.dateRange?.startDate ||
      value.dateRange?.endDate ||
      value.search?.trim() ||
      this.getCatalogValue(
        value.company_id,
      ) ||
      this.getCatalogValue(
        value.bank_id,
      ) ||
      this.getCatalogValue(
        value.bank_account_id,
      ),
    );
  }

  // =========================================================
  // FILTROS: CONCEPTOS
  // =========================================================

  searchPendingExpenseItems(): void {
    const value =
      this.pendingItemFilterForm.getRawValue();

    const uiState:
      entity.TreasuryPendingExpenseItemUiFilters = {
      dateRange:
        value.dateRange ?? null,

      search:
        value.search?.trim() || '',

      supplier_id:
        value.supplier_id ?? null,

      project_id:
        value.project_id ?? null,

      item_type:
        value.item_type || '',

      page: 1,
      limit:
        this.pendingItemFilters.limit,
    };

    this.pendingItemFilters =
      this.buildPendingItemsBackendFiltersFromUi(
        uiState,
      );

    this.savePendingItemFiltersToStorage(
      uiState,
    );

    this.loadPendingExpenseItems();
  }

  clearPendingExpenseItemFilters(): void {
    this.pendingItemFilterForm.reset(
      {
        dateRange: null,
        search: '',
        supplier_id: null,
        project_id: null,
        item_type: '',
      },
      {
        emitEvent: false,
      },
    );

    this.pendingItemFilters = {
      page: 1,
      limit:
        this.pendingItemFilters.limit,

      search: '',
      supplier_id: null,
      project_id: null,
      item_type: null,
      date_from: null,
      date_to: null,
    };

    this.storage.removeItem(
      PENDING_EXPENSE_ITEMS_FILTERS_KEY,
    );

    this.loadPendingExpenseItems();
  }

  private buildPendingItemsBackendFiltersFromUi(
    ui: entity.TreasuryPendingExpenseItemUiFilters,
  ): entity.TreasuryPendingExpenseItemFilters {
    return {
      page:
        ui.page,

      limit:
        ui.limit,

      search:
        ui.search?.trim() || '',

      supplier_id:
        this.getNumberId(
          ui.supplier_id,
        ),

      project_id:
        this.getNumberId(
          ui.project_id,
        ),

      item_type:
        ui.item_type || null,

      date_from:
        ui.dateRange?.startDate ??
        null,

      date_to:
        ui.dateRange?.endDate ??
        null,
    };
  }

  onPendingExpenseItemPageChange(
    event: PageEvent,
  ): void {
    this.pendingItemFilters.page =
      event.pageIndex + 1;

    this.pendingItemFilters.limit =
      event.pageSize;

    this.savePendingItemFiltersToStorage();
    this.loadPendingExpenseItems();
  }

  get hasActivePendingItemFilters(): boolean {
    const value =
      this.pendingItemFilterForm.getRawValue();

    return Boolean(
      value.dateRange?.startDate ||
      value.dateRange?.endDate ||
      value.search?.trim() ||
      this.getCatalogValue(
        value.supplier_id,
      ) ||
      this.getCatalogValue(
        value.project_id,
      ) ||
      value.item_type,
    );
  }

  // =========================================================
  // FILTROS: HISTÓRICOS
  // =========================================================

  searchHistoricalPayments(): void {
    const value =
      this.historicalFilterForm.getRawValue();

    const regularizationStatus =
      this.getHistoricalStatusForTab();

    const uiState:
      entity.TreasuryHistoricalPaymentUiFilters = {
      dateRange:
        value.dateRange ?? null,

      search:
        value.search?.trim() || '',

      supplier_id:
        value.supplier_id ?? null,

      project_id:
        value.project_id ?? null,

      regularization_status:
        regularizationStatus,

      regularization_type:
        value.regularization_type || '',

      missing_payment_date:
        value.missing_payment_date || '',

      page: 1,

      limit:
        this.historicalFilters.limit,
    };

    this.historicalFilters =
      this.buildHistoricalBackendFiltersFromUi(
        uiState,
      );

    this.saveHistoricalFiltersToStorage(
      uiState,
      regularizationStatus,
    );

    this.loadHistoricalPayments();
  }

  clearHistoricalPaymentFilters(): void {
    const regularizationStatus =
      this.getHistoricalStatusForTab();

    /*
     * Conserva el tamaño de página de esta pestaña.
     */
    const currentLimit =
      this.historicalFilters.limit;

    this.historicalFilterForm.reset(
      {
        dateRange: null,
        search: '',
        supplier_id: null,
        project_id: null,

        regularization_status:
          regularizationStatus,

        regularization_type: '',
        missing_payment_date: '',
      },
      {
        emitEvent: false,
      },
    );

    this.historicalFilters = {
      page: 1,
      limit: currentLimit,

      search: '',

      supplier_id: null,
      project_id: null,

      regularization_status:
        regularizationStatus,

      regularization_type: null,
      missing_payment_date: null,

      date_from: null,
      date_to: null,
    };

    /*
     * Elimina exclusivamente los filtros
     * de la pestaña actual.
     */
    this.storage.removeItem(
      this.getHistoricalFiltersStorageKey(
        regularizationStatus,
      ),
    );

    this.loadHistoricalPayments();
  }

  private buildHistoricalBackendFiltersFromUi(
    ui: entity.TreasuryHistoricalPaymentUiFilters,
  ): entity.TreasuryHistoricalPaymentFilters {
    return {
      page:
        ui.page,

      limit:
        ui.limit,

      search:
        ui.search?.trim() || '',

      supplier_id:
        this.getNumberId(
          ui.supplier_id,
        ),

      project_id:
        this.getNumberId(
          ui.project_id,
        ),

      regularization_status:
        ui.regularization_status ||
        null,

      regularization_type:
        ui.regularization_type ||
        null,

      missing_payment_date:
        ui.missing_payment_date ===
          'true'
          ? true
          : ui.missing_payment_date ===
            'false'
            ? false
            : null,

      date_from:
        ui.dateRange?.startDate ??
        null,

      date_to:
        ui.dateRange?.endDate ??
        null,
    };
  }

  onHistoricalPaymentPageChange(
    event: PageEvent,
  ): void {
    this.historicalFilters.page =
      event.pageIndex + 1;

    this.historicalFilters.limit =
      event.pageSize;

    this.saveHistoricalFiltersToStorage();
    this.loadHistoricalPayments();
  }

  get hasActiveHistoricalFilters(): boolean {
    const value =
      this.historicalFilterForm
        .getRawValue();

    return Boolean(
      value.dateRange?.startDate ||
      value.dateRange?.endDate ||
      value.search?.trim() ||
      this.getCatalogValue(
        value.supplier_id,
      ) ||
      this.getCatalogValue(
        value.project_id,
      ) ||
      value.regularization_type ||
      value.missing_payment_date,
    );
  }

  // =========================================================
  // BTN SECTIONS
  // =========================================================

  onOutflowBtnsSectionAction(
    action: string,
  ): void {
    switch (action) {
      case 'search':
        this.searchAvailableOutflows();
        break;

      case 'clean':
        this.clearAvailableOutflowFilters();
        break;

      default:
        break;
    }
  }

  onPendingBtnsSectionAction(
    action: string,
  ): void {
    switch (action) {
      case 'search':
        this.searchPendingExpenseItems();
        break;

      case 'clean':
        this.clearPendingExpenseItemFilters();
        break;

      default:
        break;
    }
  }

  onHistoricalBtnsSectionAction(
    action: string,
  ): void {
    switch (action) {
      case 'search':
        this.searchHistoricalPayments();
        break;

      case 'clean':
        this.clearHistoricalPaymentFilters();
        break;

      default:
        break;
    }
  }

  // =========================================================
  // ACCIONES: MOVIMIENTOS
  // =========================================================

  onOutflowTableAction(
    event: DataTableActionEvent<
      entity.TreasuryAvailableOutflowTableRow
    >,
  ): void {
    switch (event.type) {
      case 'selectMovement':
        this.selectMovement(event.row);
        break;

      case 'clearMovementSelection':
        /*
         * Limpia el movimiento y también los conceptos
         * que estaban asociados a la selección.
         */
        this.clearPaymentSelection();
        break;

      case 'movementHistory':
        this.openMovementHistory(event.row);
        break;

      case 'manualClose':
        this.openManualClose(event.row);
        break;

      default:
        break;
    }
  }

  private selectMovement(
    row:
      entity.TreasuryAvailableOutflowTableRow,
  ): void {
    const current =
      this.selectedMovement();

    if (
      current &&
      current.id !== row.id
    ) {
      this.selectedApplications.set(
        new Map<number, number>(),
      );

      this.selectedExpenseItems.set(
        new Map<
          number,
          entity.TreasuryPendingExpenseItemTableRow
        >(),
      );
    }

    this.selectedMovement.set(row);
  }

  openMovementHistory(
    movement:
      entity.TreasuryAvailableOutflowTableRow,
  ): void {
    if (!movement?.id) {
      return;
    }

    const modalData:
      entity.TreasuryBankMovementHistoryModalData = {
      movement,
    };

    this.dialogService
      .open(
        ModalAccountsPayableHistory,
        modalData,
        'large',
      )
      .afterClosed()
      .subscribe(
        (
          historyChanged:
            boolean | null,
        ) => {
          if (!historyChanged) {
            return;
          }

          this.clearPaymentSelection();
          this.loadAvailableOutflows();
          this.loadPendingExpenseItems();
        },
      );
  }

  openManualClose(
    movement:
      entity.TreasuryAvailableOutflowTableRow,
  ): void {
    if (
      !this.permissionsService.isAdmin() ||
      !movement?.id ||
      Number(movement.available_amount) <= 0
    ) {
      return;
    }

    const modalData:
      entity.TreasuryManualCloseBankMovementModalData = {
      movement,
    };

    this.dialogService
      .open(
        ModalAccountsPayableManualClose,
        modalData,
        'medium',
      )
      .afterClosed()
      .subscribe(
        (
          result:
            | entity.TreasuryManualCloseBankMovementResponse
            | null,
        ) => {
          if (!result?.success) {
            return;
          }

          /*
           * El movimiento ya no estará disponible,
           * por lo que limpiamos también cualquier
           * concepto que estuviera seleccionado.
           */
          this.clearPaymentSelection();

          /*
           * Se actualizan ambos paneles para conservar
           * el mismo comportamiento general del módulo.
           */
          this.loadAvailableOutflows();
          this.loadPendingExpenseItems();
        },
      );
  }

  // =========================================================
  // ACCIONES: CONCEPTOS
  // =========================================================

  onPendingItemTableAction(
    event:
      DataTableActionEvent<
        entity.TreasuryPendingExpenseItemTableRow
      >,
  ): void {
    switch (event.type) {
      case 'addExpenseItem':
        this.addExpenseItem(
          event.row,
        );
        break;

      case 'removeExpenseItem':
        this.removeExpenseItem(
          event.row,
        );
        break;

      case 'cashPayment':
        this.openCashPayment(
          event.row,
        );
        break;

      case 'expensePaymentHistory':
        this.openExpensePaymentHistory(
          event.row,
        );
        break;

      default:
        break;
    }
  }

  private reloadPaymentTables(): void {
    /*
     * Ambos métodos reutilizan los filtros y páginas
     * actualmente seleccionados.
     */
    this.loadAvailableOutflows();
    this.loadPendingExpenseItems();
  }

  private addExpenseItem(
    row:
      entity.TreasuryPendingExpenseItemTableRow,
  ): void {
    const movement =
      this.selectedMovement();

    /*
     * Validación defensiva.
     * Normalmente no podrá ejecutarse porque el botón
     * estará deshabilitado.
     */
    if (!movement) {
      return;
    }

    if (
      this.selectedApplications().has(
        row.expense_item_id,
      )
    ) {
      return;
    }

    const movementRemaining =
      roundMoney(
        this.selectedMovementRemaining(),
      );

    const itemPending =
      roundMoney(
        Number(
          row.pending_amount || 0,
        ),
      );

    const amountToApply =
      roundMoney(
        Math.min(
          movementRemaining,
          itemPending,
        ),
      );

    if (amountToApply <= 0) {
      return;
    }

    this.selectedApplications.update(
      (current) => {
        const next =
          new Map(current);

        next.set(
          row.expense_item_id,
          amountToApply,
        );

        return next;
      },
    );

    this.selectedExpenseItems.update(
      (current) => {
        const next =
          new Map(current);

        next.set(
          row.expense_item_id,
          row,
        );

        return next;
      },
    );
  }

  private removeExpenseItem(
    row:
      entity.TreasuryPendingExpenseItemTableRow,
  ): void {
    this.selectedApplications.update(
      (current) => {
        const next =
          new Map(current);

        next.delete(
          row.expense_item_id,
        );

        return next;
      },
    );

    this.selectedExpenseItems.update(
      (current) => {
        const next =
          new Map(current);

        next.delete(
          row.expense_item_id,
        );

        return next;
      },
    );
  }

  openCashPayment(
    row:
      entity.TreasuryPendingExpenseItemTableRow,
  ): void {
    if (
      Number(
        row.pending_amount,
      ) <= 0
    ) {
      return;
    }

    const modalData:
      entity.TreasuryApplyCashPaymentModalData = {
      item: row,
    };

    this.dialogService
      .open(
        ModalCashPayment,
        modalData,
        'small',
      )
      .afterClosed()
      .subscribe(
        (
          result:
            | entity.TreasuryApplyCashPaymentResponse
            | null,
        ) => {
          if (
            !result?.success
          ) {
            return;
          }

          /*
           * Por seguridad elimina cualquier selección
           * anterior del concepto.
           */
          this.removeExpenseItem(
            row,
          );

          /*
           * Solo recargamos conceptos:
           * el efectivo no modifica movimientos bancarios.
           */
          this.loadPendingExpenseItems();

          /*
           * No se muestra diálogo de éxito.
           * El interceptor presenta el mensaje del backend.
           */
        },
      );
  }

  openExpensePaymentHistory(
    row:
      entity.TreasuryPendingExpenseItemTableRow,
  ): void {
    const modalData:
      entity.TreasuryExpenseItemPaymentHistoryModalData = {
      expenseItem: row,
    };

    this.dialogService
      .open(
        ModalExpenseItemPaymentHistory,
        modalData,
        'large',
      )
      .afterClosed()
      .subscribe(
        (
          historyChanged:
            boolean | null,
        ) => {
          if (!historyChanged) {
            return;
          }

          /*
           * Una transferencia puede devolver saldo
           * al movimiento bancario.
           *
           * El efectivo solo modifica el concepto,
           * pero recargamos ambas tablas para cubrir
           * correctamente los dos tipos de pago.
           */
          this.clearPaymentSelection();
          this.loadAvailableOutflows();
          this.loadPendingExpenseItems();
        },
      );
  }

  preparePayment(): void {
    const movement =
      this.selectedMovement();

    if (
      !movement ||
      !this.canPreparePayment()
    ) {
      return;
    }

    const selectedRows =
      this.selectedExpenseItems();

    const applications:
      entity.TreasuryApplyBankMovementModalApplication[] =
      Array.from(
        this.selectedApplications()
          .entries(),
      )
        .map(
          ([
            expenseItemId,
            amount,
          ]) => {
            const item =
              selectedRows.get(
                expenseItemId,
              );

            if (!item) {
              return null;
            }

            return {
              item,
              amount:
                roundMoney(
                  amount,
                ),
            };
          },
        )
        .filter(
          (
            application,
          ): application is
            entity.TreasuryApplyBankMovementModalApplication =>
            application !== null,
        );

    if (
      applications.length !==
      this.selectedApplicationsCount()
    ) {
      this.dialogService
        .confirm({
          title:
            'Selección incompleta',

          message:
            'No fue posible recuperar todos los conceptos seleccionados. Quita la selección y vuelve a intentarlo.',

          confirmText:
            'Aceptar',

          cancelText:
            '',
        })
        .subscribe();

      return;
    }

    const modalData:
      entity.TreasuryApplyBankMovementModalData = {
      movement,
      applications,
    };

    this.dialogService
      .open(
        ModalTreasuryAccountsPayable,
        modalData,
        'medium',
      )
      .afterClosed()
      .subscribe(
        (
          result:
            | entity.TreasuryApplyBankMovementResponse
            | null,
        ) => {
          if (!result?.success) {
            return;
          }

          this.clearPaymentSelection();

          /*
           * Recarga movimientos y conceptos pendientes.
           * No limpia formularios, páginas ni LocalStorage.
           */
          this.reloadPaymentTables();

        },
      );
  }

  clearPaymentSelection(): void {
    this.selectedMovement.set(null);

    this.selectedApplications.set(
      new Map<number, number>(),
    );

    this.selectedExpenseItems.set(
      new Map<
        number,
        entity.TreasuryPendingExpenseItemTableRow
      >(),
    );
  }

  // =========================================================
  // ACCIONES: HISTÓRICOS
  // =========================================================

  onHistoricalTableAction(
    event: DataTableActionEvent<
      entity.TreasuryHistoricalPaymentTableRow
    >,
  ): void {
    switch (event.type) {
      case 'regularize':
        this.openRegularization(
          event.row,
        );
        break;

      case 'historicalHistory':
        this.openHistoricalHistory(
          event.row,
        );
        break;

      case 'reopenRegularization':
        this.openReopenRegularization(
          event.row,
        );
        break;

      default:
        break;
    }
  }

  openRegularization(
    row:
      entity.TreasuryHistoricalPaymentTableRow,
  ): void {
    if (
      !row?.payment_id ||
      !row.can_regularize
    ) {
      return;
    }

    const modalData:
      entity.TreasuryRegularizeHistoricalPaymentModalData = {
      payment: row,
    };

    this.dialogService
      .open(
        ModalRegularizeHistoricalPayment,
        modalData,
        'large',
      )
      .afterClosed()
      .subscribe(
        (
          result:
            | entity.TreasuryRegularizeHistoricalPaymentResponse
            | null,
        ) => {
          if (!result?.success) {
            return;
          }

          /*
           * Una transferencia conciliada consume saldo
           * de un movimiento bancario disponible.
           *
           * Limpiamos cualquier selección para evitar
           * conservar importes anteriores.
           */
          this.clearPaymentSelection();

          /*
           * Actualiza la tabla de históricos y la tabla
           * de movimientos sin alterar sus filtros.
           */
          this.loadHistoricalPayments();
          this.loadAvailableOutflows();
        },
      );
  }

  openHistoricalHistory(
    row:
      entity.TreasuryHistoricalPaymentTableRow,
  ): void {
    if (!row?.payment_id) {
      return;
    }

    const modalData:
      entity.TreasuryHistoricalPaymentHistoryModalData = {
      payment:
        row,
    };

    this.dialogService
      .open(
        ModalHistoricalPaymentHistory,
        modalData,
        'large',
      )
      .afterClosed()
      .subscribe();
  }

  openReopenRegularization(
    row:
      entity.TreasuryHistoricalPaymentTableRow,
  ): void {
    if (
      !row?.payment_id ||
      !row.can_reopen_regularization
    ) {
      return;
    }

    const modalData:
      entity.TreasuryReopenHistoricalRegularizationModalData = {
      payment:
        row,
    };

    this.dialogService
      .open(
        ModalReopenHistoricalRegularization,
        modalData,
        'medium',
      )
      .afterClosed()
      .subscribe(
        (
          result:
            | entity.TreasuryReopenHistoricalRegularizationResponse
            | null,
        ) => {
          if (!result?.success) {
            return;
          }

          /*
           * El pago salió de regularizados y regresó
           * a históricos por regularizar.
           */
          this.loadHistoricalPayments();

          /*
           * Una transferencia conciliada puede
           * devolver saldo a un movimiento bancario.
           */
          this.clearPaymentSelection();
          this.loadAvailableOutflows();
        },
      );
  }

  // =========================================================
  // LOCAL STORAGE
  // =========================================================

  private restoreFiltersFromStorage(): void {
    this.restoreOutflowFilters();
    this.restorePendingItemFilters();

    this.restoreHistoricalFilters(
      this.getHistoricalStatusForTab(),
    );
  }

  private restoreOutflowFilters(): void {
    const saved =
      this.storage.getItem<
        entity.TreasuryAvailableOutflowUiFilters
      >(
        AVAILABLE_OUTFLOWS_FILTERS_KEY,
      );

    if (!saved) return;

    const dateRange =
      this.normalizeDateRange(
        saved.dateRange,
      );

    this.outflowFilterForm.patchValue(
      {
        dateRange,

        search:
          saved.search ?? '',

        company_id:
          saved.company_id ?? null,

        bank_id:
          saved.bank_id ?? null,

        bank_account_id:
          saved.bank_account_id ??
          null,
      },
      {
        emitEvent: false,
      },
    );

    this.outflowFilters =
      this.buildOutflowBackendFiltersFromUi({
        ...saved,

        dateRange,

        page:
          saved.page ?? 1,

        limit:
          saved.limit ??
          this.outflowFilters.limit,
      });
  }

  private restorePendingItemFilters(): void {
    const saved =
      this.storage.getItem<
        entity.TreasuryPendingExpenseItemUiFilters
      >(
        PENDING_EXPENSE_ITEMS_FILTERS_KEY,
      );

    if (!saved) return;

    const dateRange =
      this.normalizeDateRange(
        saved.dateRange,
      );

    this.pendingItemFilterForm.patchValue(
      {
        dateRange,

        search:
          saved.search ?? '',

        supplier_id:
          saved.supplier_id ?? null,

        project_id:
          saved.project_id ?? null,

        item_type:
          saved.item_type ?? '',
      },
      {
        emitEvent: false,
      },
    );

    this.pendingItemFilters =
      this.buildPendingItemsBackendFiltersFromUi({
        ...saved,

        dateRange,

        page:
          saved.page ?? 1,

        limit:
          saved.limit ??
          this.pendingItemFilters.limit,
      });
  }

  private restoreHistoricalFilters(
    regularizationStatus:
      entity.TreasuryHistoricalRegularizationStatus,
  ): void {
    const storageKey =
      this.getHistoricalFiltersStorageKey(
        regularizationStatus,
      );

    const saved =
      this.storage.getItem<
        entity.TreasuryHistoricalPaymentUiFilters
      >(
        storageKey,
      );

    const dateRange =
      this.normalizeDateRange(
        saved?.dateRange,
      );

    const uiState:
      entity.TreasuryHistoricalPaymentUiFilters = {
      dateRange,

      search:
        saved?.search ?? '',

      supplier_id:
        saved?.supplier_id ?? null,

      project_id:
        saved?.project_id ?? null,

      /*
       * Nunca se restaura el estado almacenado.
       * La pestaña determina obligatoriamente el estado.
       */
      regularization_status:
        regularizationStatus,

      regularization_type:
        saved?.regularization_type ?? '',

      missing_payment_date:
        saved?.missing_payment_date ?? '',

      page:
        saved?.page ?? 1,

      limit:
        saved?.limit ??
        DEFAULT_HISTORICAL_PAYMENTS_LIMIT,
    };

    /*
     * Se usa reset para impedir que permanezcan valores
     * pertenecientes a la pestaña anterior.
     */
    this.historicalFilterForm.reset(
      {
        dateRange:
          uiState.dateRange,

        search:
          uiState.search,

        supplier_id:
          uiState.supplier_id,

        project_id:
          uiState.project_id,

        regularization_status:
          regularizationStatus,

        regularization_type:
          uiState.regularization_type,

        missing_payment_date:
          uiState.missing_payment_date,
      },
      {
        emitEvent: false,
      },
    );

    this.historicalFilters =
      this.buildHistoricalBackendFiltersFromUi(
        uiState,
      );
  }

  private saveOutflowFiltersToStorage(
    state?: entity.TreasuryAvailableOutflowUiFilters,
  ): void {
    if (!state) {
      const value =
        this.outflowFilterForm.getRawValue();

      state = {
        dateRange:
          value.dateRange ?? null,

        search:
          value.search?.trim() || '',

        company_id:
          value.company_id ?? null,

        bank_id:
          value.bank_id ?? null,

        bank_account_id:
          value.bank_account_id ??
          null,

        page:
          this.outflowFilters.page,

        limit:
          this.outflowFilters.limit,
      };
    }

    this.storage.setItem(
      AVAILABLE_OUTFLOWS_FILTERS_KEY,
      state,
    );
  }

  private savePendingItemFiltersToStorage(
    state?: entity.TreasuryPendingExpenseItemUiFilters,
  ): void {
    if (!state) {
      const value =
        this.pendingItemFilterForm.getRawValue();

      state = {
        dateRange:
          value.dateRange ?? null,

        search:
          value.search?.trim() || '',

        supplier_id:
          value.supplier_id ?? null,

        project_id:
          value.project_id ?? null,

        item_type:
          value.item_type || '',

        page:
          this.pendingItemFilters.page,

        limit:
          this.pendingItemFilters.limit,
      };
    }

    this.storage.setItem(
      PENDING_EXPENSE_ITEMS_FILTERS_KEY,
      state,
    );
  }

  private saveHistoricalFiltersToStorage(
    state?:
      entity.TreasuryHistoricalPaymentUiFilters,

    regularizationStatus:
      entity.TreasuryHistoricalRegularizationStatus =
      this.getHistoricalStatusForTab(),
  ): void {
    if (!state) {
      const value =
        this.historicalFilterForm.getRawValue();

      state = {
        dateRange:
          value.dateRange ?? null,

        search:
          value.search?.trim() || '',

        supplier_id:
          value.supplier_id ?? null,

        project_id:
          value.project_id ?? null,

        /*
         * El estado siempre depende de la pestaña,
         * nunca del valor previamente guardado.
         */
        regularization_status:
          regularizationStatus,

        regularization_type:
          value.regularization_type || '',

        missing_payment_date:
          value.missing_payment_date || '',

        page:
          this.historicalFilters.page,

        limit:
          this.historicalFilters.limit,
      };
    }

    const normalizedState:
      entity.TreasuryHistoricalPaymentUiFilters = {
      ...state,

      regularization_status:
        regularizationStatus,
    };

    this.storage.setItem(
      this.getHistoricalFiltersStorageKey(
        regularizationStatus,
      ),
      normalizedState,
    );
  }

  // =========================================================
  // HELPERS
  // =========================================================

  private getBankAccountDisplay(
    row: entity.TreasuryAvailableOutflow,
  ): string {
    const alias =
      row.bank_account?.alias?.trim();

    const identifier =
      row.bank_account
        ?.account_identifier
        ?.trim();

    if (
      alias &&
      identifier
    ) {
      return `${alias} · ${identifier}`;
    }

    if (alias) return alias;
    if (identifier) return identifier;

    return 'Sin cuenta';
  }

  private getMovementStatusLabel(
    status:
      string | null | undefined,
  ): string {
    switch (status) {
      case 'unmatched':
        return 'Pendiente';

      case 'partially_matched':
        return 'Parcial';

      case 'matched':
        return 'Conciliado';

      case 'manually_closed':
        return 'Cerrado manualmente';

      case 'cancelled':
        return 'Cancelado';

      default:
        return 'Sin estatus';
    }
  }

  private getHistoricalPaymentMethodLabel(
    method:
      entity.TreasuryHistoricalPaymentMethod,
  ): string {
    switch (method) {
      case 'transfer':
        return 'Transferencia';

      case 'cash':
        return 'Efectivo';

      case 'unknown':
      default:
        return 'Sin identificar';
    }
  }

  private getRegularizationTypeLabel(
    type:
      | entity.TreasuryHistoricalRegularizationType
      | null,
  ): string {
    switch (type) {
      case 'bank_transfer_matched':
        return 'Transferencia conciliada';

      case 'historical_transfer_without_movement':
        return 'Transferencia sin movimiento';

      case 'cash':
        return 'Efectivo';

      default:
        return 'Sin regularizar';
    }
  }

  private getClassificationLabel(
    classification:
      string | null | undefined,
  ): string {
    if (!classification) {
      return 'Sin clasificación';
    }

    return classification
      .split('_')
      .filter(Boolean)
      .map(
        (part) =>
          part.charAt(0).toUpperCase() +
          part.slice(1),
      )
      .join(' ');
  }

  private getCatalogValue(
    value:
      | Catalog
      | number
      | string
      | null
      | undefined,
  ): string | number | null {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    if (
      typeof value === 'number' ||
      typeof value === 'string'
    ) {
      return value;
    }

    return value.id;
  }

  private getNumberId(
    value: unknown,
  ): number | null {
    const raw =
      this.getCatalogValue(
        value as
        | Catalog
        | number
        | string
        | null,
      );

    const id =
      Number(raw);

    if (
      !id ||
      Number.isNaN(id)
    ) {
      return null;
    }

    return id;
  }

  private normalizeDateRange(
    dateRange:
      | entity.TreasuryAccountsPayableDateRange
      | DateRangeValue
      | null
      | undefined,
  ): DateRangeValue | null {
    if (!dateRange) {
      return null;
    }

    return {
      startDate:
        dateRange.startDate ??
        null,

      endDate:
        dateRange.endDate ??
        null,
    };
  }

  private getHistoricalStatusForTab(
    tab:
      AccountsPayableTab =
      this.activeTab(),
  ):
    entity.TreasuryHistoricalRegularizationStatus {
    return tab ===
      'historical_regularized'
      ? 'regularized'
      : 'pending';
  }

  private getHistoricalFiltersStorageKey(
    status:
      entity.TreasuryHistoricalRegularizationStatus,
  ): string {
    return status ===
      'regularized'
      ? HISTORICAL_REGULARIZED_FILTERS_KEY
      : HISTORICAL_PENDING_FILTERS_KEY;
  }
}