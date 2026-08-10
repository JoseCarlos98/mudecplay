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
  ActivatedRoute,
  Router,
} from '@angular/router';

import { finalize } from 'rxjs';

// Angular Material
import { MatIconModule } from '@angular/material/icon';

import {
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';

import { MatTooltipModule } from '@angular/material/tooltip';

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

import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';

import { LoadingOverlay } from '../../../../shared/ui/loading-overlay/loading-overlay';

// Módulo
import { PurchaseOrdersService } from '../../services/purchase-orders.service';

import * as entity from '../../interfaces/purchase-orders.interfaces';


// =========================================================
// HEADER
// =========================================================

const HEADER_CONFIG:
  ModuleHeaderConfig = {};


// =========================================================
// TABS PRINCIPALES
// =========================================================

type PurchaseOrderReportsTab =
  | 'operational_summary'
  | 'pending_details';


// =========================================================
// CONFIGURACIÓN DE TARJETAS
// =========================================================

interface PurchaseOrderReportSummaryCard {
  key: string;

  label: string;

  value: number;

  icon: string;

  tooltip: string;

  /**
   * Si tiene categoría, la tarjeta puede abrir
   * directamente el Detail correspondiente.
   *
   * payment_completed no tiene Detail porque
   * no representa un pendiente.
   */
  category:
    entity.PurchaseOrderReportDetailCategory
    | null;
}


// =========================================================
// CATEGORÍAS DEL DETAIL
// =========================================================

interface PurchaseOrderReportCategoryOption {
  category:
    entity.PurchaseOrderReportPendingCategory;

  label: string;

  icon: string;
}

const DETAIL_CATEGORY_OPTIONS:
  PurchaseOrderReportCategoryOption[] = [
    {
      category: 'all',
      label: 'Todos',
      icon: 'dashboard',
    },
    {
      category: 'pending_authorization',
      label: 'Autorización',
      icon: 'approval',
    },
    {
      category: 'pending_photo',
      label: 'Foto',
      icon: 'add_a_photo',
    },
    {
      category: 'pending_reconciliation',
      label: 'Por conciliar',
      icon: 'compare_arrows',
    },
    {
      category: 'invoice_pending_xml',
      label: 'XML',
      icon: 'description',
    },
    {
      category: 'no_invoice_pending_expense',
      label: 'Gasto',
      icon: 'receipt_long',
    },
    {
      category: 'pending_payment',
      label: 'Pago',
      icon: 'payments',
    },
    {
      category: 'loose_pending_photos',
      label: 'Fotos sueltas',
      icon: 'photo_library',
    },
    {
      category: 'available_xml',
      label: 'XML disponibles',
      icon: 'folder_open',
    },
    {
      category: 'available_xml_items',
      label: 'Partidas XML',
      icon: 'list_alt',
    },
  ];


// =========================================================
// COLUMNAS - PENDIENTES RECIENTES
// =========================================================

const RECENT_PENDING_COLUMNS:
  ColumnsConfig[] = [
    {
      key: 'date',
      label: 'Fecha',
      type: 'date',
    },
    {
      key: 'folio',
      label: 'O.C.',
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
      key: 'requested_amount',
      label: 'Monto',
      type: 'money',
      align: 'right',
    },
    {
      key: 'status_label',
      label: 'Pendiente',
      type: 'chip',

      variantResolver: (
        row:
          entity.PurchaseOrderReportTableRow,
      ) =>
        resolvePendingVariant(
          row.category,
        ),
    },
  ];

const RECENT_PENDING_DISPLAYED_COLUMNS = [
  ...RECENT_PENDING_COLUMNS.map(
    (column) =>
      column.key,
  ),
  'actions',
];


// =========================================================
// COLUMNAS - DETAIL
// =========================================================

const DETAIL_COLUMNS:
  Record<
    entity.PurchaseOrderReportDetailCategory,
    ColumnsConfig[]
  > = {

    pending_authorization: [
      {
        key: 'date',
        label: 'Fecha',
        type: 'date',
      },
      {
        key: 'folio',
        label: 'O.C.',
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
        key: 'requested_by_name',
        label: 'Solicitante',
      },
      {
        key: 'requested_amount',
        label: 'Monto',
        type: 'money',
        align: 'right',
      },
    ],

    pending_photo: [
      {
        key: 'date',
        label: 'Fecha',
        type: 'date',
      },
      {
        key: 'folio',
        label: 'O.C.',
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
        key: 'authorized_at',
        label: 'Autorizada',
        type: 'date',
      },
      {
        key: 'requested_amount',
        label: 'Monto',
        type: 'money',
        align: 'right',
      },
    ],

    pending_reconciliation: [
      {
        key: 'date',
        label: 'Fecha',
        type: 'date',
      },
      {
        key: 'folio',
        label: 'O.C.',
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
        key: 'photo_count',
        label: 'Fotos',
        align: 'center',
      },
      {
        key: 'latest_photo_at',
        label: 'Última foto',
        type: 'date',
      },
      {
        key: 'requested_amount',
        label: 'Monto',
        type: 'money',
        align: 'right',
      },
    ],

    invoice_pending_xml: [
      {
        key: 'date',
        label: 'Fecha',
        type: 'date',
      },
      {
        key: 'folio',
        label: 'O.C.',
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
        key: 'destination_type_label',
        label: 'Destino',
        type: 'chip',

        variantResolver: (
          row:
            entity.PurchaseOrderReportTableRow,
        ) =>
          resolveDestinationVariant(
            row.destination_type,
          ),
      },
      {
        key: 'requested_amount',
        label: 'Monto',
        type: 'money',
        align: 'right',
      },
    ],

    no_invoice_pending_expense: [
      {
        key: 'date',
        label: 'Fecha',
        type: 'date',
      },
      {
        key: 'folio',
        label: 'O.C.',
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
        key: 'destination_type_label',
        label: 'Destino',
        type: 'chip',

        variantResolver: (
          row:
            entity.PurchaseOrderReportTableRow,
        ) =>
          resolveDestinationVariant(
            row.destination_type,
          ),
      },
      {
        key: 'requested_amount',
        label: 'Monto',
        type: 'money',
        align: 'right',
      },
    ],

    pending_payment: [
      {
        key: 'date',
        label: 'Fecha',
        type: 'date',
      },
      {
        key: 'folio',
        label: 'O.C.',
      },
      {
        key: 'project_name',
        label: 'Proyecto',
      },
      {
        key: 'expenses_display',
        label: 'Gasto(s)',
      },
      {
        key: 'related_amount',
        label: 'Relacionado',
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
        key: 'balance',
        label: 'Saldo',
        type: 'money',
        align: 'right',
      },
    ],

    loose_pending_photos: [
      {
        key: 'date',
        label: 'Fecha',
        type: 'date',
      },
      {
        key: 'file_name',
        label: 'Archivo',
      },
      {
        key: 'project_name',
        label: 'Proyecto',
      },
      {
        key: 'uploaded_by_name',
        label: 'Subida por',
      },
    ],

    available_xml: [
      {
        key: 'date',
        label: 'Fecha',
        type: 'date',
      },
      {
        key: 'internal_folio',
        label: 'Folio',
      },
      {
        key: 'supplier_name',
        label: 'Proveedor',
      },
      {
        key: 'available_items_count',
        label: 'Partidas disponibles',
        align: 'center',
      },
      {
        key: 'available_amount',
        label: 'Importe disponible',
        type: 'money',
        align: 'right',
      },
      {
        key: 'cfdi_uuid',
        label: 'UUID',
      },
    ],

    available_xml_items: [
      {
        key: 'date',
        label: 'Fecha',
        type: 'date',
      },
      {
        key: 'internal_folio',
        label: 'Folio',
      },
      {
        key: 'supplier_name',
        label: 'Proveedor',
      },
      {
        key: 'concept',
        label: 'Concepto',
      },
      {
        key: 'item_type_label',
        label: 'Tipo',
        type: 'chip',

        variantResolver: (
          row:
            entity.PurchaseOrderReportTableRow,
        ) =>
          resolveDestinationVariant(
            row.item_type,
          ),
      },
      {
        key: 'amount',
        label: 'Monto',
        type: 'money',
        align: 'right',
      },
    ],
  };


// =========================================================
// CATEGORÍAS QUE REPRESENTAN O.C.
// =========================================================

const PURCHASE_ORDER_DETAIL_CATEGORIES =
  new Set<
    entity.PurchaseOrderReportDetailCategory
  >([
    'pending_authorization',
    'pending_photo',
    'pending_reconciliation',
    'invoice_pending_xml',
    'no_invoice_pending_expense',
    'pending_payment',
  ]);


// =========================================================
// RESOLVERS DE CHIPS
// =========================================================

function resolvePendingVariant(
  category:
    | entity.PurchaseOrderReportDetailCategory
    | undefined,
): ColumnVariant {

  switch (category) {

    case 'pending_payment':
      return 'chip-danger';

    case 'pending_authorization':
    case 'pending_reconciliation':
    case 'no_invoice_pending_expense':
      return 'chip-warning';

    case 'pending_photo':
    case 'invoice_pending_xml':
      return 'chip-neutral';

    default:
      return 'chip-neutral';
  }
}


function resolveDestinationVariant(
  type:
    | entity.PurchaseOrderDestinationType
    | undefined,
): ColumnVariant {

  return type === 'warehouse'
    ? 'chip-warning'
    : 'chip-neutral';
}


// =========================================================
// COMPONENT
// =========================================================

@Component({
  selector: 'app-purchase-order-reports',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,

    ModuleHeader,
    DataTable,
    InputField,
    BtnsSection,
    LoadingOverlay,

    MatIconModule,
    MatPaginatorModule,
    MatTooltipModule,
  ],

  templateUrl:
    './purchase-order-reports.html',

  styleUrl:
    './purchase-order-reports.scss',
})
export class PurchaseOrderReports
  implements OnInit {

  // =========================================================
  // INYECCIONES
  // =========================================================

  private readonly purchaseOrdersService =
    inject(PurchaseOrdersService);

  private readonly router =
    inject(Router);

  private readonly route =
    inject(ActivatedRoute);

  private readonly fb =
    inject(FormBuilder);


  // =========================================================
  // HEADER / TABS
  // =========================================================

  readonly headerConfig =
    HEADER_CONFIG;

  readonly activeTab =
    signal<PurchaseOrderReportsTab>(
      'operational_summary',
    );

  readonly activeDetailCategory =
    signal<
      entity.PurchaseOrderReportPendingCategory
    >(
      'all',
    );

  readonly detailCategoryOptions =
    DETAIL_CATEGORY_OPTIONS;


  // =========================================================
  // LOADING
  // =========================================================

  readonly loadingOperationalSummary =
    signal(false);

  readonly loadingPendingDetails =
    signal(false);

  readonly loadingPage =
    computed(
      () =>
        this.loadingOperationalSummary() ||
        this.loadingPendingDetails(),
    );

  /**
   * Evita que una petición anterior del Detail
   * sobrescriba una categoría seleccionada después.
   */
  private detailRequestSequence = 0;


  // =========================================================
  // CORTE OPERATIVO
  // =========================================================

  operationalSummary:
    entity.PurchaseOrderOperationalSummaryResponse = {
      purchase_orders: {
        pending_authorization: 0,
        pending_photo: 0,
        pending_reconciliation: 0,

        invoice_pending_xml: 0,
        no_invoice_pending_expense: 0,

        pending_payment: 0,
        payment_completed: 0,
      },

      operational_crosscheck: {
        loose_pending_photos: 0,
        available_xml: 0,
        available_xml_items: 0,
      },

      recent_pending: [],

      generated_at: '',
    };


  recentPendingRows:
    entity.PurchaseOrderReportTableRow[] = [];


  readonly recentPendingColumns =
    RECENT_PENDING_COLUMNS;

  readonly recentPendingDisplayedColumns =
    RECENT_PENDING_DISPLAYED_COLUMNS;


  // =========================================================
  // DETAIL
  // =========================================================

  detailFilters:
    entity.PurchaseOrderPendingDetailFilters = {
      category: 'all',

      search: '',

      page: 1,

      limit: 20,
    };


  allPendingDetails:
    entity.PurchaseOrderPendingDetailAllResponse = {
      category: 'all',

      sections: [],

      generated_at: '',
    };


  paginatedPendingDetails:
    entity.PurchaseOrderPendingDetailPaginatedResponse
    | null = null;


  detailRows:
    entity.PurchaseOrderReportTableRow[] = [];


  /**
   * Filas ya normalizadas para los previews
   * cuando category = all.
   */
  allSectionRows =
    new Map<
      entity.PurchaseOrderReportDetailCategory,
      entity.PurchaseOrderReportTableRow[]
    >();


  private detailsLoaded = false;


  // =========================================================
  // FORMULARIO DETAIL
  // =========================================================

  readonly detailFilterForm =
    this.fb.group({
      search:
        this.fb.control<string>(''),
    });


  // =========================================================
  // DATATABLE
  // =========================================================

  readonly tableActionPermissions = {
    showEdit: false,
    showDelete: false,
  };


  readonly recentPendingExtraActions:
    DataTableExtraAction<
      entity.PurchaseOrderReportTableRow
    >[] = [
      {
        type: 'viewPurchaseOrder',

        icon: 'visibility',

        tooltip:
          'Ver orden de compra',
      },
    ];


  readonly detailExtraActions:
    DataTableExtraAction<
      entity.PurchaseOrderReportTableRow
    >[] = [
      {
        type: 'viewPurchaseOrder',

        icon: 'visibility',

        tooltip:
          'Ver orden de compra',

        visible: (row) =>
          Number(
            row.purchase_order_id ?? 0,
          ) > 0,
      },
    ];


  // =========================================================
  // CICLO DE VIDA
  // =========================================================

  ngOnInit(): void {
    this.loadOperationalSummary();
  }


  // =========================================================
  // TARJETAS DEL CORTE
  // =========================================================

  get purchaseOrderSummaryCards():
    PurchaseOrderReportSummaryCard[] {

    const summary =
      this.operationalSummary
        .purchase_orders;

    return [
      {
        key:
          'pending_authorization',

        label:
          'Pendientes de autorización',

        value:
          summary.pending_authorization,

        icon:
          'approval',

        tooltip:
          'O.C. que todavía se encuentran en revisión y no han sido autorizadas.',

        category:
          'pending_authorization',
      },

      {
        key:
          'pending_photo',

        label:
          'Pendientes de foto',

        value:
          summary.pending_photo,

        icon:
          'add_a_photo',

        tooltip:
          'O.C. autorizadas que todavía no tienen una foto activa ni un gasto relacionado.',

        category:
          'pending_photo',
      },

      {
        key:
          'pending_reconciliation',

        label:
          'Fotos por conciliar',

        value:
          summary.pending_reconciliation,

        icon:
          'compare_arrows',

        tooltip:
          'O.C. autorizadas con foto cargada, pero todavía sin una foto conciliada ni gasto relacionado.',

        category:
          'pending_reconciliation',
      },

      {
        key:
          'invoice_pending_xml',

        label:
          'Pendientes de XML',

        value:
          summary.invoice_pending_xml,

        icon:
          'description',

        tooltip:
          'O.C. con factura, foto conciliada y todavía sin gasto/XML relacionado.',

        category:
          'invoice_pending_xml',
      },

      {
        key:
          'no_invoice_pending_expense',

        label:
          'Pendientes de gasto',

        value:
          summary.no_invoice_pending_expense,

        icon:
          'receipt_long',

        tooltip:
          'O.C. sin factura, con foto conciliada y todavía sin gasto registrado.',

        category:
          'no_invoice_pending_expense',
      },

      {
        key:
          'pending_payment',

        label:
          'Pendientes de pago',

        value:
          summary.pending_payment,

        icon:
          'payments',

        tooltip:
          'O.C. que ya tienen gasto relacionado pero todavía conservan saldo pendiente de pago.',

        category:
          'pending_payment',
      },

      {
        key:
          'payment_completed',

        label:
          'Pago completado',

        value:
          summary.payment_completed,

        icon:
          'task_alt',

        tooltip:
          'O.C. cuyo importe relacionado ya se encuentra completamente pagado.',

        /*
         * No pertenece al Detail porque
         * ya no representa un pendiente.
         */
        category:
          null,
      },
    ];
  }


  get operationalCrosscheckCards():
    PurchaseOrderReportSummaryCard[] {

    const summary =
      this.operationalSummary
        .operational_crosscheck;

    return [
      {
        key:
          'loose_pending_photos',

        label:
          'Fotos sueltas pendientes',

        value:
          summary.loose_pending_photos,

        icon:
          'photo_library',

        tooltip:
          'Fotos pendientes que todavía no están relacionadas con ninguna orden de compra.',

        category:
          'loose_pending_photos',
      },

      {
        key:
          'available_xml',

        label:
          'XML disponibles',

        value:
          summary.available_xml,

        icon:
          'folder_open',

        tooltip:
          'XML que conservan al menos una partida disponible para relacionar.',

        category:
          'available_xml',
      },

      {
        key:
          'available_xml_items',

        label:
          'Partidas XML disponibles',

        value:
          summary.available_xml_items,

        icon:
          'list_alt',

        tooltip:
          'Partidas individuales de XML que todavía no están relacionadas con una orden de compra.',

        category:
          'available_xml_items',
      },
    ];
  }


  // =========================================================
  // TABS
  // =========================================================

  setActiveTab(
    tab:
      PurchaseOrderReportsTab,
  ): void {

    if (
      this.activeTab() === tab
    ) {
      return;
    }

    this.activeTab.set(
      tab,
    );

    /*
     * El Detail se carga de forma lazy.
     *
     * No hacemos dos peticiones al abrir
     * inicialmente la página.
     */
    if (
      tab === 'pending_details' &&
      !this.detailsLoaded
    ) {
      this.loadPendingDetails();
    }
  }


  // =========================================================
  // CARGA - CORTE OPERATIVO
  // =========================================================

  loadOperationalSummary(): void {

    if (
      this.loadingOperationalSummary()
    ) {
      return;
    }

    this.loadingOperationalSummary.set(
      true,
    );

    this.purchaseOrdersService
      .getPurchaseOrderOperationalSummary()
      .pipe(
        finalize(
          () =>
            this.loadingOperationalSummary
              .set(false),
        ),
      )
      .subscribe({
        next: (
          response:
            entity.PurchaseOrderOperationalSummaryResponse,
        ) => {

          this.operationalSummary =
            response;

          this.recentPendingRows =
            (
              response.recent_pending ??
              []
            ).map(
              (row) => ({
                ...row,

                id:
                  row.purchase_order_id,

                category:
                  row.category,
              }),
            );
        },

        error: (
          error: unknown,
        ) => {
          console.error(
            'Error cargando corte operativo de órdenes de compra:',
            error,
          );
        },
      });
  }


  // =========================================================
  // CORTE -> DETAIL
  // =========================================================

  onOperationalCardClick(
    card:
      PurchaseOrderReportSummaryCard,
  ): void {

    if (!card.category) {
      return;
    }

    this.openDetailCategory(
      card.category,
    );
  }


  openDetailCategory(
    category:
      entity.PurchaseOrderReportDetailCategory,
  ): void {

    this.activeTab.set(
      'pending_details',
    );

    this.activeDetailCategory.set(
      category,
    );

    /*
     * Al venir desde una tarjeta del Corte
     * quitamos cualquier búsqueda anterior.
     */
    this.detailFilterForm.reset(
      {
        search: '',
      },
      {
        emitEvent: false,
      },
    );

    this.detailFilters = {
      category,

      search: '',

      page: 1,

      limit:
        this.detailFilters.limit ??
        20,
    };

    this.loadPendingDetails();
  }


  // =========================================================
  // DETAIL - CAMBIO DE CATEGORÍA
  // =========================================================

  setDetailCategory(
    category:
      entity.PurchaseOrderReportPendingCategory,
  ): void {

    if (
      this.activeDetailCategory() ===
      category &&
      this.detailsLoaded
    ) {
      return;
    }

    this.activeDetailCategory.set(
      category,
    );

    this.detailFilters = {
      ...this.detailFilters,

      category,

      page: 1,
    };

    this.loadPendingDetails();
  }


  // =========================================================
  // DETAIL - CARGA
  // =========================================================

  loadPendingDetails(): void {

    const requestSequence =
      ++this.detailRequestSequence;

    const category =
      this.activeDetailCategory();

    const filters:
      entity.PurchaseOrderPendingDetailFilters = {
      ...this.detailFilters,

      category,

      search:
        this.detailFilters
          .search
          ?.trim() ||
        '',
    };

    /*
     * ALL siempre usa preview.
     *
     * Page/limit realmente son ignorados
     * por backend en esa modalidad.
     */
    if (
      category === 'all'
    ) {
      filters.page = 1;
      filters.limit = 5;
    }

    this.loadingPendingDetails.set(
      true,
    );

    this.purchaseOrdersService
      .getPurchaseOrderPendingDetails(
        filters,
      )
      .pipe(
        finalize(
          () => {

            if (
              requestSequence ===
              this.detailRequestSequence
            ) {
              this.loadingPendingDetails
                .set(false);
            }
          },
        ),
      )
      .subscribe({
        next: (
          response,
        ) => {

          if (
            requestSequence !==
            this.detailRequestSequence
          ) {
            return;
          }

          this.detailsLoaded =
            true;

          if (
            response.category === 'all'
          ) {

            this.allPendingDetails =
              response;

            this.paginatedPendingDetails =
              null;

            this.detailRows =
              [];

            this.buildAllSectionRows(
              response,
            );

            return;
          }

          this.paginatedPendingDetails =
            response;

          this.detailRows =
            (
              response.data ??
              []
            ).map(
              (row) =>
                this.mapReportRow(
                  row,
                  response.category,
                ),
            );
        },

        error: (
          error: unknown,
        ) => {

          if (
            requestSequence !==
            this.detailRequestSequence
          ) {
            return;
          }

          console.error(
            'Error cargando detalle de pendientes de órdenes de compra:',
            error,
          );
        },
      });
  }


  // =========================================================
  // DETAIL - PREVIEWS DE ALL
  // =========================================================

  private buildAllSectionRows(
    response:
      entity.PurchaseOrderPendingDetailAllResponse,
  ): void {

    const map =
      new Map<
        entity.PurchaseOrderReportDetailCategory,
        entity.PurchaseOrderReportTableRow[]
      >();

    for (
      const section
      of response.sections ?? []
    ) {

      map.set(
        section.category,

        (
          section.data ??
          []
        ).map(
          (row) =>
            this.mapReportRow(
              row,
              section.category,
            ),
        ),
      );
    }

    this.allSectionRows =
      map;
  }


  getSectionRows(
    category:
      entity.PurchaseOrderReportDetailCategory,
  ):
    entity.PurchaseOrderReportTableRow[] {

    return (
      this.allSectionRows.get(
        category,
      ) ??
      []
    );
  }


  // =========================================================
  // DETAIL - MAPEO A DATATABLE
  // =========================================================

  private mapReportRow(
    row:
      entity.PurchaseOrderPendingReportRow,

    category:
      entity.PurchaseOrderReportDetailCategory,
  ):
    entity.PurchaseOrderReportTableRow {

    const purchaseOrderId =
      'purchase_order_id' in row
        ? Number(
            row.purchase_order_id,
          )
        : undefined;

    const photoId =
      'photo_id' in row
        ? Number(
            row.photo_id,
          )
        : undefined;

    const expenseId =
      'expense_id' in row
        ? Number(
            row.expense_id,
          )
        : undefined;

    const expenseItemId =
      'expense_item_id' in row
        ? Number(
            row.expense_item_id,
          )
        : undefined;

    const project =
      'project' in row
        ? row.project
        : null;

    const uploadedBy =
      'uploaded_by' in row
        ? row.uploaded_by
        : null;

    const expenses =
      'expenses' in row
        ? row.expenses
        : [];

    const destinationType =
      'destination_type' in row
        ? row.destination_type
        : undefined;

    const itemType =
      'item_type' in row
        ? row.item_type
        : undefined;

    return {
      ...row,

      id:
        purchaseOrderId ??
        photoId ??
        expenseItemId ??
        expenseId ??
        0,

      category,

      purchase_order_id:
        purchaseOrderId,

      photo_id:
        photoId,

      expense_id:
        expenseId,

      expense_item_id:
        expenseItemId,

      project_name:
        project?.name?.trim() ||
        'Sin proyecto',

      uploaded_by_name:
        uploadedBy?.name?.trim() ||
        'Sin usuario',

      expenses_display:
        expenses
          .map(
            (expense) =>
              expense.folio?.trim() ||
              `Gasto #${expense.id}`,
          )
          .join(', '),

      destination_type:
        destinationType,

      destination_type_label:
        destinationType ===
          'warehouse'
          ? 'Almacén'
          : destinationType ===
            'direct'
            ? 'Directo'
            : undefined,

      item_type:
        itemType,

      item_type_label:
        itemType ===
          'warehouse'
          ? 'Almacén'
          : itemType ===
            'direct'
            ? 'Directo'
            : undefined,

      supplier_name:
        'supplier_name' in row
          ? row.supplier_name?.trim() ||
            'Sin proveedor'
          : undefined,
    };
  }


  // =========================================================
  // DETAIL - FILTROS
  // =========================================================

  searchPendingDetails(): void {

    const value =
      this.detailFilterForm
        .getRawValue();

    this.detailFilters = {
      ...this.detailFilters,

      category:
        this.activeDetailCategory(),

      search:
        value.search?.trim() ||
        '',

      page: 1,
    };

    this.loadPendingDetails();
  }


  clearPendingDetailsFilters(): void {

    this.detailFilterForm.reset(
      {
        search: '',
      },
      {
        emitEvent: false,
      },
    );

    this.detailFilters = {
      ...this.detailFilters,

      category:
        this.activeDetailCategory(),

      search: '',

      page: 1,
    };

    this.loadPendingDetails();
  }


  get hasActiveDetailFilters():
    boolean {

    const value =
      this.detailFilterForm
        .getRawValue();

    return Boolean(
      value.search?.trim(),
    );
  }


  onDetailBtnsSectionAction(
    action: string,
  ): void {

    switch (action) {

      case 'search':
        this.searchPendingDetails();
        break;

      case 'clean':
        this.clearPendingDetailsFilters();
        break;

      default:
        break;
    }
  }


  // =========================================================
  // DETAIL - PAGINACIÓN
  // =========================================================

  onPendingDetailsPageChange(
    event:
      PageEvent,
  ): void {

    this.detailFilters = {
      ...this.detailFilters,

      page:
        event.pageIndex + 1,

      limit:
        event.pageSize,
    };

    this.loadPendingDetails();
  }


  // =========================================================
  // COLUMNAS DINÁMICAS
  // =========================================================

  getDetailColumns(
    category:
      entity.PurchaseOrderReportDetailCategory,
  ):
    ColumnsConfig[] {

    return (
      DETAIL_COLUMNS[
        category
      ] ??
      []
    );
  }


  getDetailDisplayedColumns(
    category:
      entity.PurchaseOrderReportDetailCategory,
  ):
    string[] {

    const columns =
      this.getDetailColumns(
        category,
      ).map(
        (column) =>
          column.key,
      );

    /*
     * Solo las categorías de O.C.
     * muestran acción "Ver O.C.".
     */
    if (
      PURCHASE_ORDER_DETAIL_CATEGORIES.has(
        category,
      )
    ) {
      return [
        ...columns,
        'actions',
      ];
    }

    return columns;
  }


  // =========================================================
  // LABEL DE CATEGORÍA
  // =========================================================

  getActiveDetailLabel(): string {

    if (
      this.activeDetailCategory() ===
      'all'
    ) {
      return 'Todos los pendientes';
    }

    return (
      this.paginatedPendingDetails
        ?.label ??
      'Detalle de pendientes'
    );
  }


  // =========================================================
  // ACCIONES - PENDIENTES RECIENTES
  // =========================================================

  onRecentPendingTableAction(
    event:
      DataTableActionEvent<
        entity.PurchaseOrderReportTableRow
      >,
  ): void {

    switch (event.type) {

      case 'viewPurchaseOrder':
        this.openPurchaseOrder(
          event.row
            .purchase_order_id,
        );
        break;

      default:
        break;
    }
  }


  // =========================================================
  // ACCIONES - DETAIL
  // =========================================================

  onDetailTableAction(
    event:
      DataTableActionEvent<
        entity.PurchaseOrderReportTableRow
      >,
  ): void {

    switch (event.type) {

      case 'viewPurchaseOrder':
        this.openPurchaseOrder(
          event.row
            .purchase_order_id,
        );
        break;

      default:
        break;
    }
  }


  // =========================================================
  // NAVEGACIÓN
  // =========================================================

  private openPurchaseOrder(
    purchaseOrderId:
      number | undefined,
  ): void {

    const id =
      Number(
        purchaseOrderId ?? 0,
      );

    if (
      id <= 0
    ) {
      return;
    }

    /*
     * El reporte y detalle/:id son rutas
     * hermanas dentro del módulo de O.C.
     */
    this.router.navigate(
      [
        '../detalle',
        id,
      ],
      {
        relativeTo:
          this.route,
      },
    );
  }
}