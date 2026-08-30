import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

// UI compartidos
import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
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

// Servicios
import { CatalogsService } from '../../../../shared/services/catalogs.service';
import { LocalStorageService } from '../../../../shared/services/local-storage.service';
import { TreasuryService } from '../../services/treasury.service';

// Interfaces
import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import * as entity from '../../interfaces/treasury.interfaces';
import { DialogService } from '../../../../shared/services/dialog.service';
import { ModalAccountsPayableManualReopen } from '../treasury-accounts-payable/components/modal-accounts-payable-manual-reopen/modal-accounts-payable-manual-reopen';
import { TreasuryBankMovementHistoryCurrentMovement, TreasuryManualReopenBankMovementModalData, TreasuryManualReopenBankMovementResponse } from '../treasury-accounts-payable/interfaces/treasury-accounts-payable.interfaces';
import { roundMoney } from '../../../../shared/helpers/general-helpers';
import { ModalBankMovementClassification } from '../treasury-accounts-payable/components/modal-bank-movement-classification/modal-bank-movement-classification';
import { ModalAccountsPayableHistory } from '../treasury-accounts-payable/components/modal-accounts-payable-history/modal-accounts-payable-history';
import { TreasuryAccountsReceivableService } from '../treasury-accounts-receivable/services/treasury-accounts-receivable.service';
import { TreasuryReceivableBankMovementHistoryResponse, TreasuryReceivableManualReopenModalData, TreasuryReceivableMovementMutationResponse } from '../treasury-accounts-receivable/interfaces/treasury-accounts-receivable.interfaces';
import { ModalAccountsReceivableManualReopen } from '../treasury-accounts-receivable/components/modal-accounts-receivable-manual-reopen/modal-accounts-receivable-manual-reopen';
import { ModalReceivableMovementHistory } from '../treasury-accounts-receivable/components/modal-receivable-movement-history/modal-receivable-movement-history';

// =========================================================
// TESORERÍA: MOVIMIENTOS BANCARIOS - CONSTANTES
// =========================================================

const TREASURY_BANK_MOVEMENTS_FILTERS_KEY =
  'mp_treasury_bank_movements_filters_v1';

const HEADER_CONFIG: ModuleHeaderConfig = {};

const MOVEMENT_TYPE_OPTIONS: Catalog[] = [
  { id: 'inflow', name: 'Entradas' },
  { id: 'outflow', name: 'Salidas' },
];

const MOVEMENT_STATUS_OPTIONS: Catalog[] = [
  { id: 'unmatched', name: 'Pendiente' },
  { id: 'partially_matched', name: 'Parcial' },
  { id: 'matched', name: 'Conciliado' },
  { id: 'classified', name: 'Clasificado' },
  { id: 'ignored', name: 'Ignorado' },
  { id: 'internal_transfer', name: 'Traspaso interno' },
  { id: 'manually_closed', name: 'Cerrado manualmente' },
  { id: 'cancelled', name: 'Cancelado' },
];

const COLUMNS_CONFIG: ColumnsConfig[] = [
  { key: 'movement_date', label: 'Fecha', type: 'date' },
  { key: 'movement_time', label: 'Hora' },
  {
    key: 'movement_type_label',
    label: 'Tipo',
    type: 'chip',
    variantResolver: (row: entity.TreasuryBankMovementTableRow) =>
      resolveMovementTypeVariant(row),
  },
  { key: 'company_name', label: 'Empresa' },
  { key: 'bank_name', label: 'Banco' },
  { key: 'bank_account_display', label: 'Cuenta' },
  { key: 'description_original', label: 'Descripción' },
  {
    key: 'classification_label',
    label: 'Clasificación',
    type: 'chip',
    typeVariant: 'chip-neutral',
  },
  {
    key: 'amount',
    label: 'Monto',
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
    key: 'status_label',
    label: 'Estatus',
    type: 'chip',
    variantResolver: (row: entity.TreasuryBankMovementTableRow) =>
      resolveMovementStatusVariant(row),
  },
];

const DISPLAYED_COLUMNS: string[] = [
  ...COLUMNS_CONFIG.map(
    (column) => column.key,
  ),
  'actions',
];

function resolveMovementTypeVariant(
  row: entity.TreasuryBankMovementTableRow,
): ColumnVariant {
  return row.movement_type === 'inflow' ? 'chip-success' : 'chip-danger';
}

