import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import {
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

// UI compartidos
import { BtnsSection } from '../../shared/ui/btns-section/btns-section';
import { DataTable } from '../../shared/ui/data-table/data-table';

import {
  ColumnsConfig,
  ColumnVariant,
  DataTableActionEvent,
  DataTableActionPopover,
  DataTableExtraAction,
  DataTableRowExpansionEvent,
} from '../../shared/ui/data-table/interfaces/table-interfaces';

import {
  DateRangeValue,
  InputDate,
} from '../../shared/ui/input-date/input-date';

import { InputField } from '../../shared/ui/input-field/input-field';
import { InputSelect } from '../../shared/ui/input-select/input-select';
import { LoadingOverlay } from '../../shared/ui/loading-overlay/loading-overlay';
import { ModuleHeader } from '../../shared/ui/module-header/module-header';

import {
  ModuleHeaderConfig,
} from '../../shared/ui/module-header/interfaces/module-header-interface';

// Servicios
import { AuthService } from '../../auth/services/auth.service';
import { PermissionsService } from '../../auth/services/permissions.service';
import { DialogService } from '../../shared/services/dialog.service';
import { LocalStorageService } from '../../shared/services/local-storage.service';
import { PurchaseOrdersService } from './services/purchase-orders.service';

// Modales
import { ModalAuthorizePurchaseOrder } from './components/modal-authorize-purchase-order/modal-authorize-purchase-order';
import { ModalPurchaseCancel } from './components/modal-purchase-cancel/modal-purchase-cancel';
import { ModalPurchaseDecline } from './components/modal-purchase-decline/modal-purchase-decline';
import { ModalPurchaseOrderAuthorized } from './components/modal-purchase-order-authorized/modal-purchase-order-authorized';
import { ModalPurchaseOrderRequester } from './components/modal-purchase-order-requester/modal-purchase-order-requester';
import { ModalSeePhoto } from './components/photo-without-cost/components/modal-see-photo/modal-see-photo';

// Interfaces
import { Catalog } from '../../shared/interfaces/general-interfaces';
import * as entity from './interfaces/purchase-orders.interfaces';


const PURCHASE_ORDERS_FILTERS_KEY =
  'mp_purchase_orders_filters_v1';


const TRACKING_STATUS_OPTIONS: Catalog[] = [
  {
    id: 'created',
    name: 'Pendiente de autorización',
  },
  {
    id: 'authorized',
    name: 'Pendiente de foto',
  },
  {
    id: 'ticket_reconciled',
    name: 'Foto conciliada',
  },
  {
    id: 'expense_registered',
    name: 'Gasto registrado',
  },
  {
    id: 'payment_completed',
    name: 'Pago completado',
  },
  {
    id: 'not_authorized',
    name: 'No autorizada',
  },
  {
    id: 'cancelled',
    name: 'Cancelada',
  },
];


const DESTINATION_TYPE_OPTIONS: Catalog[] = [
  {
    id: 'direct',
    name: 'Directo',
  },
  {
    id: 'warehouse',
    name: 'Almacén',
  },
];


const INVOICE_OPTIONS: Catalog[] = [
  {
    id: 'true',
    name: 'Con factura',
  },
  {
    id: 'false',
    name: 'Sin factura',
  },
];


const COLUMNS_CONFIG: ColumnsConfig[] = [
  {
    key: 'tracking_status_label',
    label: 'Seguimiento',
    type: 'chip',
    variantResolver: (
      row: entity.PurchaseOrderResponseDto,
    ) =>
      resolvePurchaseOrderTrackingVariant(
        row,
      ),
  },

  {
    key: 'printing_status_label',
    label: 'Impresión',
    type: 'chip',
    variantResolver: (
      row: entity.PurchaseOrderResponseDto,
    ) =>
      resolvePurchaseOrderPrintingVariant(
        row,
      ),
  },
  {
    key: 'folio',
    label: 'Folio',
  },
  {
    key: 'created_at_date',
    label: 'Fecha',
    type: 'date',
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
    key: 'destination_name',
    label: 'Destino',
    type: 'chip',
    typeVariant: 'chip-neutral',
  },
  {
    key: 'invoice_name',
    label: 'Factura',
    type: 'chip',
    typeVariant: 'chip-neutral',
  },
  {
    key: 'requested_amount',
    label: 'Monto solicitado',
    type: 'money',
    align: 'right',
  },
  {
    key: 'requested_by_display',
    label: 'Solicitante',
  },
  {
    key: 'authorized_by_name',
    label: 'Autorizó',
  },
  {
    key: 'authorized_at_date',
    label: 'Fecha autorización',
    type: 'date',
  },
];


function resolvePurchaseOrderTrackingVariant(
  row: entity.PurchaseOrderResponseDto,
): ColumnVariant {

  const variant = String(
    row.tracking_status_variant ?? 'neutral',
  );

  switch (variant) {

    case 'success':
      return 'chip-success';

    case 'warning':
      return 'chip-warning';

    case 'danger':
      return 'chip-danger';

    case 'info':
    case 'primary':
    case 'neutral':
    default:
      return 'chip-neutral';
  }
}

function resolvePurchaseOrderPrintingVariant(
  row: entity.PurchaseOrderResponseDto,
): ColumnVariant {
  switch (
  row.printing?.status
  ) {
    case 'printed':
      return 'chip-success';

    case 'failed':
      return 'chip-danger';

    case 'pending':
      return 'chip-warning';

    case 'dispatched':
      return 'chip-neutral';

    case 'cancelled':
      return 'chip-neutral';

    case 'not_generated':
    default:
      return 'chip-neutral';
  }
}


const DISPLAYED_COLUMNS: string[] = [
  ...COLUMNS_CONFIG.map(
    (column) => column.key,
  ),
  'actions',
];


const HEADER_CONFIG: ModuleHeaderConfig = {
  showNew: true,
};


type PurchaseOrderTableExtraAction =
  DataTableExtraAction<
    entity.PurchaseOrderResponseDto
  >;


@Component({
  selector: 'app-purchase-orders',

  standalone: true,

  imports: [
    CommonModule,

    ModuleHeader,
    DataTable,
    BtnsSection,
    InputDate,
    InputField,
    InputSelect,
    LoadingOverlay,

    MatPaginatorModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatTableModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,

    FormsModule,
    ReactiveFormsModule,
  ],

  templateUrl: './purchase-orders.html',
  styleUrl: './purchase-orders.scss',
})
export class PurchaseOrders
  implements OnInit {

  // =========================================================
  // INYECCIONES
  // =========================================================

  private readonly purchaseOrdersService =
    inject(PurchaseOrdersService);

  private readonly fb =
    inject(FormBuilder);

  private readonly storage =
    inject(LocalStorageService);

  private readonly router =
    inject(Router);

  private readonly dialogService =
    inject(DialogService);

  private readonly auth =
    inject(AuthService);

  private readonly permissionsService =
    inject(PermissionsService);


  // =========================================================
  // CONFIGURACIÓN
  // =========================================================

  readonly columnsConfig =
    COLUMNS_CONFIG;

  readonly displayedColumns =
    DISPLAYED_COLUMNS;

  readonly headerConfig =
    HEADER_CONFIG;

  readonly trackingStatusOptions =
    TRACKING_STATUS_OPTIONS;

  readonly destinationTypeOptions =
    DESTINATION_TYPE_OPTIONS;

  readonly invoiceOptions =
    INVOICE_OPTIONS;


  // =========================================================
  // LOADING
  // =========================================================

  readonly loadingTable =
    signal(false);


  readonly expandedOrderDetails = signal<
    Record<
      number,
      entity.PurchaseOrderFlowDetailResponse
    >
  >({});


  readonly expandedOrderLoading =
    signal<Set<number>>(
      new Set<number>(),
    );


  readonly expandedOrderErrors = signal<
    Record<number, string>
  >({});


  // =========================================================
  // FILTROS
  // =========================================================

  filters:
    entity.PurchaseOrderFilters = {

      page: 1,

      limit: 5,

      startDate: null,

      endDate: null,

      requested_amount: null,

      related_expense_amount: null,

      status: null,

      tracking_status: null,

      destination_type: null,

      will_have_invoice: null,

      project_id: null,
    };


  purchaseOrdersTableData!:
    entity.PurchaseOrdersPaginatedResponse;


  formFilters =
    this.fb.group({

      dateRange:
        this.fb.control<
          DateRangeValue | null
        >(
          null,
        ),

      requested_amount:
        this.fb.control<
          number | null
        >(
          null,
        ),

      related_expense_amount:
        this.fb.control<
          number | null
        >(
          null,
        ),

      tracking_status:
        this.fb.control<
          Catalog | string | null
        >(
          null,
        ),

      destination_type:
        this.fb.control<
          entity.PurchaseOrderDestinationType
          | ''
        >(
          '',
        ),

      will_have_invoice:
        this.fb.control<
          'true'
          | 'false'
          | ''
        >(
          '',
        ),
    });


  // =========================================================
  // ACCIONES DE TABLA
  // =========================================================

  readonly extraActions:
    PurchaseOrderTableExtraAction[] = [

      {
        type:
          'viewPurchaseOrderDetail',

        icon:
          'visibility',

        tooltip:
          () => 'Ver detalle',

        visible:
          () => true,

        disabled:
          () => false,
      },

      {
        type:
          'viewPurchaseOrderPhoto',

        icon:
          'image',

        tooltip:
          () => 'Ver foto',

        visible:
          (row) =>
            [
              'ticket_uploaded',
              'ticket_reconciled',
              'expense_registered',
              'payment_completed',
            ].includes(
              String(
                row.tracking_status ?? '',
              ),
            ),

        disabled:
          () => false,
      },

      {
        type:
          'reprintPurchaseOrder',

        icon:
          'print',

        tooltip:
          (row) =>
            row.printing?.last_error
              ? `Reimprimir ticket. Error: ${row.printing.last_error}`
              : 'Reimprimir ticket',

        visible:
          (row) =>
            row.printing?.can_reprint ===
            true,

        disabled:
          (row) =>
            row.printing?.can_reprint !==
            true,
      },

      {
        type:
          'editPurchaseOrder',

        icon:
          'edit',

        tooltip:
          (row) =>
            this.getEditTooltip(row),

        popoverContent:
          (row) =>
            this.getEditPopover(row),

        visible:
          () => true,

        disabled:
          (row) =>
            !this.canEdit(row),
      },

      {
        type:
          'authorizePurchaseOrder',

        icon:
          'verified',

        tooltip:
          (row) =>
            this.getAuthorizeTooltip(row),

        popoverContent:
          (row) =>
            this.getAuthorizePopover(row),

        visible:
          () => true,

        disabled:
          (row) =>
            !this.canAuthorize(row),
      },

      {
        type:
          'rejectPurchaseOrder',

        icon:
          'block',

        tooltip:
          (row) =>
            this.getRejectTooltip(row),

        popoverContent:
          (row) =>
            this.getRejectPopover(row),

        visible:
          () => true,

        disabled:
          (row) =>
            !this.canReject(row),
      },

      {
        type:
          'cancelPurchaseOrder',

        icon:
          'cancel',

        tooltip:
          (row) =>
            this.getCancelTooltip(row),

        popoverContent:
          (row) =>
            this.getCancelPopover(row),

        visible:
          () => true,

        disabled:
          (row) =>
            !this.canCancel(row),
      },
    ];


  // =========================================================
  // CICLO DE VIDA
  // =========================================================

  ngOnInit(): void {
    this.restoreFiltersFromStorage();
  }


  // =========================================================
  // PERMISOS
  // =========================================================

  get canManageRequesters():
    boolean {

    return this.hasRole(
      'ADMIN_GENERAL',
    );
  }


  // =========================================================
  // FILTROS ACTIVOS
  // =========================================================

  get hasActiveFilters():
    boolean {

    const form =
      this.formFilters
        .getRawValue();


    const hasDates =
      !!(
        form.dateRange?.startDate ||
        form.dateRange?.endDate
      );


    const hasRequestedAmount =
      form.requested_amount !== null;


    const hasTrackingStatus =
      !!this.getCatalogValue(
        form.tracking_status ?? null,
      );


    const hasRelatedExpenseAmount =
      form.related_expense_amount !== null;


    const hasDestinationType =
      !!form.destination_type;


    const hasInvoice =
      !!form.will_have_invoice;


    return (
      hasDates ||
      hasRequestedAmount ||
      hasRelatedExpenseAmount ||
      hasTrackingStatus ||
      hasDestinationType ||
      hasInvoice
    );
  }


  // =========================================================
  // MAPEO FILTROS UI -> BACKEND
  // =========================================================

  private buildBackendFiltersFromUi(
    ui:
      entity.PurchaseOrderUiFilters,
  ):
    entity.PurchaseOrderFilters {

    const trackingStatus =
      String(
        ui.tracking_status ?? '',
      ).trim();


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


      requested_amount:
        ui.requested_amount ??
        null,


      related_expense_amount:
        ui.related_expense_amount ??
        null,


      status:
        null,


      tracking_status:
        trackingStatus ||
        null,


      destination_type:
        ui.destination_type ||
        null,


      will_have_invoice:
        ui.will_have_invoice ===
          'true'
          ? true
          : ui.will_have_invoice ===
            'false'
            ? false
            : null,


      project_id:
        null,
    };
  }


  // =========================================================
  // MAPEO TABLA
  // =========================================================

  private mapPurchaseOrderRow(
    row:
      entity.PurchaseOrderResponseDto,
  ):
    entity.PurchaseOrderResponseDto {

    return {
      ...row,

      project_name:
        row.project?.name ??
        'Sin proyecto',

      requested_by_display:
        row.requested_by_employee?.name ??
        row.requested_by_name ??
        'Sin solicitante',

      destination_name:
        row.destination_type_label,

      invoice_name:
        row.will_have_invoice_label,

      tracking_status_label:
        row.tracking_status_label ??
        row.status_label ??
        'Sin seguimiento',

      printing_status_label:
        row.printing?.status_label ??
        'Sin ticket',

      created_at_date:
        row.created_at,

      authorized_at_date:
        row.authorized_at ??
        null,

      authorized_by_name:
        row.authorized_by_name,
    };
  }


  // =========================================================
  // EDICIÓN
  // =========================================================

  private canEdit(
    row:
      entity.PurchaseOrderResponseDto,
  ):
    boolean {

    if (!row?.id) {
      return false;
    }


    if (
      row.status ===
      'cancelled'
    ) {
      return false;
    }


    if (
      row.status ===
      'in_review' ||
      row.status ===
      'not_authorized'
    ) {
      return true;
    }


    if (
      row.status ===
      'authorized'
    ) {
      return this
        .canEditAuthorizedPurchaseOrder(
          row,
        );
    }


    return false;
  }


  private canEditAuthorizedPurchaseOrder(
    row:
      entity.PurchaseOrderResponseDto,
  ):
    boolean {

    if (
      !this.isAdminGeneral()
    ) {
      return false;
    }


    const trackingStatus =
      String(
        row.tracking_status ?? '',
      ).trim();


    const editableTrackingStatuses = [
      'authorized',
      'ticket_uploaded',
      'ticket_reconciled',
    ];


    return editableTrackingStatuses
      .includes(
        trackingStatus,
      );
  }


  private canAuthorize(
    row:
      entity.PurchaseOrderResponseDto,
  ):
    boolean {

    return (
      row.status ===
      'in_review' ||
      row.status ===
      'not_authorized'
    );
  }


  private canReject(
    row:
      entity.PurchaseOrderResponseDto,
  ):
    boolean {

    return (
      row.status ===
      'in_review'
    );
  }


  private canCancel(
    row:
      entity.PurchaseOrderResponseDto,
  ):
    boolean {

    return (
      row.status ===
      'in_review' ||
      row.status ===
      'not_authorized'
    );
  }


  // =========================================================
  // TOOLTIPS
  // =========================================================

  private getEditTooltip(
    row:
      entity.PurchaseOrderResponseDto,
  ):
    string {

    if (
      this.canEdit(row)
    ) {

      if (
        row.status ===
        'authorized'
      ) {
        return 'Editar O.C. autorizada sin gasto relacionado';
      }

      return 'Editar orden';
    }


    return this
      .getUnavailableEditReason(
        row,
      );
  }


  private getAuthorizeTooltip(
    row:
      entity.PurchaseOrderResponseDto,
  ):
    string {

    return this.canAuthorize(row)
      ? 'Autorizar orden'
      : '';
  }


  private getRejectTooltip(
    row:
      entity.PurchaseOrderResponseDto,
  ):
    string {

    return this.canReject(row)
      ? 'Marcar como no autorizada'
      : '';
  }


  private getCancelTooltip(
    row:
      entity.PurchaseOrderResponseDto,
  ):
    string {

    return this.canCancel(row)
      ? 'Cancelar orden'
      : '';
  }


  // =========================================================
  // POPOVERS
  // =========================================================

  private getEditPopover(
    row:
      entity.PurchaseOrderResponseDto,
  ):
    DataTableActionPopover | null {

    if (
      this.canEdit(row)
    ) {
      return null;
    }


    return {
      title:
        'No disponible',

      message:
        null,

      items: [
        this.getUnavailableEditReason(
          row,
        ),
      ],

      kind:
        'warning',
    };
  }


  private getAuthorizePopover(
    row:
      entity.PurchaseOrderResponseDto,
  ):
    DataTableActionPopover | null {

    if (
      this.canAuthorize(row)
    ) {
      return null;
    }


    return {
      title:
        'No disponible',

      message:
        null,

      items: [
        this.getUnavailableAuthorizeReason(
          row,
        ),
      ],

      kind:
        'warning',
    };
  }


  private getRejectPopover(
    row:
      entity.PurchaseOrderResponseDto,
  ):
    DataTableActionPopover | null {

    if (
      this.canReject(row)
    ) {
      return null;
    }


    return {
      title:
        'No disponible',

      message:
        null,

      items: [
        this.getUnavailableRejectReason(
          row,
        ),
      ],

      kind:
        'warning',
    };
  }


  private getCancelPopover(
    row:
      entity.PurchaseOrderResponseDto,
  ):
    DataTableActionPopover | null {

    if (
      this.canCancel(row)
    ) {
      return null;
    }


    return {
      title:
        'No disponible',

      message:
        null,

      items: [
        this.getUnavailableCancelReason(
          row,
        ),
      ],

      kind:
        'warning',
    };
  }


  // =========================================================
  // ADMIN
  // =========================================================

  private isAdminGeneral():
    boolean {

    return this.permissionsService
      .hasAnyRole([
        'ADMIN_GENERAL',
      ]);
  }


  // =========================================================
  // RAZONES DE ACCIONES NO DISPONIBLES
  // =========================================================

  private getUnavailableEditReason(
    row:
      entity.PurchaseOrderResponseDto,
  ):
    string {

    if (
      row.status ===
      'cancelled'
    ) {
      return 'Esta orden fue cancelada y ya no se puede editar.';
    }


    if (
      row.status ===
      'authorized'
    ) {

      if (
        !this.isAdminGeneral()
      ) {
        return 'Solo un administrador puede editar una O.C. autorizada.';
      }


      const trackingStatus =
        String(
          row.tracking_status ?? '',
        ).trim();


      switch (trackingStatus) {

        case 'expense_registered':
          return 'Esta O.C. ya tiene gasto registrado. Primero elimina o quita el gasto relacionado desde el detalle.';

        case 'payment_completed':
          return 'Esta O.C. ya tiene el pago completado y no se puede editar.';

        default:
          return 'Esta O.C. autorizada no se puede editar desde este flujo.';
      }
    }


    return 'Solo se puede editar una orden en revisión, no autorizada o autorizada sin gasto relacionado.';
  }


  private getUnavailableAuthorizeReason(
    row:
      entity.PurchaseOrderResponseDto,
  ):
    string {

    switch (row.status) {

      case 'authorized':
        return 'Esta orden ya fue autorizada.';

      case 'cancelled':
        return 'Esta orden fue cancelada y no puede autorizarse.';

      default:
        return 'Solo se pueden autorizar órdenes en revisión o no autorizadas.';
    }
  }


  private getUnavailableRejectReason(
    row:
      entity.PurchaseOrderResponseDto,
  ):
    string {

    switch (row.status) {

      case 'not_authorized':
        return 'Esta orden ya está marcada como no autorizada.';

      case 'authorized':
        return 'Esta orden ya fue autorizada y no puede marcarse como no autorizada.';

      case 'cancelled':
        return 'Esta orden fue cancelada y no puede marcarse como no autorizada.';

      default:
        return 'Solo se puede marcar como no autorizada una orden en revisión.';
    }
  }


  private getUnavailableCancelReason(
    row:
      entity.PurchaseOrderResponseDto,
  ):
    string {

    switch (row.status) {

      case 'authorized':
        return 'Esta orden ya fue autorizada y no se puede cancelar.';

      case 'cancelled':
        return 'Esta orden ya está cancelada.';

      default:
        return 'Solo se pueden cancelar órdenes en revisión o no autorizadas.';
    }
  }


  // =========================================================
  // BUSCAR
  // =========================================================

  searchWithFilters(): void {

    const value =
      this.formFilters
        .getRawValue();


    const uiState:
      entity.PurchaseOrderUiFilters = {

      dateRange:
        value.dateRange ??
        null,


      requested_amount:
        value.requested_amount ??
        null,


      related_expense_amount:
        value.related_expense_amount ??
        null,


      tracking_status:
        (
          this.getCatalogValue(
            value.tracking_status ??
            null,
          ) as string
        ) || '',


      destination_type:
        value.destination_type ||
        '',


      will_have_invoice:
        value.will_have_invoice ||
        '',


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


    this.loadPurchaseOrders();
  }


  // =========================================================
  // LIMPIAR FILTROS
  // =========================================================

  clearAllAndSearch(): void {

    this.formFilters.reset(
      {

        dateRange:
          null,

        requested_amount:
          null,

        tracking_status:
          null,

        destination_type:
          '',

        will_have_invoice:
          '',

        related_expense_amount:
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

      requested_amount:
        null,

      status:
        null,

      tracking_status:
        null,

      destination_type:
        null,

      will_have_invoice:
        null,

      project_id:
        null,

      related_expense_amount:
        null,
    };


    this.storage.removeItem(
      PURCHASE_ORDERS_FILTERS_KEY,
    );


    this.loadPurchaseOrders();
  }


  // =========================================================
  // CARGAR ÓRDENES
  // =========================================================

  loadPurchaseOrders(): void {

    if (
      this.loadingTable()
    ) {
      return;
    }


    this.loadingTable.set(
      true,
    );


    this.purchaseOrdersService
      .getPurchaseOrders(
        this.filters,
      )
      .pipe(
        finalize(
          () =>
            this.loadingTable
              .set(false),
        ),
      )
      .subscribe({

        next: (
          response,
        ) => {

          const data =
            response.data.map(
              (row) =>
                this.mapPurchaseOrderRow(
                  row,
                ),
            );


          this.purchaseOrdersTableData = {
            data,

            pagination:
              response.pagination,
          };
        },


        error: (
          error,
        ) => {

          console.error(
            'Error al cargar órdenes de compra:',
            error,
          );
        },
      });
  }


  // =========================================================
  // PAGINACIÓN
  // =========================================================

  onPageChange(
    event:
      PageEvent,
  ): void {

    this.filters = {
      ...this.filters,

      page:
        event.pageIndex + 1,

      limit:
        event.pageSize,
    };


    this.saveFiltersToStorage();

    this.loadPurchaseOrders();
  }


  // =========================================================
  // HEADER
  // =========================================================

  onHeaderAction(
    action:
      string,
  ): void {

    switch (action) {

      case 'new':

        this.router.navigate([
          '/ordenes-compra/nueva',
        ]);

        break;


      default:
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
  // ACCIONES TABLA
  // =========================================================

  onTableAction(
    event:
      DataTableActionEvent<
        entity.PurchaseOrderResponseDto
      >,
  ): void {

    switch (event.type) {

      case 'viewPurchaseOrderDetail':

        this.viewPurchaseOrderDetail(
          event.row,
        );

        break;

      case 'viewPurchaseOrderPhoto':

        this.viewPurchaseOrderPhoto(
          event.row,
        );

        break;

      case 'reprintPurchaseOrder':

        this.reprintPurchaseOrder(
          event.row,
        );

        break;


      case 'editPurchaseOrder':

        this.editPurchaseOrder(
          event.row,
        );

        break;


      case 'authorizePurchaseOrder':

        this.openAuthorizePurchaseOrderModal(
          event.row,
        );

        break;


      case 'rejectPurchaseOrder':

        this.rejectPurchaseOrder(
          event.row,
        );

        break;


      case 'cancelPurchaseOrder':

        this.cancelPurchaseOrder(
          event.row,
        );

        break;


      default:
        break;
    }
  }


  private viewPurchaseOrderPhoto(
    row:
      entity.PurchaseOrderResponseDto,
  ): void {

    if (!row?.id) {
      return;
    }


    /*
     * Si ya expandimos la fila,
     * reutilizamos el detail cargado.
     */
    const cachedDetail =
      this.getExpandedOrderDetail(
        row.id,
      );


    if (cachedDetail) {

      const photo =
        (
          cachedDetail.ticket_photos ??
          []
        ).find(
          (item) =>
            !!item?.id &&
            item.status !== 'discarded',
        );


      if (photo) {
        this.openExpandedPhoto(
          photo,
          row,
        );
      }

      return;
    }


    /*
     * Si todavía no tenemos el detail,
     * cargamos solamente la información
     * necesaria de la O.C.
     */
    this.purchaseOrdersService
      .getFlowDetail(
        row.id,
      )
      .subscribe({

        next: (
          response,
        ) => {

          const detail =
            (
              response?.data ??
              response
            ) as
            entity.PurchaseOrderFlowDetailResponse;


          const photo =
            (
              detail.ticket_photos ??
              []
            ).find(
              (item) =>
                !!item?.id &&
                item.status !== 'discarded',
            );


          if (!photo) {
            return;
          }


          /*
           * Reutilizamos el método que
           * YA EXISTE en este componente.
           */
          this.openExpandedPhoto(
            photo,
            row,
          );
        },


        error: (
          error,
        ) => {

          console.error(
            'Error cargando foto de la O.C.:',
            error,
          );
        },
      });
  }


  private reprintPurchaseOrder(
    row:
      entity.PurchaseOrderResponseDto,
  ): void {
    if (
      !row?.id ||
      row.printing?.can_reprint !==
      true
    ) {
      return;
    }

    this.loadingTable.set(
      true,
    );

    this.purchaseOrdersService
      .reprintPurchaseOrder(
        row.id,
      )
      .subscribe({
        next: () => {
          this.loadingTable.set(
            false,
          );

          this.loadPurchaseOrders();
        },

        error: (error) => {
          this.loadingTable.set(
            false,
          );

          console.error(
            'Error al reimprimir ticket de O.C.:',
            error,
          );

          this.loadPurchaseOrders();
        },
      });
  }

  // =========================================================
  // VER DETALLE
  // =========================================================

  private viewPurchaseOrderDetail(
    row:
      entity.PurchaseOrderResponseDto,
  ): void {

    if (!row?.id) {
      return;
    }


    this.router.navigateByUrl(
      `/ordenes-compra/detalle/${row.id}`,
    );
  }


  // =========================================================
  // EDITAR
  // =========================================================

  private editPurchaseOrder(
    row:
      entity.PurchaseOrderResponseDto,
  ): void {

    if (
      !row?.id ||
      !this.canEdit(row)
    ) {
      return;
    }


    this.router.navigateByUrl(
      `/ordenes-compra/editar/${row.id}`,
    );
  }


  // =========================================================
  // AUTORIZAR
  // =========================================================

  private openAuthorizePurchaseOrderModal(
    row:
      entity.PurchaseOrderResponseDto,
  ): void {

    if (
      !row?.id ||
      !this.canAuthorize(row)
    ) {
      return;
    }


    this.dialogService
      .open(
        ModalAuthorizePurchaseOrder,
        row,
        'small',
      )
      .afterClosed()
      .subscribe(
        (result) => {

          if (result) {
            this.loadPurchaseOrders();
          }
        },
      );
  }


  // =========================================================
  // NO AUTORIZAR
  // =========================================================

  private rejectPurchaseOrder(
    row:
      entity.PurchaseOrderResponseDto,
  ): void {

    if (
      !row?.id ||
      !this.canReject(row)
    ) {
      return;
    }


    this.dialogService
      .open(
        ModalPurchaseDecline,
        row,
        'small',
      )
      .afterClosed()
      .subscribe(
        (result) => {

          if (result) {
            this.loadPurchaseOrders();
          }
        },
      );
  }


  // =========================================================
  // CANCELAR
  // =========================================================

  private cancelPurchaseOrder(
    row:
      entity.PurchaseOrderResponseDto,
  ): void {

    if (
      !row?.id ||
      !this.canCancel(row)
    ) {
      return;
    }


    this.dialogService
      .open(
        ModalPurchaseCancel,
        row,
        'small',
      )
      .afterClosed()
      .subscribe(
        (result) => {

          if (result) {
            this.loadPurchaseOrders();
          }
        },
      );
  }


  // =========================================================
  // SOLICITANTES
  // =========================================================

  openRequestersModal(): void {

    if (
      !this.canManageRequesters
    ) {
      return;
    }


    this.dialogService
      .open(
        ModalPurchaseOrderRequester,
        null,
        'small',
      )
      .afterClosed()
      .subscribe(
        (result) => {

          if (result) {
            this.loadPurchaseOrders();
          }
        },
      );
  }


  // =========================================================
  // AUTORIZADORES
  // =========================================================

  openAuthorizersModal(): void {

    if (
      !this.canManageRequesters
    ) {
      return;
    }


    this.dialogService
      .open(
        ModalPurchaseOrderAuthorized,
        null,
        'small',
      )
      .afterClosed()
      .subscribe(
        (result) => {

          if (result) {
            this.loadPurchaseOrders();
          }
        },
      );
  }


  // =========================================================
  // RESTAURAR FILTROS
  // =========================================================

  private restoreFiltersFromStorage():
    void {

    const saved =
      this.storage.getItem<
        entity.PurchaseOrderUiFilters
      >(
        PURCHASE_ORDERS_FILTERS_KEY,
      );


    if (!saved) {

      this.loadPurchaseOrders();

      return;
    }


    this.formFilters.patchValue(
      {

        dateRange:
          saved.dateRange ??
          null,


        requested_amount:
          saved.requested_amount ??
          null,


        related_expense_amount:
          saved.related_expense_amount ??
          null,


        tracking_status:
          saved.tracking_status ??
          null,


        destination_type:
          saved.destination_type ??
          '',


        will_have_invoice:
          saved.will_have_invoice ??
          '',
      },
      {
        emitEvent:
          false,
      },
    );


    this.filters =
      this.buildBackendFiltersFromUi({
        ...saved,


        dateRange:
          saved.dateRange ??
          null,


        requested_amount:
          saved.requested_amount ??
          null,


        related_expense_amount:
          saved.related_expense_amount ??
          null,


        tracking_status:
          saved.tracking_status ??
          '',


        page:
          saved.page ??
          1,


        limit:
          saved.limit ??
          this.filters.limit,
      });


    this.loadPurchaseOrders();
  }


  // =========================================================
  // GUARDAR FILTROS
  // =========================================================

  private saveFiltersToStorage(
    state?:
      entity.PurchaseOrderUiFilters,
  ): void {

    if (!state) {

      const value =
        this.formFilters
          .getRawValue();


      state = {

        dateRange:
          value.dateRange ??
          null,


        related_expense_amount:
          value.related_expense_amount ??
          null,


        requested_amount:
          value.requested_amount ??
          null,


        tracking_status:
          (
            this.getCatalogValue(
              value.tracking_status ??
              null,
            ) as string
          ) || '',


        destination_type:
          value.destination_type ||
          '',


        will_have_invoice:
          value.will_have_invoice ||
          '',


        page:
          this.filters.page,


        limit:
          this.filters.limit,
      };
    }


    this.storage.setItem(
      PURCHASE_ORDERS_FILTERS_KEY,
      state,
    );
  }


  // =========================================================
  // CATÁLOGO
  // =========================================================

  private getCatalogValue(
    value:
      | Catalog
      | number
      | string
      | null,
  ):
    string
    | number
    | null {

    if (
      value === null ||
      value === undefined ||
      value === ''
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


  // =========================================================
  // ROLES
  // =========================================================

  private hasRole(
    roleCode:
      string,
  ):
    boolean {

    const expectedRole =
      String(
        roleCode || '',
      )
        .trim()
        .toUpperCase();


    const roles =
      this.auth.currentUser()
        ?.roles ??
      [];


    return roles.some(
      (role: any) => {

        if (!role) {
          return false;
        }


        if (
          typeof role ===
          'string'
        ) {

          return (
            role
              .trim()
              .toUpperCase() ===
            expectedRole
          );
        }


        const value =
          role.code ??
          role.name ??
          role.role ??
          role.roleCode ??
          role.role_code ??
          null;


        return (
          String(
            value || '',
          )
            .trim()
            .toUpperCase() ===
          expectedRole
        );
      },
    );
  }


  // =========================================================
  // EXPANSIÓN
  // =========================================================

  onPurchaseOrderExpansionChange(
    event:
      DataTableRowExpansionEvent<
        entity.PurchaseOrderResponseDto
      >,
  ): void {

    if (
      !event.expanded ||
      !event.row?.id
    ) {
      return;
    }


    this.loadExpandedOrderDetail(
      event.row,
    );
  }


  loadExpandedOrderDetail(
    row:
      entity.PurchaseOrderResponseDto,

    forceReload =
      false,
  ): void {

    const orderId =
      Number(
        row?.id,
      );


    if (!orderId) {
      return;
    }


    if (
      this.expandedOrderLoading()
        .has(orderId)
    ) {
      return;
    }


    if (
      !forceReload &&
      this.expandedOrderDetails()[
      orderId
      ]
    ) {
      return;
    }


    this.setExpandedOrderLoading(
      orderId,
      true,
    );


    this.clearExpandedOrderError(
      orderId,
    );


    this.purchaseOrdersService
      .getFlowDetail(
        orderId,
      )
      .pipe(
        finalize(
          () => {

            this.setExpandedOrderLoading(
              orderId,
              false,
            );
          },
        ),
      )
      .subscribe({

        next: (
          response,
        ) => {

          const detail =
            (
              response?.data ??
              response
            ) as
            entity.PurchaseOrderFlowDetailResponse;


          if (!detail?.id) {

            this.setExpandedOrderError(
              orderId,
              'No se encontró la información de esta orden.',
            );

            return;
          }


          this.expandedOrderDetails.update(
            (current) => ({
              ...current,

              [orderId]:
                detail,
            }),
          );
        },


        error: (
          error,
        ) => {

          console.error(
            'Error al cargar el detalle expandido de la O.C.:',
            error,
          );


          this.setExpandedOrderError(
            orderId,
            'No se pudo cargar la información relacionada.',
          );
        },
      });
  }


  getExpandedOrderDetail(
    orderId:
      number,
  ):
    entity.PurchaseOrderFlowDetailResponse
    | null {

    return (
      this.expandedOrderDetails()[
      orderId
      ] ??
      null
    );
  }


  isExpandedOrderLoading(
    orderId:
      number,
  ):
    boolean {

    return this
      .expandedOrderLoading()
      .has(orderId);
  }


  getExpandedOrderError(
    orderId:
      number,
  ):
    string | null {

    return (
      this.expandedOrderErrors()[
      orderId
      ] ??
      null
    );
  }


  getExpandedPhotos(
    detail:
      entity.PurchaseOrderFlowDetailResponse,
  ):
    entity.PurchaseOrderTicketPhotoDto[] {

    return (
      detail.ticket_photos ??
      []
    );
  }


  getExpandedExpenses(
    detail:
      entity.PurchaseOrderFlowDetailResponse,
  ):
    entity.PurchaseOrderExpenseLinkDto[] {

    return (
      detail.expense_links ??
      []
    );
  }


  getExpandedPhotoFileName(
    photo:
      entity.PurchaseOrderTicketPhotoDto,
  ):
    string {

    return (
      photo.file_name ??
      photo.fileName ??
      photo.filename ??
      'Foto del ticket'
    );
  }


  getExpandedPhotoStatusLabel(
    photo:
      entity.PurchaseOrderTicketPhotoDto,
  ):
    string {

    switch (photo.status) {

      case 'reconciled':
        return 'Foto conciliada';

      case 'discarded':
        return 'Descartada';

      case 'pending':
      default:
        return 'Pendiente';
    }
  }


  getExpandedExpenseId(
    link:
      entity.PurchaseOrderExpenseLinkDto,
  ):
    number | null {

    const expenseId =
      Number(
        link.expense?.id ??
        link.expense_id ??
        0,
      );


    return expenseId > 0
      ? expenseId
      : null;
  }


  getExpandedExpenseFolio(
    link:
      entity.PurchaseOrderExpenseLinkDto,
  ):
    string {

    return (
      link.expense?.internal_folio ??
      link.expense?.folio ??
      `Gasto #${this.getExpandedExpenseId(
        link,
      ) ??
      '—'
      }`
    );
  }


  // =========================================================
  // FOTO EXPANDIDA
  // =========================================================

  openExpandedPhoto(
    photo:
      entity.PurchaseOrderTicketPhotoDto,

    order:
      entity.PurchaseOrderResponseDto,
  ): void {

    if (!photo?.id) {
      return;
    }


    const createdAt =
      photo.uploaded_at ??
      photo.created_at ??
      photo.createdAt ??
      order.created_at;


    const publicUrl =
      photo.preview_url ??
      photo.previewUrl ??
      photo.public_url ??
      photo.publicUrl ??
      photo.url ??
      null;


    const modalData:
      entity.PendingTicketPhotoRow = {

      id:
        photo.id,


      project_id:
        photo.project?.id ??
        order.project?.id ??
        null,


      project_name:
        photo.project?.name ??
        order.project?.name ??
        'Sin proyecto',


      file_name:
        this.getExpandedPhotoFileName(
          photo,
        ),


      uploaded_by_name:
        photo.uploaded_by_user?.name ??
        photo.uploadedByUser?.name ??
        photo.user?.name ??
        'Sin dato',


      status:
        photo.status ??
        'pending',


      status_label:
        this.getExpandedPhotoStatusLabel(
          photo,
        ),


      created_at:
        createdAt,


      created_at_date:
        createdAt,


      preview_url:
        publicUrl,


      public_url:
        publicUrl,
    };


    this.dialogService.open(
      ModalSeePhoto,
      modalData,
      'medium',
    );
  }


  // =========================================================
  // GASTO EXPANDIDO
  // =========================================================

  openExpandedExpense(
    link:
      entity.PurchaseOrderExpenseLinkDto,
  ): void {

    const expenseId =
      this.getExpandedExpenseId(
        link,
      );


    if (!expenseId) {
      return;
    }


    this.router.navigate(
      [
        '/gastos/editar',
        expenseId,
      ],
      {
        queryParams: {
          returnUrl:
            this.router.url,
        },
      },
    );
  }


  // =========================================================
  // ESTADO EXPANSIÓN
  // =========================================================

  private setExpandedOrderLoading(
    orderId:
      number,

    loading:
      boolean,
  ): void {

    this.expandedOrderLoading.update(
      (current) => {

        const next =
          new Set(
            current,
          );


        if (loading) {

          next.add(
            orderId,
          );

        } else {

          next.delete(
            orderId,
          );
        }


        return next;
      },
    );
  }


  private setExpandedOrderError(
    orderId:
      number,

    message:
      string,
  ): void {

    this.expandedOrderErrors.update(
      (current) => ({
        ...current,

        [orderId]:
          message,
      }),
    );
  }


  private clearExpandedOrderError(
    orderId:
      number,
  ): void {

    this.expandedOrderErrors.update(
      (current) => {

        const next = {
          ...current,
        };


        delete next[
          orderId
        ];


        return next;
      },
    );
  }


  // =========================================================
  // DATOS EXPANDIDOS DE GASTO
  // =========================================================

  getExpandedExpenseSupplierName(
    link:
      entity.PurchaseOrderExpenseLinkDto,
  ):
    string {

    const supplier =
      link.expense?.supplier;


    return (
      supplier?.company_name
        ?.trim() ||
      supplier?.name
        ?.trim() ||
      'Proveedor no registrado'
    );
  }


  getExpandedExpenseUuid(
    link:
      entity.PurchaseOrderExpenseLinkDto,
  ):
    string | null {

    const uuid =
      link.expense
        ?.cfdi_uuid
        ?.trim();


    return (
      uuid ||
      null
    );
  }


  getExpandedExpenseUuidDisplay(
    link:
      entity.PurchaseOrderExpenseLinkDto,
  ):
    string {

    const uuid =
      this.getExpandedExpenseUuid(
        link,
      );


    if (!uuid) {

      return this
        .isExpandedXmlExpense(
          link,
        )
        ? 'UUID no disponible'
        : 'Sin XML';
    }


    if (
      uuid.length <= 20
    ) {
      return uuid;
    }


    return `${uuid.slice(
      0,
      8,
    )
      }…${uuid.slice(
        -4,
      )
      }`;
  }


  getExpandedExpenseTypeLabel(
    link:
      entity.PurchaseOrderExpenseLinkDto,
  ):
    string {

    return this
      .isExpandedXmlExpense(
        link,
      )
      ? 'XML'
      : 'Gasto sin XML';
  }


  getExpandedExpenseLinkedItems(
    link:
      entity.PurchaseOrderExpenseLinkDto,
  ):
    entity.PurchaseOrderExpenseLinkedItemDto[] {

    return (
      link.linked_items ??
      []
    );
  }


  getExpandedExpenseItemConcept(
    item:
      entity.PurchaseOrderExpenseLinkedItemDto,
  ):
    string {

    return (
      item.product?.name
        ?.trim() ||
      item.concept
        ?.trim() ||
      `Partida #${item.expense_item_id ||
      item.id
      }`
    );
  }


  getExpandedExpenseItemQuantity(
    item:
      entity.PurchaseOrderExpenseLinkedItemDto,
  ):
    number | string {

    const quantity =
      item.quantity;


    return (
      quantity === null ||
      quantity === undefined ||
      quantity === ''
    )
      ? '—'
      : quantity;
  }


  getExpandedExpenseItemUnit(
    item:
      entity.PurchaseOrderExpenseLinkedItemDto,
  ):
    string {

    return (
      item.unit_name
        ?.trim() ||
      item.unit
        ?.trim() ||
      'Sin unidad'
    );
  }


  getExpandedExpenseItemAmount(
    item:
      entity.PurchaseOrderExpenseLinkedItemDto,
  ):
    number {

    return (
      this.toNullableExpandedAmount(
        item.amount_snapshot,
      ) ??
      this.toNullableExpandedAmount(
        item.amount,
      ) ??
      0
    );
  }


  getExpandedExpenseLinkedTotal(
    link:
      entity.PurchaseOrderExpenseLinkDto,
  ):
    number {

    const snapshot =
      this.toNullableExpandedAmount(
        link.amount_snapshot,
      );


    if (
      snapshot !== null
    ) {
      return snapshot;
    }


    return this
      .getExpandedExpenseLinkedItems(
        link,
      )
      .reduce(
        (
          total,
          item,
        ) =>
          total +
          this.getExpandedExpenseItemAmount(
            item,
          ),
        0,
      );
  }


  getExpandedExpensePhoto(
    link:
      entity.PurchaseOrderExpenseLinkDto,
  ):
    entity.PurchaseOrderTicketPhotoDto
    | null {

    return (
      link.ticket_photo ??
      link.ticketPhoto ??
      null
    );
  }


  private isExpandedXmlExpense(
    link:
      entity.PurchaseOrderExpenseLinkDto,
  ):
    boolean {

    return (
      link.registration_type ===
      'xml' ||
      !!this.getExpandedExpenseUuid(
        link,
      )
    );
  }


  private toNullableExpandedAmount(
    value:
      | number
      | string
      | null
      | undefined,
  ):
    number | null {

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }


    const amount =
      Number(
        value,
      );


    return Number.isFinite(
      amount,
    )
      ? amount
      : null;
  }


  getExpandedExpensesForDisplay(
    detail:
      entity.PurchaseOrderFlowDetailResponse,
  ):
    entity.PurchaseOrderExpenseLinkDto[] {

    const expenses = [
      ...this.getExpandedExpenses(
        detail,
      ),
    ];


    if (
      this.getActiveRelatedExpenseAmount() ===
      null
    ) {
      return expenses;
    }


    return expenses.sort(
      (
        left,
        right,
      ) =>
        Number(
          this.isExpandedExpenseAmountMatch(
            right,
          ),
        ) -
        Number(
          this.isExpandedExpenseAmountMatch(
            left,
          ),
        ),
    );
  }


  getExpandedExpenseTotal(
    link:
      entity.PurchaseOrderExpenseLinkDto,
  ):
    number {

    return (
      this.toNullableExpandedAmount(
        link.expense?.total_amount,
      ) ??
      this.getExpandedExpenseLinkedTotal(
        link,
      )
    );
  }


  isExpandedExpenseAmountMatch(
    link:
      entity.PurchaseOrderExpenseLinkDto,
  ):
    boolean {

    const filterAmount =
      this.getActiveRelatedExpenseAmount();


    if (
      filterAmount === null
    ) {
      return false;
    }


    const expenseTotal =
      this.toNullableExpandedAmount(
        link.expense?.total_amount,
      );


    if (
      expenseTotal === null
    ) {
      return false;
    }


    return (
      Math.round(
        expenseTotal * 100,
      ) ===
      Math.round(
        filterAmount * 100,
      )
    );
  }


  private getActiveRelatedExpenseAmount():
    number | null {

    return this
      .toNullableExpandedAmount(
        this.filters
          .related_expense_amount,
      );
  }
}