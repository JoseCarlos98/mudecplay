import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  OnInit,
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

import {
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';


// =========================================================
// UI COMPARTIDA
// =========================================================

import {
  ModuleHeader,
} from '../../shared/ui/module-header/module-header';

import {
  ModuleHeaderConfig,
} from '../../shared/ui/module-header/interfaces/module-header-interface';

import {
  DataTable,
} from '../../shared/ui/data-table/data-table';

import {
  ColumnsConfig,
  ColumnVariant,
  DataTableActionEvent,
} from '../../shared/ui/data-table/interfaces/table-interfaces';

import {
  DateRangeValue,
  InputDate,
} from '../../shared/ui/input-date/input-date';

import {
  InputField,
} from '../../shared/ui/input-field/input-field';

import {
  BtnsSection,
} from '../../shared/ui/btns-section/btns-section';

import {
  InputSelect,
} from '../../shared/ui/input-select/input-select';

import {
  LoadingOverlay,
} from '../../shared/ui/loading-overlay/loading-overlay';


// =========================================================
// SERVICIOS
// =========================================================

import {
  AccountsReceivableService,
} from './services/accounts-receivable.service';

import {
  DialogService,
} from '../../shared/services/dialog.service';

import {
  LocalStorageService,
} from '../../shared/services/local-storage.service';


// =========================================================
// INTERFACES
// =========================================================

import {
  PaginatedResponse,
} from '../../shared/interfaces/general-interfaces';

import * as entity
  from './interfaces/accounts-receivable-interfaces';


// =========================================================
// MODALES
// =========================================================

import {
  ModalReceivableXml,
} from './components/modal-receivable-xml/modal-receivable-xml';


// =========================================================
// STORAGE
// =========================================================

const ACCOUNTS_RECEIVABLE_FILTERS_KEY =
  'mp_accounts_receivable_filters_v1';


// =========================================================
// ESTATUS
// =========================================================

function resolveReceivableStatusVariant(
  row:
    entity.AccountReceivableRow,
): ColumnVariant {

  switch (row.status) {

    case 'collected':
      return 'chip-success';

    case 'partial':
      return 'chip-warning';

    case 'pending':
    default:
      return 'chip-warning';
  }
}


// =========================================================
// COLUMNAS
// =========================================================

const COLUMNS_CONFIG:
  ColumnsConfig[] = [

    {
      key: 'company_label',
      label: 'Empresa',
      type: 'chip',
      typeVariant:
        'chip-neutral',
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
      key: 'project',
      label: 'Proyecto',
      type: 'relation',

      fallback:
        'No asignado',

      fallbackVariant:
        'chip-warning',
    },

    {
      key: 'issue_date',
      label: 'Fecha emisión',
      type: 'date',
    },

    {
      key: 'estimated_collection_date',
      label: 'Cobro estimado',
      type: 'date',
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
      key: 'pending_amount',
      label: 'Pendiente',
      type: 'money',
      align: 'right',
    },

    {
      key: 'status_label',
      label: 'Estatus',
      type: 'chip',

      variantResolver:
        (
          row:
            entity.AccountReceivableRow,
        ) =>
          resolveReceivableStatusVariant(
            row,
          ),
    },

    {
      key: 'last_collection_date',
      label: 'Último cobro',
      type: 'date',
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

  showNew: false,

  showUploadXml: true,

  newRoles: [
    'CUENTAS_POR_COBRAR_EDITOR',
  ],

  uploadXmlRoles: [
    'CUENTAS_POR_COBRAR_XML_IMPORTADOR',
  ],
};


@Component({
  selector:
    'app-accounts-receivable',

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
    LoadingOverlay,

    MatPaginatorModule,
  ],

  templateUrl:
    './accounts-receivable.html',

  styleUrl:
    './accounts-receivable.scss',
})
export class AccountsReceivable
  implements OnInit {

  // =======================================================
  // INYECCIONES
  // =======================================================

  private readonly accountsReceivableService =
      inject(
        AccountsReceivableService,
      );

  private readonly dialogService =
    inject(
      DialogService,
    );

  private readonly fb =
    inject(
      FormBuilder,
    );

  private readonly router =
    inject(
      Router,
    );

  private readonly storage =
    inject(
      LocalStorageService,
    );


  // =======================================================
  // XML
  // =======================================================

  @ViewChild(
    'xmlInput',
  )
  xmlInput!:
    ElementRef<HTMLInputElement>;


  // =======================================================
  // UI
  // =======================================================

  readonly columnsConfig =
    COLUMNS_CONFIG;

  readonly displayedColumns =
    DISPLAYED_COLUMNS;

  readonly headerConfig =
    HEADER_CONFIG;

  readonly statusOptions =
    entity
      .ACCOUNTS_RECEIVABLE_STATUS_OPTIONS;

  readonly companyOptions =
    entity
      .ACCOUNTS_RECEIVABLE_COMPANY_OPTIONS;

  readonly loadingTable =
    signal(false);


  // =======================================================
  // DATA
  // =======================================================

  filters:
    entity.FiltersAccountsReceivable = {
      page: 1,
      limit: 5,
    };

  accountsReceivableTableData!:
    PaginatedResponse<
      entity.AccountReceivableRow
    >;


  // =======================================================
  // FILTROS
  // =======================================================

  readonly formFilters =
    this.fb.group({

      dateRange:
        this.fb.control<
          DateRangeValue | null
        >(
          null,
        ),

      folio:
        this.fb.control<string>(
          '',
        ),

      companyCode:
        this.fb.control<
          string | null
        >(
          null,
        ),

      clientQuery:
        this.fb.control<string>(
          '',
        ),

      status:
        this.fb.control<
          | entity.AccountReceivableFinancialStatus
          | null
        >(
          null,
        ),
    });


  // =======================================================
  // CICLO DE VIDA
  // =======================================================

  ngOnInit(): void {

    this.restoreFiltersFromStorage();
  }


  // =======================================================
  // FILTROS BACKEND
  // =======================================================

  private buildBackendFiltersFromUi(
    ui:
      entity.AccountsReceivableUiFilters,
  ): entity.FiltersAccountsReceivable {

    return {
      page:
        ui.page,

      limit:
        ui.limit,

      startDate:
        ui.dateRange
          ?.startDate ??
        null,

      endDate:
        ui.dateRange
          ?.endDate ??
        null,

      folio:
        ui.folio
          ?.trim() ||
        null,

      companyCode:
        ui.companyCode ??
        null,

      clientQuery:
        ui.clientQuery
          ?.trim() ||
        null,

      status:
        ui.status ??
        null,
    };
  }


  searchWithFilters(): void {

    const value =
      this.formFilters
        .getRawValue();

    const uiState:
      entity.AccountsReceivableUiFilters = {

      dateRange:
        value.dateRange ??
        null,

      folio:
        value.folio ??
        '',

      companyCode:
        value.companyCode ??
        null,

      clientQuery:
        value.clientQuery ??
        '',

      status:
        value.status ??
        null,

      page:
        1,

      limit:
        this.filters.limit,
    };

    this.filters =
      this.buildBackendFiltersFromUi(
        uiState,
      );

    this.saveFiltersToStorage(
      uiState,
    );

    this.loadAccountsReceivable();
  }


  // =======================================================
  // ACCIONES TABLA
  // =======================================================

  onTableAction(
    event:
      DataTableActionEvent<
        entity.AccountReceivableRow
      >,
  ): void {

    switch (event.type) {

      case 'edit':

        this.router.navigateByUrl(
          `/cuentas-por-cobrar/editar/${event.row.id}`,
        );

        break;


      case 'delete':

        this.onDelete(
          event.row,
        );

        break;
    }
  }


  // =======================================================
  // DELETE
  // =======================================================

  onDelete(
    account:
      entity.AccountReceivableRow,
  ): void {

    const invoice =
      account.series
        ? `${account.series}-${account.folio}`
        : account.folio;

    this.dialogService
      .confirm({
        size:
          'mini',

        message:
          `¿Quieres eliminar la cuenta por cobrar:\n"${invoice}"?`,

        confirmText:
          'Eliminar',

        cancelText:
          'Cancelar',
      })
      .subscribe(
        (
          confirmed,
        ) => {

          if (!confirmed) {
            return;
          }

          this.accountsReceivableService
            .remove(
              account.id,
            )
            .subscribe({

              next: () =>
                this.loadAccountsReceivable(),

              error: (
                error,
              ) =>
                console.error(
                  'Error al eliminar cuenta por cobrar:',
                  error,
                ),
            });
        },
      );
  }


  // =======================================================
  // LISTADO
  // =======================================================

  loadAccountsReceivable(): void {

    if (
      this.loadingTable()
    ) {
      return;
    }

    this.loadingTable.set(
      true,
    );

    this.accountsReceivableService
      .getAccountsReceivable(
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

        next: (
          response,
        ) => {

          const data:
            entity.AccountReceivableRow[] =
            (
              response.data ??
              []
            ).map(
              (
                row,
              ) => ({

                ...row,

                invoice_display:
                  row.series
                    ? `${row.series}-${row.folio}`
                    : row.folio,

                company_label:
                  this.resolveCompanyLabel(
                    row.company_code,
                  ),

                status_label:
                  this.resolveStatusLabel(
                    row.status,
                  ),
              }),
            );

          this.accountsReceivableTableData = {
            ...response,
            data,
          };
        },

        error: (
          error,
        ) => {

          console.error(
            'Error al cargar cuentas por cobrar:',
            error,
          );
        },
      });
  }


  private resolveStatusLabel(
    status:
      entity.AccountReceivableFinancialStatus,
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


  // =======================================================
  // PAGINACIÓN
  // =======================================================

  onPageChange(
    event:
      PageEvent,
  ): void {

    this.filters.page =
      event.pageIndex + 1;

    this.filters.limit =
      event.pageSize;

    this.saveFiltersToStorage();

    this.loadAccountsReceivable();
  }


  // =======================================================
  // HEADER
  // =======================================================

  onHeaderAction(
    action:
      string,
  ): void {

    switch (action) {

      case 'upload':

        this.xmlInput
          .nativeElement
          .click();

        break;
    }
  }


  // =======================================================
  // BOTONES FILTROS
  // =======================================================

  onBtnsSectionAction(
    action:
      string,
  ): void {

    switch (action) {

      case 'search':

        this.searchWithFilters();

        break;


      case 'clean':

        this.clearAllAndSearch();

        break;
    }
  }


  get hasActiveFilters():
    boolean {

    const form =
      this.formFilters
        .getRawValue();

    const hasDates =
      Boolean(
        form.dateRange
          ?.startDate ||
        form.dateRange
          ?.endDate,
      );

    const hasFolio =
      Boolean(
        form.folio
          ?.trim(),
      );

    const hasCompany =
      Boolean(
        form.companyCode,
      );

    const hasClientQuery =
      Boolean(
        form.clientQuery
          ?.trim(),
      );

    const hasStatus =
      Boolean(
        form.status,
      );

    return (
      hasDates ||
      hasFolio ||
      hasCompany ||
      hasClientQuery ||
      hasStatus
    );
  }


  clearAllAndSearch(): void {

    this.formFilters.reset(
      {
        dateRange:
          null,

        folio:
          '',

        companyCode:
          null,

        clientQuery:
          '',

        status:
          null,
      },
      {
        emitEvent:
          false,
      },
    );

    this.filters = {
      page:
        1,

      limit:
        this.filters.limit,

      startDate:
        null,

      endDate:
        null,

      folio:
        null,

      companyCode:
        null,

      clientQuery:
        null,

      status:
        null,
    };

    this.storage.removeItem(
      ACCOUNTS_RECEIVABLE_FILTERS_KEY,
    );

    this.loadAccountsReceivable();
  }


  // =======================================================
  // STORAGE
  // =======================================================

  private restoreFiltersFromStorage():
    void {

    const saved =
      this.storage.getItem<
        entity.AccountsReceivableUiFilters
      >(
        ACCOUNTS_RECEIVABLE_FILTERS_KEY,
      );

    if (!saved) {

      this.searchWithFilters();

      return;
    }

    this.formFilters.patchValue(
      {
        dateRange:
          saved.dateRange,

        folio:
          saved.folio,

        companyCode:
          saved.companyCode,

        clientQuery:
          saved.clientQuery,

        status:
          saved.status,
      },
      {
        emitEvent:
          false,
      },
    );

    this.filters =
      this.buildBackendFiltersFromUi(
        saved,
      );

    this.loadAccountsReceivable();
  }


  private saveFiltersToStorage(
    state?:
      entity.AccountsReceivableUiFilters,
  ): void {

    if (!state) {

      const value =
        this.formFilters
          .getRawValue();

      state = {
        dateRange:
          value.dateRange ??
          null,

        folio:
          value.folio ??
          '',

        companyCode:
          value.companyCode ??
          null,

        clientQuery:
          value.clientQuery ??
          '',

        status:
          value.status ??
          null,

        page:
          this.filters.page,

        limit:
          this.filters.limit,
      };
    }

    this.storage.setItem(
      ACCOUNTS_RECEIVABLE_FILTERS_KEY,
      state,
    );
  }


  // =======================================================
  // XML
  // =======================================================

  onXmlSelected(
    event:
      Event,
  ): void {

    const input =
      event.target as
        HTMLInputElement;

    if (
      !input.files ||
      input.files.length === 0
    ) {
      return;
    }

    const files =
      Array.from(
        input.files,
      );

    this.accountsReceivableService
      .uploadXml(
        files,
      )
      .pipe(
        finalize(
          () =>
            input.value = '',
        ),
      )
      .subscribe({

        next: (
          response,
        ) => {

          const drafts =
            response.drafts ??
            [];

          const duplicates =
            response.duplicates ??
            [];

          const errors =
            response.errors ??
            [];

          if (
            errors.length > 0 &&
            drafts.length === 0 &&
            duplicates.length === 0
          ) {

            const message =
              errors
                .map(
                  (
                    error,
                  ) =>
                    `• ${error.sourceFileName}: ${error.reason}`,
                )
                .join(
                  '\n',
                );

            this.dialogService
              .confirm({
                title:
                  'Errores al leer XML',

                message:
                  message ||
                  'Ocurrió un error al procesar los XML.',

                confirmText:
                  'OK',

                cancelText:
                  '',
              })
              .subscribe();

            return;
          }

          if (
            !drafts.length &&
            !duplicates.length
          ) {

            this.dialogService
              .confirm({
                title:
                  'Sin resultados',

                message:
                  'No se encontraron XML válidos en la carga.',

                confirmText:
                  'OK',

                cancelText:
                  '',
              })
              .subscribe();

            return;
          }

          this.dialogService
            .open(
              ModalReceivableXml,
              {
                drafts,
                duplicates,
              },
              'large',
            )
            .afterClosed()
            .subscribe(
              (
                result,
              ) => {

                if (!result) {
                  return;
                }

                if (
                  result.action ===
                    'import' &&
                  result.drafts
                    ?.length
                ) {

                  this.accountsReceivableService
                    .setXmlQueueToImport(
                      result.drafts,
                    );

                  this.router.navigateByUrl(
                    '/cuentas-por-cobrar/nuevo',
                  );
                }
              },
            );
        },

        error: (
          error,
        ) => {

          console.error(
            'Error al subir XMLs',
            error,
          );

          this.dialogService
            .confirm({
              title:
                'Error',

              message:
                'Ocurrió un error al subir los XML.',

              confirmText:
                'OK',

              cancelText:
                '',
            })
            .subscribe();
        },
      });
  }


  // =======================================================
  // EMPRESA
  // =======================================================

  private resolveCompanyLabel(
    code:
      string,
  ): string {

    switch (code) {

      case 'MUDECPLAY':
        return 'MUDECPLAY';

      case 'CONSTRUCTORA_PELEN':
        return 'CONSTRUCTORA PELEN';

      default:
        return code;
    }
  }
}