function resolveMovementStatusVariant(
  row: entity.TreasuryBankMovementTableRow,
): ColumnVariant {
  switch (row.status) {
    case 'matched':
    case 'manually_closed':
      return 'chip-success';

    case 'partially_matched':
    case 'unmatched':
      return 'chip-warning';

    case 'cancelled':
      return 'chip-danger';

    case 'classified':
    case 'ignored':
    case 'internal_transfer':
    default:
      return 'chip-neutral';
  }
}

@Component({
  selector: 'app-treasury-bank-movements',
  standalone: true,
  imports: [
    CommonModule,

    // UI
    ModuleHeader,
    DataTable,
    BtnsSection,
    InputDate,
    InputField,
    InputSelect,
    LoadingOverlay,

    // Angular Material
    MatPaginatorModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatTableModule,
    MatButtonModule,

    // Forms
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './treasury-bank-movements.html',
  styleUrl: './treasury-bank-movements.scss',
})
export class TreasuryBankMovements implements OnInit {
  // =========================================================
  // INYECCIONES
  // =========================================================

  private readonly treasuryService = inject(TreasuryService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly fb = inject(FormBuilder);
  private readonly storage = inject(LocalStorageService);
  private readonly dialogService = inject(DialogService);
  private readonly accountsReceivableService =
    inject(
      TreasuryAccountsReceivableService,
    );
  // =========================================================
  // CONFIG UI
  // =========================================================

  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;
  readonly headerConfig = HEADER_CONFIG;

  readonly movementTypeOptions = MOVEMENT_TYPE_OPTIONS;
  readonly movementStatusOptions = MOVEMENT_STATUS_OPTIONS;

  readonly loadingTable = signal(false);
  readonly loadingCatalogs = signal(false);

  companyOptions: Catalog[] = [];
  bankOptions: Catalog[] = [];
  bankAccountOptions: Catalog[] = [];
  classificationOptions: Catalog[] = [];

  // =========================================================
  // ESTADO / DATA
  // =========================================================

  filters: entity.TreasuryBankMovementFilters = {
    page: 1,
    limit: 10,
    search: '',
    company_id: null,
    bank_id: null,
    bank_account_id: null,
    date_from: null,
    date_to: null,
    classifications: null,
    movement_type: null,
    status: null,
  };

  bankMovementsTableData!: entity.TreasuryBankMovementsTablePaginatedResponse;

  formFilters = this.fb.group({
    dateRange: this.fb.control<DateRangeValue | null>(null),
    search: this.fb.control<string>(''),
    company_id: this.fb.control<Catalog | number | string | null>(null),
    bank_id: this.fb.control<Catalog | number | string | null>(null),
    bank_account_id: this.fb.control<Catalog | number | string | null>(null),
    movement_type: this.fb.control<entity.TreasuryBankMovementType | ''>(''),
    status: this.fb.control<entity.TreasuryBankMovementStatus | ''>(''),
    classifications: this.fb.control<string[]>([]),

  });

  // =========================================================
  // CICLO DE VIDA
  // =========================================================

  ngOnInit(): void {
    this.restoreFiltersFromStorage();
    this.loadCatalogs();
  }

  // =========================================================
  // GETTERS UI
  // =========================================================

  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();

    const hasDates = !!(
      form.dateRange?.startDate ||
      form.dateRange?.endDate
    );

    const hasSearch = !!form.search?.trim();
    const hasCompany = !!this.getCatalogValue(form.company_id ?? null);
    const hasBank = !!this.getCatalogValue(form.bank_id ?? null);
    const hasBankAccount = !!this.getCatalogValue(
      form.bank_account_id ?? null,
    );
    const hasMovementType = !!form.movement_type;
    const hasStatus = !!form.status;
    const hasClassifications =
      !!form.classifications?.length;
    return (
      hasDates ||
      hasSearch ||
      hasCompany ||
      hasBank ||
      hasBankAccount ||
      hasMovementType ||
      hasStatus ||
      hasClassifications
    );
  }

  // =========================================================
  // CARGA DE CATÁLOGOS
  // =========================================================

  private loadCatalogs(): void {
    this.loadingCatalogs.set(true);

    forkJoin({
      companies: this.catalogsService.treasuryCompaniesCatalog(),
      banks: this.catalogsService.treasuryBanksCatalog(),
      bankAccounts: this.catalogsService.treasuryBankAccountsCatalog(false),
      classifications:
        this.treasuryService.getBankMovementClassifications(),
    })
      .pipe(finalize(() => this.loadingCatalogs.set(false)))
      .subscribe({
        next: ({ companies, banks, bankAccounts, classifications }) => {
          this.companyOptions = companies ?? [];
          this.bankOptions = banks ?? [];
          this.bankAccountOptions = bankAccounts ?? [];
          this.classificationOptions = classifications ?? [];
        },
        error: (err) => {
          console.error('Error cargando catálogos de movimientos:', err);
        },
      });
  }

  // =========================================================
  // FILTROS + BÚSQUEDA
  // =========================================================

  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();

    const uiState: entity.TreasuryBankMovementUiFilters = {
      dateRange: value.dateRange ?? null,
      search: value.search?.trim() || '',
      company_id: value.company_id ?? null,
      bank_id: value.bank_id ?? null,
      bank_account_id: value.bank_account_id ?? null,
      movement_type: value.movement_type || '',
      status: value.status || '',
      classifications: value.classifications ?? [],
      page: 1,
      limit: this.filters.limit,
    };

    this.filters = this.buildBackendFiltersFromUi(uiState);
    this.saveFiltersToStorage(uiState);
    this.loadBankMovements();
  }

  clearAllAndSearch(): void {
    this.formFilters.reset(
      {
        dateRange: null,
        search: '',
        company_id: null,
        bank_id: null,
        bank_account_id: null,
        movement_type: '',
        classifications: [],
        status: '',
      },
      { emitEvent: false },
    );

    this.filters = {
      page: 1,
      limit: this.filters.limit,
      search: '',
      company_id: null,
      bank_id: null,
      classifications: null,
      bank_account_id: null,
      date_from: null,
      date_to: null,
      movement_type: null,
      status: null,
    };

    this.storage.removeItem(TREASURY_BANK_MOVEMENTS_FILTERS_KEY);
    this.loadBankMovements();
  }

  loadBankMovements(): void {
    if (this.loadingTable()) return;

    this.loadingTable.set(true);

    this.treasuryService
      .getBankMovements(this.filters)
      .pipe(finalize(() => this.loadingTable.set(false)))
      .subscribe({
        next: (response) => {
          const data = (response.data ?? []).map((row) =>
            this.mapBankMovementRow(row),
          );

          this.bankMovementsTableData = {
            ...response,
            data,
          };
        },
        error: (err) => {
          console.error('Error cargando movimientos bancarios:', err);
        },
      });
  }

  private buildBackendFiltersFromUi(
    ui: entity.TreasuryBankMovementUiFilters,
  ): entity.TreasuryBankMovementFilters {
    return {
      page: ui.page,
      limit: ui.limit,
      search: ui.search?.trim() || '',

      company_id: this.getNumberId(ui.company_id),
      bank_id: this.getNumberId(ui.bank_id),
      bank_account_id: this.getNumberId(ui.bank_account_id),

      classifications:
        ui.classifications?.length
          ? ui.classifications
          : null,

      date_from: ui.dateRange?.startDate ?? null,
      date_to: ui.dateRange?.endDate ?? null,

      movement_type: ui.movement_type || null,
      status: ui.status || null,
    };
  }

  private mapBankMovementRow(
    row: entity.TreasuryBankMovement,
  ): entity.TreasuryBankMovementTableRow {
    return {
      ...row,

      company_name: row.company?.name ?? null,
      bank_name: row.bank?.name ?? null,
      bank_account_display: this.getBankAccountDisplay(row),

      movement_type_label: this.getMovementTypeLabel(row.movement_type),

      classification_label: this.getClassificationLabel(row.classification),
      status_label: this.getStatusLabel(row.status),

      reference_display:
        row.bank_reference ??
        row.receipt_number ??
        row.tracking_key ??
        null,

      counterparty_display:
        row.counterparty_name ??
        row.counterparty_account ??
        null,

      import_file_name:
        row.import_file?.original_file_name ?? null,
    };
  }

  // =========================================================
  // PAGINACIÓN
  // =========================================================

  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;

    this.saveFiltersToStorage();
    this.loadBankMovements();
  }

  // =========================================================
  // ACCIONES FOOTER-FILTROS
  // =========================================================

  onBtnsSectionAction(action: string): void {
    switch (action) {
      case 'search':
        this.searchWithFilters();
        break;

      case 'clean':
        this.clearAllAndSearch();
        break;

      default:
        break;
    }
  }

  // =========================================================
  // LOCAL STORAGE
  // =========================================================

  private restoreFiltersFromStorage(): void {
    const saved = this.storage.getItem<entity.TreasuryBankMovementUiFilters>(
      TREASURY_BANK_MOVEMENTS_FILTERS_KEY,
    );

    if (!saved) {
      this.loadBankMovements();
      return;
    }

    const normalizedDateRange = this.normalizeDateRange(saved.dateRange);

    this.formFilters.patchValue(
      {
        dateRange: normalizedDateRange,
        search: saved.search ?? '',
        company_id: saved.company_id ?? null,
        bank_id: saved.bank_id ?? null,
        classifications: saved.classifications ?? [],
        bank_account_id: saved.bank_account_id ?? null,
        movement_type: saved.movement_type ?? '',
        status: saved.status ?? '',
      },
      { emitEvent: false },
    );

    this.filters = this.buildBackendFiltersFromUi({
      ...saved,
      dateRange: normalizedDateRange,
      search: saved.search ?? '',
      company_id: saved.company_id ?? null,
      bank_id: saved.bank_id ?? null,
      bank_account_id: saved.bank_account_id ?? null,
      classifications: saved.classifications ?? [],
      movement_type: saved.movement_type ?? '',
      status: saved.status ?? '',
      page: saved.page ?? 1,
      limit: saved.limit ?? this.filters.limit,
    });

    this.loadBankMovements();
  }

  private saveFiltersToStorage(
    state?: entity.TreasuryBankMovementUiFilters,
  ): void {
    if (!state) {
      const value = this.formFilters.getRawValue();

      state = {
        dateRange: value.dateRange ?? null,
        search: value.search?.trim() || '',
        company_id: value.company_id ?? null,
        classifications: value.classifications ?? [],
        bank_id: value.bank_id ?? null,
        bank_account_id: value.bank_account_id ?? null,
        movement_type: value.movement_type || '',
        status: value.status || '',
        page: this.filters.page,
        limit: this.filters.limit,
      };
    }

    this.storage.setItem(TREASURY_BANK_MOVEMENTS_FILTERS_KEY, state);
  }

  // =========================================================
  // HELPERS
  // =========================================================

  private getBankAccountDisplay(
    row: entity.TreasuryBankMovement,
  ): string {
    const alias = row.bank_account?.alias?.trim();
    const identifier = row.bank_account?.account_identifier?.trim();

    if (alias && identifier) return `${alias} · ${identifier}`;
    if (alias) return alias;
    if (identifier) return identifier;

    return 'Sin cuenta';
  }

  private getMovementTypeLabel(type: string | null | undefined): string {
    switch (type) {
      case 'inflow':
        return 'Entrada';

      case 'outflow':
        return 'Salida';

      default:
        return 'Sin tipo';
    }
  }

  private getStatusLabel(status: string | null | undefined): string {
    switch (status) {
      case 'unmatched':
        return 'Pendiente';

      case 'partially_matched':
        return 'Parcial';

      case 'matched':
        return 'Conciliado';

      case 'classified':
        return 'Clasificado';

      case 'ignored':
        return 'Ignorado';

      case 'internal_transfer':
        return 'Traspaso interno';

      case 'manually_closed':
        return 'Cerrado manualmente';

      case 'cancelled':
        return 'Cancelado';

      default:
        return 'Sin estatus';
    }
  }

  private getClassificationLabel(
    classification: string | null | undefined,
  ): string {
    if (!classification) return 'Sin clasificación';

    return classification
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private getCatalogValue(
    value: Catalog | number | string | null,
  ): string | number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number' || typeof value === 'string') {
      return value;
    }

    return value.id;
  }

  private getNumberId(value: unknown): number | null {
    const rawId = this.getCatalogValue(
      value as Catalog | number | string | null,
    );

    const id = Number(rawId);

    if (!id || Number.isNaN(id)) return null;

    return id;
  }

  private normalizeDateRange(
    dateRange:
      | entity.TreasuryBankMovementDateRange
      | DateRangeValue
      | null
      | undefined,
  ): DateRangeValue | null {
    if (!dateRange) return null;

    return {
      startDate: dateRange.startDate ?? null,
      endDate: dateRange.endDate ?? null,
    };
  }

  readonly bankMovementExtraActions:
    DataTableExtraAction<
      entity.TreasuryBankMovementTableRow
    >[] = [
      {
        type: 'movementHistory',

        icon: 'history',

        tooltip:
          'Ver historial',
      },
      {
        type: 'changeClassification',

        icon: 'label',

        tooltip:
          'Cambiar clasificación',

        iconClass:
          'table-action-icon--warning',

        roles: [
          'ADMIN_GENERAL',
        ],

        visible: (row) =>
          this.canChangeBankMovementClassification(
            row,
          ),
      },

      {
        type: 'manualReopen',

        icon: 'lock_open',

        tooltip:
          'Reabrir movimiento',

        iconClass:
          'table-action-icon--info',

        roles: [
          'ADMIN_GENERAL',
        ],

        visible: (row) =>
          row.movement_type ===
          'outflow' &&
          row.status ===
          'manually_closed' &&
          Number(
            row.manual_closed_amount ??
            0,
          ) > 0,
      },

      {
        type:
          'manualReopenReceivable',

        icon:
          'lock_open',

        tooltip:
          'Reabrir entrada CxC',

        iconClass:
          'table-action-icon--info',

        roles: [
          'ADMIN_GENERAL',
        ],

        visible: (
          row,
        ) =>
          row.movement_type ===
          'inflow' &&

          row.status ===
          'manually_closed' &&

          Number(
            row.manual_closed_amount ??
            0,
          ) > 0,
      },
    ];

  onBankMovementTableAction(
    event:
      DataTableActionEvent<
        entity.TreasuryBankMovementTableRow
      >,
  ): void {
    switch (event.type) {
      case 'movementHistory':
        this.openMovementHistory(
          event.row,
        );
        break;

      case 'manualReopenReceivable':

        this.openManualReopenReceivable(
          event.row,
        );

        break;

      case 'changeClassification':
        this.openBankMovementClassification(
          event.row,
        );
        break;

      case 'manualReopen':
        this.openManualReopen(
          event.row,
        );
        break;

      default:
        break;
    }
  }

  openMovementHistory(
    row:
      entity.TreasuryBankMovementTableRow,
  ): void {

    if (
      !row?.id
    ) {

      return;
    }


    // =======================================================
    // ENTRADA → HISTORIAL CxC
    // =======================================================

    if (
      row.movement_type ===
      'inflow'
    ) {

      this.dialogService
        .open(
          ModalReceivableMovementHistory,
          {
            movement_id:
              String(
                row.id,
              ),
          },
          'large',
        );

      return;
    }


    // =======================================================
    // SALIDA → HISTORIAL CxP ACTUAL
    // =======================================================

    if (
      row.movement_type ===
      'outflow'
    ) {

      this.dialogService
        .open(
          ModalAccountsPayableHistory,
          {
            movement:
              row,
          },
          'large',
        )
        .afterClosed()
        .subscribe(
          (
            historyChanged:
              boolean |
              null,
          ) => {

            if (
              !historyChanged
            ) {

              return;
            }


            /*
             * Conservamos exactamente el comportamiento
             * existente de CxP.
             */
            this.loadBankMovements();
          },
        );
    }
  }

  openManualReopenReceivable(
    row:
      entity.TreasuryBankMovementTableRow,
  ): void {

    const manualClosedAmount =
      Number(
        row.manual_closed_amount ??
        0,
      );


    if (
      !row?.id ||

      row.movement_type !==
      'inflow' ||

      row.status !==
      'manually_closed' ||

      manualClosedAmount <= 0
    ) {

      return;
    }


    /*
     * Consultamos el movimiento desde el contexto CxC.
     *
     * Así usamos el contrato REAL que espera
     * TreasuryReceivableManualReopenModalData
     * y no inventamos propiedades ni hacemos casts.
     */
    this.loadingTable.set(
      true,
    );


    this.accountsReceivableService
      .getBankMovementHistory(
        String(
          row.id,
        ),
      )
      .pipe(

        finalize(
          () => {

            this.loadingTable.set(
              false,
            );
          },
        ),
      )
      .subscribe({

        next: (
          response:
            TreasuryReceivableBankMovementHistoryResponse,
        ) => {

          const movement =
            response.bank_movement;


          if (
            !movement?.id ||

            movement.status !==
            'manually_closed' ||

            Number(
              movement.manual_closed_amount ??
              0,
            ) <= 0
          ) {

            return;
          }


          const modalData:
            TreasuryReceivableManualReopenModalData = {

            movement,
          };


          this.dialogService
            .open(
              ModalAccountsReceivableManualReopen,
              modalData,
              'medium',
            )
            .afterClosed()
            .subscribe(
              (
                result:
                  | TreasuryReceivableMovementMutationResponse
                  | null,
              ) => {

                if (
                  !result?.success
                ) {

                  return;
                }


                this.loadBankMovements();
              },
            );
        },


        error: (
          error:
            unknown,
        ) => {

          console.error(
            'Error cargando el movimiento CxC para reapertura:',
            error,
          );


          this.dialogService
            .confirm({

              title:
                'No se pudo cargar el movimiento',

              message:
                'No fue posible consultar la información del movimiento para reabrirlo.',

              confirmText:
                'Aceptar',

              cancelText:
                '',
            })
            .subscribe();
        },

      });
  }


  openBankMovementClassification(
    row:
      entity.TreasuryBankMovementTableRow,
  ): void {
    if (
      !this.canChangeBankMovementClassification(
        row,
      )
    ) {
      return;
    }

    const modalData:
      entity.TreasuryBankMovementClassificationModalData = {
      movement: row,
    };

    this.dialogService
      .open(
        ModalBankMovementClassification,
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

          /*
           * Conserva los filtros y la página actual.
           * Solo consulta nuevamente la tabla.
           */
          this.loadBankMovements();
        },
      );
  }

  private canChangeBankMovementClassification(
    row:
      entity.TreasuryBankMovementTableRow,
  ): boolean {
    const originalAmount =
      roundMoney(
        Number(
          row.amount ?? 0,
        ),
      );

    const availableAmount =
      roundMoney(
        Number(
          row.available_amount ?? 0,
        ),
      );

    const appliedAmount =
      roundMoney(
        Number(
          row.applied_amount ?? 0,
        ),
      );

    const manualClosedAmount =
      roundMoney(
        Number(
          row.manual_closed_amount ?? 0,
        ),
      );

    return (
      Boolean(row?.id) &&
      row.movement_type ===
      'outflow' &&
      row.status ===
      'unmatched' &&
      originalAmount > 0 &&
      availableAmount ===
      originalAmount &&
      appliedAmount === 0 &&
      manualClosedAmount === 0
    );
  }

  openManualReopen(
    row:
      entity.TreasuryBankMovementTableRow,
  ): void {
    const manualClosedAmount =
      Number(
        row.manual_closed_amount ??
        0,
      );

    if (
      !row?.id ||
      row.movement_type !==
      'outflow' ||
      row.status !==
      'manually_closed' ||
      manualClosedAmount <= 0
    ) {
      return;
    }

    const amount =
      Number(row.amount ?? 0);

    const availableAmount =
      Number(
        row.available_amount ??
        0,
      );

    const appliedAmount =
      roundMoney(
        Number(
          row.applied_amount ??
          (
            amount -
            availableAmount -
            manualClosedAmount
          ),
        ),
      );

    const movement:
      TreasuryBankMovementHistoryCurrentMovement = {
      id:
        String(row.id),

      movement_date:
        row.movement_date,

      movement_time:
        row.movement_time ??
        null,

      movement_type:
        row.movement_type,

      amount,

      available_amount:
        availableAmount,

      applied_amount:
        appliedAmount,

      manual_closed_amount:
        manualClosedAmount,

      status:
        row.status,

      classification:
        row.classification ??
        null,

      description_original:
        row.description_original ??
        '',

      bank_reference:
        row.bank_reference ??
        null,

      receipt_number:
        row.receipt_number ??
        null,

      tracking_key:
        row.tracking_key ??
        null,

      company:
        row.company
          ? {
            id:
              row.company.id,

            code:
              row.company.code,

            name:
              row.company.name,
          }
          : null,

      bank:
        row.bank
          ? {
            id:
              row.bank.id,

            code:
              row.bank.code,

            name:
              row.bank.name,
          }
          : null,

      bank_account:
        row.bank_account
          ? {
            id:
              row.bank_account.id,

            account_identifier:
              row.bank_account
                .account_identifier,

            alias:
              row.bank_account.alias,

            currency:
              row.bank_account
                .currency ||
              'MXN',
          }
          : null,
    };

    const modalData:
      TreasuryManualReopenBankMovementModalData = {
      movement,
    };

    this.dialogService
      .open(
        ModalAccountsPayableManualReopen,
        modalData,
        'medium',
      )
      .afterClosed()
      .subscribe(
        (
          result:
            | TreasuryManualReopenBankMovementResponse
            | null,
        ) => {
          if (!result?.success) {
            return;
          }

          this.loadBankMovements();
        },
      );
  }
}