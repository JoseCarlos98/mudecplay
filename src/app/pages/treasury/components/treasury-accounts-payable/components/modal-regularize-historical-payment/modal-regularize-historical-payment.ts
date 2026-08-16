import { CommonModule } from '@angular/common';

import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';

import { MatIconModule } from '@angular/material/icon';

import {
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';

import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';

import {
  finalize,
  forkJoin,
} from 'rxjs';

// UI compartida
import {
  ModuleHeader,
} from '../../../../../../shared/ui/module-header/module-header';

import {
  ModuleHeaderConfig,
} from '../../../../../../shared/ui/module-header/interfaces/module-header-interface';

import {
  BtnsSection,
  ModuleFooterAction,
} from '../../../../../../shared/ui/btns-section/btns-section';

import {
  InputField,
} from '../../../../../../shared/ui/input-field/input-field';

import {
  InputSelect,
} from '../../../../../../shared/ui/input-select/input-select';

import {
  DateRangeValue,
  InputDate,
} from '../../../../../../shared/ui/input-date/input-date';

import {
  DataTable,
} from '../../../../../../shared/ui/data-table/data-table';

import {
  ColumnsConfig,
  ColumnVariant,
  DataTableActionEvent,
  DataTableExtraAction,
} from '../../../../../../shared/ui/data-table/interfaces/table-interfaces';

import {
  LoadingOverlay,
} from '../../../../../../shared/ui/loading-overlay/loading-overlay';

// Interfaces compartidas
import {
  Catalog,
} from '../../../../../../shared/interfaces/general-interfaces';

// Helpers
import {
  roundMoney,
} from '../../../../../../shared/helpers/general-helpers';

// Servicios compartidos
import {
  CatalogsService,
} from '../../../../../../shared/services/catalogs.service';

import {
  DialogService,
} from '../../../../../../shared/services/dialog.service';

// Módulo
import * as entity from '../../interfaces/treasury-accounts-payable.interfaces';

import {
  TreasuryAccountsPayableService,
} from '../../services/treasury-accounts-payable.service';

// =========================================================
// CONFIGURACIÓN
// =========================================================

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

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

const UNIDENTIFIED_COMPANY_OPTION: Catalog = {
  id: 'unidentified',
  name: 'Empresa no identificada',
};

// =========================================================
// COLUMNAS: MOVIMIENTOS DISPONIBLES
// =========================================================

const MOVEMENT_COLUMNS: ColumnsConfig[] = [
  {
    key: 'movement_date',
    label: 'Fecha',
    type: 'date',
  },
  {
    key: 'reference_display',
    label: 'Referencia',
  },
  {
    key: 'description_display',
    label: 'Descripción',
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
    key: 'available_amount',
    label: 'Disponible',
    type: 'money',
    align: 'right',
  },
  {
    key: 'status_label',
    label: 'Estatus',
    type: 'chip',
    variantResolver: (
      row:
        entity.TreasuryAvailableOutflowTableRow,
    ) =>
      resolveMovementStatusVariant(
        row,
      ),
  },
];

const MOVEMENT_DISPLAYED_COLUMNS = [
  ...MOVEMENT_COLUMNS.map(
    (column) =>
      column.key,
  ),
  'actions',
];

function resolveMovementStatusVariant(
  row:
    entity.TreasuryAvailableOutflowTableRow,
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

@Component({
  selector:
    'app-modal-regularize-historical-payment',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatIconModule,
    MatPaginatorModule,

    ModuleHeader,
    BtnsSection,
    InputField,
    InputSelect,
    InputDate,
    DataTable,
    LoadingOverlay,
  ],

  templateUrl:
    './modal-regularize-historical-payment.html',

  styleUrl:
    './modal-regularize-historical-payment.scss',
})
export class ModalRegularizeHistoricalPayment
  implements OnInit {

  // =========================================================
  // INYECCIONES
  // =========================================================

  readonly data =
    inject<
      entity.TreasuryRegularizeHistoricalPaymentModalData
    >(MAT_DIALOG_DATA);

  private readonly dialogRef =
    inject(
      MatDialogRef<
        ModalRegularizeHistoricalPayment
      >,
    );

  private readonly accountsPayableService =
    inject(TreasuryAccountsPayableService);

  private readonly catalogsService =
    inject(CatalogsService);

  private readonly dialogService =
    inject(DialogService);

  private readonly fb =
    inject(FormBuilder);

  private readonly destroyRef =
    inject(DestroyRef);

  // =========================================================
  // UI
  // =========================================================

  readonly headerConfig =
    HEADER_CONFIG;

  readonly regularizationTypeOptions =
    REGULARIZATION_TYPE_OPTIONS;

  readonly movementColumns =
    MOVEMENT_COLUMNS;

  readonly movementDisplayedColumns =
    MOVEMENT_DISPLAYED_COLUMNS;

  readonly tableActionPermissions = {
    showEdit: false,
    showDelete: false,
  };

  readonly loadingCatalogs =
    signal(false);

  readonly loadingMovements =
    signal(false);

  readonly saving =
    signal(false);

  // =========================================================
  // CATÁLOGOS
  // =========================================================

  companyOptions: Catalog[] = [];
  bankOptions: Catalog[] = [];
  bankAccountOptions: Catalog[] = [];

  // =========================================================
  // FORMULARIO PRINCIPAL
  // =========================================================

  readonly form =
    this.fb.group({
      regularization_type:
        this.fb.control<
          | entity.TreasuryHistoricalRegularizationType
          | ''
        >(
          '',
          {
            nonNullable: true,

            validators: [
              Validators.required,
            ],
          },
        ),

      company_id:
        this.fb.control<
          | Catalog
          | number
          | string
          | null
        >(null),

      reference:
        this.fb.control<string>(
          '',
          {
            nonNullable: true,

            validators: [
              Validators.maxLength(180),
            ],
          },
        ),

      reason:
        this.fb.control<string>(
          '',
          {
            nonNullable: true,

            validators: [
              Validators.required,
              Validators.minLength(5),
              Validators.maxLength(500),
            ],
          },
        ),
    });

  // =========================================================
  // FILTROS DE MOVIMIENTOS
  // =========================================================

  readonly movementFilterForm =
    this.fb.group({
      dateRange:
        this.fb.control<
          DateRangeValue | null
        >(null),

      amount:
        this.fb.control<
          number | string | null
        >(null),

      search:
        this.fb.control<string>(
          '',
          {
            nonNullable: true,
          },
        ),

      company_id:
        this.fb.control<
          | Catalog
          | number
          | string
          | null
        >(null),

      bank_id:
        this.fb.control<
          | Catalog
          | number
          | string
          | null
        >(null),

      bank_account_id:
        this.fb.control<
          | Catalog
          | number
          | string
          | null
        >(null),
    });

  movementFilters:
    entity.TreasuryAvailableOutflowFilters = {
      page: 1,
      limit: 10,

      search: '',
      amount: null,

      company_id: null,
      bank_id: null,
      bank_account_id: null,

      minimum_available_amount: null,

      date_from: null,
      date_to: null,
    };

  // =========================================================
  // TABLA DE MOVIMIENTOS
  // =========================================================

  movementTableData:
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

  availableMovementRows:
    entity.TreasuryAvailableOutflowTableRow[] = [];

  readonly selectedMovement =
    signal<
      entity.TreasuryAvailableOutflowTableRow
      | null
    >(null);

  readonly movementExtraActions:
    DataTableExtraAction<
      entity.TreasuryAvailableOutflowTableRow
    >[] = [
      {
        type:
          'selectMovement',

        icon:
          'radio_button_unchecked',

        tooltip:
          'Seleccionar movimiento',

        visible:
          (
            row:
              entity.TreasuryAvailableOutflowTableRow,
          ) =>
            this.selectedMovement()?.id !==
            row.id,
      },
      {
        type:
          'clearMovementSelection',

        icon:
          'check_circle',

        tooltip:
          'Movimiento seleccionado',

        iconClass:
          'table-action-icon--success',

        visible:
          (
            row:
              entity.TreasuryAvailableOutflowTableRow,
          ) =>
            this.selectedMovement()?.id ===
            row.id,
      },
    ];

  // =========================================================
  // CICLO DE VIDA
  // =========================================================

  ngOnInit(): void {
    this.movementFilters = {
      ...this.movementFilters,

      minimum_available_amount:
        this.paymentAmount,
    };

    this.loadCatalogs();

    this.form.controls
      .regularization_type
      .valueChanges
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe(
        (
          type:
            | entity.TreasuryHistoricalRegularizationType
            | '',
        ) => {
          this.handleRegularizationTypeChange(
            type,
          );
        },
      );
  }

  // =========================================================
  // INFORMACIÓN DEL PAGO
  // =========================================================

  get payment():
    entity.TreasuryHistoricalPaymentTableRow {
    return this.data.payment;
  }

  get paymentAmount(): number {
    return roundMoney(
      Number(
        this.payment.amount || 0,
      ),
    );
  }

  get folioDisplay(): string {
    return (
      this.payment.internal_folio ||
      this.payment.expense
        ?.internal_folio ||
      'Sin folio'
    );
  }

  get paymentDateDisplay(): string {
    return this.formatDate(
      this.payment.payment_date,
    );
  }

  get supplierDisplay(): string {
    return (
      this.payment
        .supplier_display_name ||
      this.payment.supplier
        ?.display_name ||
      'Sin proveedor'
    );
  }

  get projectDisplay(): string {
    return (
      this.payment.project_name ||
      this.payment.project
        ?.name ||
      'Sin proyecto'
    );
  }

  get conceptDisplay(): string {
    return (
      this.payment.concept ||
      this.payment.expense_item
        ?.concept ||
      'Sin concepto'
    );
  }

  // =========================================================
  // TIPO DE REGULARIZACIÓN
  // =========================================================

  get regularizationType():
    | entity.TreasuryHistoricalRegularizationType
    | '' {
    return (
      this.form.controls
        .regularization_type
        .value
    );
  }

  get isMatchedTransfer(): boolean {
    return (
      this.regularizationType ===
      'bank_transfer_matched'
    );
  }

  get isTransferWithoutMovement(): boolean {
    return (
      this.regularizationType ===
      'historical_transfer_without_movement'
    );
  }

  get isCash(): boolean {
    return (
      this.regularizationType ===
      'cash'
    );
  }

  get showCompanySelector(): boolean {
    return (
      this.isTransferWithoutMovement ||
      this.isCash
    );
  }

  // =========================================================
  // MOVIMIENTO SELECCIONADO
  // =========================================================

  get selectedMovementReference(): string {
    const movement =
      this.selectedMovement();

    if (!movement) {
      return 'Sin movimiento';
    }

    return movement.reference_display;
  }

  get selectedMovementAccount(): string {
    const movement =
      this.selectedMovement();

    if (!movement) {
      return 'Sin cuenta';
    }

    return (
      movement.bank_account_display ||
      'Sin cuenta'
    );
  }

  get selectedMovementAvailableAfter(): number {
    const movement =
      this.selectedMovement();

    if (!movement) {
      return 0;
    }

    return roundMoney(
      Math.max(
        Number(
          movement.available_amount ||
          0,
        ) -
        this.paymentAmount,
        0,
      ),
    );
  }

  get canSave(): boolean {
    if (
      this.saving() ||
      this.form.invalid ||
      !this.payment?.payment_id
    ) {
      return false;
    }

    if (this.isMatchedTransfer) {
      const movement =
        this.selectedMovement();

      if (!movement) {
        return false;
      }

      if (
        Number(
          movement.available_amount,
        ) <
        this.paymentAmount
      ) {
        return false;
      }
    }

    return true;
  }

  // =========================================================
  // CATÁLOGOS
  // =========================================================

  private loadCatalogs(): void {
    if (this.loadingCatalogs()) {
      return;
    }

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
          .treasuryBankAccountsCatalog(
            false,
          ),
    })
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(() =>
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
          this.companyOptions = [
            UNIDENTIFIED_COMPANY_OPTION,
            ...(companies ?? []),
          ];

          this.bankOptions =
            banks ?? [];

          this.bankAccountOptions =
            bankAccounts ?? [];
        },

        error: (
          error:
            unknown,
        ) => {
          console.error(
            'Error cargando catálogos para regularización:',
            error,
          );
        },
      });
  }

  // =========================================================
  // CARGA DE MOVIMIENTOS
  // =========================================================

  loadAvailableMovements(): void {
    if (
      this.loadingMovements() ||
      !this.isMatchedTransfer
    ) {
      return;
    }

    this.loadingMovements.set(
      true,
    );

    this.accountsPayableService
      .getAvailableOutflows(
        {
          ...this.movementFilters,

          minimum_available_amount:
            this.paymentAmount,
        },
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(() =>
          this.loadingMovements.set(
            false,
          ),
        ),
      )
      .subscribe({
        next: (
          response:
            entity.TreasuryAvailableOutflowsResponse,
        ) => {
          this.movementTableData =
            response;

          this.availableMovementRows =
            (
              response.data ??
              []
            ).map(
              (
                row:
                  entity.TreasuryAvailableOutflow,
              ) =>
                this.mapAvailableMovementRow(
                  row,
                ),
            );
        },

        error: (
          error:
            unknown,
        ) => {
          console.error(
            'Error cargando movimientos bancarios disponibles:',
            error,
          );
        },
      });
  }

  // =========================================================
  // FILTROS DE MOVIMIENTOS
  // =========================================================

  searchAvailableMovements(): void {
    const value =
      this.movementFilterForm
        .getRawValue();

    this.movementFilters = {
      page: 1,

      limit:
        this.movementFilters.limit,

      search:
        value.search.trim(),

      amount:
        this.normalizeAmountFilter(
          value.amount,
        ),

      company_id:
        this.getNumberId(
          value.company_id,
        ),

      bank_id:
        this.getNumberId(
          value.bank_id,
        ),

      bank_account_id:
        this.getNumberId(
          value.bank_account_id,
        ),

      minimum_available_amount:
        this.paymentAmount,

      date_from:
        value.dateRange
          ?.startDate ??
        null,

      date_to:
        value.dateRange
          ?.endDate ??
        null,
    };

    this.loadAvailableMovements();
  }

  clearAvailableMovementFilters(): void {
    this.movementFilterForm.reset(
      {
        dateRange: null,
        search: '',
        company_id: null,
        amount: null,
        bank_id: null,
        bank_account_id: null,
      },
      {
        emitEvent: false,
      },
    );

    this.movementFilters = {
      page: 1,

      limit:
        this.movementFilters.limit,

      search: '',
      amount: null,
      company_id: null,
      bank_id: null,
      bank_account_id: null,

      minimum_available_amount:
        this.paymentAmount,

      date_from: null,
      date_to: null,
    };

    this.loadAvailableMovements();
  }

  onMovementBtnsSectionAction(
    action: string,
  ): void {
    switch (action) {
      case 'search':
        this.searchAvailableMovements();
        break;

      case 'clean':
        this.clearAvailableMovementFilters();
        break;

      default:
        break;
    }
  }

  onMovementPageChange(
    event: PageEvent,
  ): void {
    this.movementFilters = {
      ...this.movementFilters,

      page:
        event.pageIndex + 1,

      limit:
        event.pageSize,

      minimum_available_amount:
        this.paymentAmount,
    };

    this.loadAvailableMovements();
  }

  get hasActiveMovementFilters(): boolean {
    const value =
      this.movementFilterForm
        .getRawValue();

    return Boolean(
      value.dateRange
        ?.startDate ||
      value.dateRange
        ?.endDate ||
      value.search.trim() ||
      this.getCatalogValue(
        value.company_id,
      ) ||
      this.normalizeAmountFilter(
        value.amount,
      ) !== null ||
      this.getCatalogValue(
        value.bank_id,
      ) ||
      this.getCatalogValue(
        value.bank_account_id,
      ),
    );
  }

  // =========================================================
  // ACCIONES DE TABLA
  // =========================================================

  onMovementTableAction(
    event:
      DataTableActionEvent<
        entity.TreasuryAvailableOutflowTableRow
      >,
  ): void {
    switch (event.type) {
      case 'selectMovement':
        this.selectMovement(
          event.row,
        );
        break;

      case 'clearMovementSelection':
        this.clearMovementSelection();
        break;

      default:
        break;
    }
  }

  private selectMovement(
    row:
      entity.TreasuryAvailableOutflowTableRow,
  ): void {
    if (
      Number(
        row.available_amount,
      ) <
      this.paymentAmount
    ) {
      return;
    }

    this.selectedMovement.set(
      row,
    );
  }

  clearMovementSelection(): void {
    this.selectedMovement.set(
      null,
    );
  }

  // =========================================================
  // TIPO DE REGULARIZACIÓN
  // =========================================================

  private handleRegularizationTypeChange(
    type:
      | entity.TreasuryHistoricalRegularizationType
      | '',
  ): void {
    const companyControl =
      this.form.controls.company_id;

    if (
      type ===
      'bank_transfer_matched'
    ) {
      companyControl.setValue(
        null,
        {
          emitEvent: false,
        },
      );

      this.movementFilters = {
        ...this.movementFilters,

        page: 1,

        minimum_available_amount:
          this.paymentAmount,
      };

      this.loadAvailableMovements();

      return;
    }

    this.clearMovementSelection();

    if (
      type ===
      'historical_transfer_without_movement' ||
      type ===
      'cash'
    ) {
      if (!companyControl.value) {
        companyControl.setValue(
          UNIDENTIFIED_COMPANY_OPTION,
          {
            emitEvent: false,
          },
        );
      }
    }
  }

  // =========================================================
  // GUARDAR
  // =========================================================

  saveData(): void {
    if (
      this.saving() ||
      !this.canSave
    ) {
      this.form.markAllAsTouched();
      return;
    }

    const value =
      this.form.getRawValue();

    const regularizationType =
      value.regularization_type;

    const reason =
      value.reason.trim();

    const reference =
      value.reference.trim();

    if (
      !regularizationType ||
      reason.length < 5 ||
      reason.length > 500 ||
      reference.length > 180
    ) {
      this.form.markAllAsTouched();
      return;
    }

    const payload:
      entity.TreasuryRegularizeHistoricalPaymentPayload = {
      regularization_type:
        regularizationType,

      reason,
    };

    if (reference) {
      payload.reference =
        reference;
    }

    if (
      regularizationType ===
      'bank_transfer_matched'
    ) {
      const movement =
        this.selectedMovement();

      if (!movement?.id) {
        return;
      }

      payload.bank_movement_id =
        String(
          movement.id,
        );
    } else {
      const companyId =
        this.getNumberId(
          value.company_id,
        );

      if (companyId) {
        payload.company_id =
          companyId;
      }
    }

    this.saving.set(
      true,
    );

    this.accountsPayableService
      .regularizeHistoricalPayment(
        this.payment.payment_id,
        payload,
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(() =>
          this.saving.set(
            false,
          ),
        ),
      )
      .subscribe({
        next: (
          response:
            entity.TreasuryRegularizeHistoricalPaymentResponse,
        ) => {
          if (!response.success) {
            return;
          }

          this.dialogRef.close(
            response,
          );
        },

        error: (
          error:
            unknown,
        ) => {
          console.error(
            'Error al regularizar el pago histórico:',
            error,
          );

          this.showError(
            this.resolveErrorMessage(
              error,
            ),
          );
        },
      });
  }

  // =========================================================
  // BTN SECTION
  // =========================================================

  onBtnsSectionAction(
    action:
      ModuleFooterAction,
  ): void {
    switch (action) {
      case 'cancel':
        this.closeModal();
        break;

      default:
        break;
    }
  }

  // =========================================================
  // MODAL
  // =========================================================

  closeModal(): void {
    if (this.saving()) {
      return;
    }

    this.dialogRef.close(
      null,
    );
  }

  // =========================================================
  // MAPEO
  // =========================================================

  private mapAvailableMovementRow(
    row:
      entity.TreasuryAvailableOutflow,
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

      counterparty_display:
        row.counterparty_name
          ?.trim() ||
        row.counterparty_account
          ?.trim() ||
        'Sin contraparte',

      status_label:
        this.getMovementStatusLabel(
          row.status,
        ),

      classification_label:
        this.getClassificationLabel(
          row.classification,
        ),

      classification_review_label:
        row.classification_reviewed
          ? 'Revisada'
          : 'Pendiente',
    };
  }

  // =========================================================
  // HELPERS
  // =========================================================

  private normalizeAmountFilter(
    value:
      unknown,
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

    return roundMoney(
      amount,
    );
  }

  formatDate(
    value:
      | string
      | null
      | undefined,
  ): string {
    if (!value) {
      return 'Sin fecha';
    }

    const normalized =
      String(value)
        .slice(0, 10);

    const parts =
      normalized.split('-');

    if (parts.length !== 3) {
      return normalized;
    }

    const [
      year,
      month,
      day,
    ] = parts;

    return `${day}/${month}/${year}`;
  }

  private getBankAccountDisplay(
    row:
      entity.TreasuryAvailableOutflow,
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
      return `${alias} · ${identifier}`;
    }

    return (
      alias ||
      identifier ||
      'Sin cuenta'
    );
  }

  private getMovementStatusLabel(
    status:
      string
      | null
      | undefined,
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

  private getClassificationLabel(
    classification:
      string
      | null
      | undefined,
  ): string {
    if (!classification) {
      return 'Sin clasificación';
    }

    return classification
      .split('_')
      .filter(Boolean)
      .map(
        (part) =>
          part.charAt(0)
            .toUpperCase() +
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
    value:
      | Catalog
      | number
      | string
      | null
      | undefined,
  ): number | null {
    const raw =
      this.getCatalogValue(
        value,
      );

    const id =
      Number(raw);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return null;
    }

    return id;
  }

  private showError(
    message:
      string,
  ): void {
    this.dialogService
      .confirm({
        title:
          'No se pudo regularizar el pago',

        message,

        confirmText:
          'Aceptar',

        cancelText:
          '',
      })
      .subscribe();
  }

  private resolveErrorMessage(
    error:
      unknown,
  ): string {
    const backendMessage =
      (
        error as {
          error?: {
            message?:
            | string
            | string[];
          };
        }
      )?.error?.message;

    if (
      Array.isArray(
        backendMessage,
      )
    ) {
      return backendMessage.join(
        '\n',
      );
    }

    if (
      typeof backendMessage ===
      'string' &&
      backendMessage.trim()
    ) {
      return backendMessage.trim();
    }

    return (
      'No fue posible regularizar el pago histórico.'
    );
  }
}