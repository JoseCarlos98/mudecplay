import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

// Angular Material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';

// UI compartidos
import { ModuleHeader } from '../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../shared/ui/module-header/interfaces/module-header-interface';
import { DataTable } from '../../shared/ui/data-table/data-table';
import {
  ColumnsConfig,
  ColumnVariant,
  DataTableActionEvent,
  DataTableExtraAction,
} from '../../shared/ui/data-table/interfaces/table-interfaces';
import { InputField } from '../../shared/ui/input-field/input-field';
import { BtnsSection } from '../../shared/ui/btns-section/btns-section';
import { InputSelect } from '../../shared/ui/input-select/input-select';
import { LoadingOverlay } from '../../shared/ui/loading-overlay/loading-overlay';

// Servicios
import { LocalStorageService } from '../../shared/services/local-storage.service';
import { PurchaseOrdersService } from './services/purchase-orders.service';

// Interfaces
import { Catalog } from '../../shared/interfaces/general-interfaces';
import * as entity from './interfaces/purchase-orders.interfaces';
import { DialogService } from '../../shared/services/dialog.service';
import { ModalPurchaseOrderRequester } from './components/modal-purchase-order-requester/modal-purchase-order-requester';
import { AuthService } from '../../auth/services/auth.service';

// ==========================
//  CONSTANTES DEL MÓDULO
// ==========================

const PURCHASE_ORDERS_FILTERS_KEY = 'mp_purchase_orders_filters_v1';

const STATUS_OPTIONS: Catalog[] = [
  { id: 'in_review', name: 'En revisión' },
  { id: 'authorized', name: 'Autorizada' },
  { id: 'not_authorized', name: 'No autorizada' },
  { id: 'cancelled', name: 'Cancelada' },
];

const DESTINATION_TYPE_OPTIONS: Catalog[] = [
  { id: 'direct', name: 'Directo' },
  { id: 'warehouse', name: 'Almacén' },
];

const INVOICE_OPTIONS: Catalog[] = [
  { id: 'true', name: 'Con factura' },
  { id: 'false', name: 'Sin factura' },
];

const COLUMNS_CONFIG: ColumnsConfig[] = [
  {
    key: 'status_name',
    label: 'Estatus O.C.',
    type: 'chip',
    variantResolver: (row: entity.PurchaseOrderResponseDto) =>
      resolvePurchaseOrderStatusVariant(row),
  },
  { key: 'folio', label: 'Folio' },
  { key: 'created_at_date', label: 'Fecha', type: 'date' },
  { key: 'project_name', label: 'Proyecto' },
  { key: 'concept', label: 'Concepto' },
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
  { key: 'requested_by_display', label: 'Solicitante' },
  { key: 'authorized_by_name', label: 'Autorizó' },
  { key: 'authorized_at_date', label: 'Fecha autorización', type: 'date' },
];

function resolvePurchaseOrderStatusVariant(
  row: entity.PurchaseOrderResponseDto,
): ColumnVariant {
  switch (row.status) {
    case 'authorized':
      return 'chip-success';

    case 'in_review':
      return 'chip-warning';

    case 'not_authorized':
      return 'chip-warning';

    case 'cancelled':
      return 'chip-danger';

    default:
      return 'chip-neutral';
  }
}

const DISPLAYED_COLUMNS: string[] = [
  ...COLUMNS_CONFIG.map((column) => column.key),
  'actions',
];

const HEADER_CONFIG: ModuleHeaderConfig = {
  showNew: true,
};

type PurchaseOrderTableExtraAction =
  DataTableExtraAction<entity.PurchaseOrderResponseDto>;

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [
    CommonModule,

    // UI
    ModuleHeader,
    DataTable,
    BtnsSection,
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
    MatIconModule,
    // Forms
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './purchase-orders.html',
  styleUrl: './purchase-orders.scss',
})
export class PurchaseOrders implements OnInit {
  // ==========================
  //  INYECCIONES
  // ==========================
  private readonly purchaseOrdersService = inject(PurchaseOrdersService);
  private readonly fb = inject(FormBuilder);
  private readonly storage = inject(LocalStorageService);
  private readonly router = inject(Router);
  private readonly dialogService = inject(DialogService);
  private readonly auth = inject(AuthService);

  // ==========================
  //  CONFIG UI
  // ==========================
  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;
  readonly headerConfig = HEADER_CONFIG;

  readonly statusOptions = STATUS_OPTIONS;
  readonly destinationTypeOptions = DESTINATION_TYPE_OPTIONS;
  readonly invoiceOptions = INVOICE_OPTIONS;

  readonly loadingTable = signal(false);

  // ==========================
  //  ESTADO / DATA
  // ==========================
  filters: entity.PurchaseOrderFilters = {
    page: 1,
    limit: 5,
    search: '',
    status: null,
    destination_type: null,
    will_have_invoice: null,
    project_id: null,
  };

  purchaseOrdersTableData!: entity.PurchaseOrdersPaginatedResponse;

  formFilters = this.fb.group({
    search: this.fb.control<string>(''),
    status: this.fb.control<entity.PurchaseOrderStatus | ''>(''),
    destination_type:
      this.fb.control<entity.PurchaseOrderDestinationType | ''>(''),
    will_have_invoice: this.fb.control<'true' | 'false' | ''>(''),
  });

  readonly extraActions: PurchaseOrderTableExtraAction[] = [
    {
      type: 'viewDetail',
      icon: 'visibility',
      tooltip: () => 'Ver detalle',
      visible: () => true,
      disabled: () => false,
    },
    {
      type: 'editPurchaseOrder',
      icon: 'edit',
      tooltip: (row) =>
        this.canEdit(row)
          ? 'Editar orden'
          : 'Solo se puede editar antes de autorizar',
      visible: () => true,
      disabled: (row) => !this.canEdit(row),
    },
    {
      type: 'authorizePurchaseOrder',
      icon: 'verified',
      tooltip: (row) =>
        this.canAuthorize(row)
          ? 'Autorizar orden'
          : 'Solo se pueden autorizar órdenes en revisión',
      visible: () => true,
      disabled: (row) => !this.canAuthorize(row),
    },
    {
      type: 'rejectPurchaseOrder',
      icon: 'block',
      tooltip: (row) =>
        this.canReject(row)
          ? 'Marcar como no autorizada'
          : 'No se puede rechazar esta orden',
      visible: () => true,
      disabled: (row) => !this.canReject(row),
    },
    {
      type: 'cancelPurchaseOrder',
      icon: 'cancel',
      tooltip: (row) =>
        this.canCancel(row)
          ? 'Cancelar orden'
          : 'No se puede cancelar esta orden',
      visible: () => true,
      disabled: (row) => !this.canCancel(row),
    },
  ];

  // ==========================
  //  CICLO DE VIDA
  // ==========================
  ngOnInit(): void {
    this.restoreFiltersFromStorage();
  }

  // ==========================
  //  HELPER: UI → FILTROS BACKEND
  // ==========================
  private buildBackendFiltersFromUi(
    ui: entity.PurchaseOrderUiFilters,
  ): entity.PurchaseOrderFilters {
    return {
      page: ui.page,
      limit: ui.limit,
      search: ui.search?.trim() || '',
      status: ui.status || null,
      destination_type: ui.destination_type || null,
      will_have_invoice:
        ui.will_have_invoice === 'true'
          ? true
          : ui.will_have_invoice === 'false'
            ? false
            : null,
      project_id: null,
    };
  }

  get canManageRequesters(): boolean {
    const roles = this.auth.currentUser()?.roles ?? [];
    return roles.includes('ADMIN_GENERAL');
  }

  private mapPurchaseOrderRow(
    row: entity.PurchaseOrderResponseDto,
  ): entity.PurchaseOrderResponseDto {
    return {
      ...row,
      project_name: row.project?.name ?? 'Sin proyecto',
      requested_by_display:
        row.requested_by_user?.name ??
        row.requested_by_name ??
        'Sin solicitante',
      destination_name: row.destination_type_label,
      invoice_name: row.will_have_invoice_label,
      status_name: row.status_label,
      created_at_date: row.created_at,
      authorized_at_date: row.authorized_at ?? null,
      authorized_by_name: row.authorized_by_name ?? 'Sin autorizar',
    };
  }

  // ==========================
  //  REGLAS UI
  // ==========================
  private canEdit(row: entity.PurchaseOrderResponseDto): boolean {
    return row.status === 'in_review' || row.status === 'not_authorized';
  }

  private canAuthorize(row: entity.PurchaseOrderResponseDto): boolean {
    return row.status === 'in_review' || row.status === 'not_authorized';
  }

  private canReject(row: entity.PurchaseOrderResponseDto): boolean {
    return row.status === 'in_review';
  }

  private canCancel(row: entity.PurchaseOrderResponseDto): boolean {
    return row.status === 'in_review' || row.status === 'not_authorized';
  }

  // ==========================
  //  FILTROS + BÚSQUEDA
  // ==========================
  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();

    const uiState: entity.PurchaseOrderUiFilters = {
      search: value.search?.trim() || '',
      status: value.status || '',
      destination_type: value.destination_type || '',
      will_have_invoice: value.will_have_invoice || '',
      page: 1,
      limit: this.filters.limit,
    };

    this.filters = this.buildBackendFiltersFromUi(uiState);
    this.saveFiltersToStorage(uiState);
    this.loadPurchaseOrders();
  }

  loadPurchaseOrders(): void {
    if (this.loadingTable()) return;

    this.loadingTable.set(true);

    this.purchaseOrdersService
      .getPurchaseOrders(this.filters)
      .pipe(finalize(() => this.loadingTable.set(false)))
      .subscribe({
        next: (response) => {
          const data = (response.data ?? []).map((row) =>
            this.mapPurchaseOrderRow(row),
          );

          this.purchaseOrdersTableData = {
            ...response,
            data,
          };
        },
        error: (err) => console.error('Error al cargar órdenes de compra:', err),
      });
  }

  // ==========================
  //  PAGINACIÓN
  // ==========================
  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;

    this.saveFiltersToStorage();
    this.loadPurchaseOrders();
  }

  // ==========================
  //  ACCIONES HEADER
  // ==========================
  onHeaderAction(action: string): void {
    switch (action) {
      case 'new':
        this.router.navigate(['/ordenes-compra/nueva']);
        break;

      default:
        break;
    }
  }

  // ==========================
  //  ACCIONES FOOTER-FILTROS
  // ==========================
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

  // ==========================
  //  ACCIONES TABLA
  // ==========================
  onTableAction(
    ev: DataTableActionEvent<entity.PurchaseOrderResponseDto>,
  ): void {
    switch (ev.type) {
      case 'viewDetail':
        this.router.navigate(['/ordenes-compra/detalle', ev.row.id]);
        break;

      case 'editPurchaseOrder':
        if (!this.canEdit(ev.row)) return;
        this.router.navigate(['/ordenes-compra/editar', ev.row.id]);
        break;

      case 'authorizePurchaseOrder':
        this.authorizePurchaseOrder(ev.row);
        break;

      case 'rejectPurchaseOrder':
        this.rejectPurchaseOrder(ev.row);
        break;

      case 'cancelPurchaseOrder':
        this.cancelPurchaseOrder(ev.row);
        break;

      default:
        break;
    }
  }

  private authorizePurchaseOrder(row: entity.PurchaseOrderResponseDto): void {
    if (!this.canAuthorize(row)) return;

    const authorizedByName = window.prompt(
      'Nombre de quien autorizó la orden:',
      row.authorized_by_name || '',
    );

    if (!authorizedByName?.trim()) return;

    this.loadingTable.set(true);

    this.purchaseOrdersService
      .authorizePurchaseOrder(row.id, {
        authorized_by_name: authorizedByName.trim(),
        notes: 'Autorizada desde el panel.',
      })
      .pipe(finalize(() => this.loadingTable.set(false)))
      .subscribe({
        next: () => this.loadPurchaseOrders(),
        error: (err) => console.error('Error al autorizar O.C.:', err),
      });
  }

  private rejectPurchaseOrder(row: entity.PurchaseOrderResponseDto): void {
    if (!this.canReject(row)) return;

    const reason = window.prompt('Motivo para marcar como no autorizada:');

    if (!reason?.trim()) return;

    this.loadingTable.set(true);

    this.purchaseOrdersService
      .rejectPurchaseOrder(row.id, {
        reason: reason.trim(),
      })
      .pipe(finalize(() => this.loadingTable.set(false)))
      .subscribe({
        next: () => this.loadPurchaseOrders(),
        error: (err) => console.error('Error al rechazar O.C.:', err),
      });
  }

  private cancelPurchaseOrder(row: entity.PurchaseOrderResponseDto): void {
    if (!this.canCancel(row)) return;

    const reason = window.prompt('Motivo de cancelación:');

    if (!reason?.trim()) return;

    this.loadingTable.set(true);

    this.purchaseOrdersService
      .cancelPurchaseOrder(row.id, {
        reason: reason.trim(),
      })
      .pipe(finalize(() => this.loadingTable.set(false)))
      .subscribe({
        next: () => this.loadPurchaseOrders(),
        error: (err) => console.error('Error al cancelar O.C.:', err),
      });
  }

  // ==========================
  //  ESTADO DE FILTROS
  // ==========================
  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();

    const hasSearch = !!(form.search && form.search.trim() !== '');
    const hasStatus = !!form.status;
    const hasDestinationType = !!form.destination_type;
    const hasInvoice = !!form.will_have_invoice;

    return hasSearch || hasStatus || hasDestinationType || hasInvoice;
  }

  clearAllAndSearch(): void {
    this.formFilters.reset(
      {
        search: '',
        status: '',
        destination_type: '',
        will_have_invoice: '',
      },
      { emitEvent: false },
    );

    this.filters = {
      page: 1,
      limit: this.filters.limit,
      search: '',
      status: null,
      destination_type: null,
      will_have_invoice: null,
      project_id: null,
    };

    this.storage.removeItem(PURCHASE_ORDERS_FILTERS_KEY);
    this.loadPurchaseOrders();
  }

  openRequestersModal(): void {
    this.dialogService
      .open(ModalPurchaseOrderRequester, null, 'medium')
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.loadPurchaseOrders();
        }
      });
  }

  // ==========================
  //  LOCAL STORAGE
  // ==========================
  private restoreFiltersFromStorage(): void {
    const saved = this.storage.getItem<entity.PurchaseOrderUiFilters>(
      PURCHASE_ORDERS_FILTERS_KEY,
    );

    if (!saved) {
      this.searchWithFilters();
      return;
    }

    this.formFilters.patchValue(
      {
        search: saved.search ?? '',
        status: saved.status ?? '',
        destination_type: saved.destination_type ?? '',
        will_have_invoice: saved.will_have_invoice ?? '',
      },
      { emitEvent: false },
    );

    this.filters = this.buildBackendFiltersFromUi({
      ...saved,
      page: saved.page ?? 1,
      limit: saved.limit ?? this.filters.limit,
    });

    this.loadPurchaseOrders();
  }

  private saveFiltersToStorage(state?: entity.PurchaseOrderUiFilters): void {
    if (!state) {
      const value = this.formFilters.getRawValue();

      state = {
        search: value.search?.trim() || '',
        status: value.status || '',
        destination_type: value.destination_type || '',
        will_have_invoice: value.will_have_invoice || '',
        page: this.filters.page,
        limit: this.filters.limit,
      };
    }

    this.storage.setItem(PURCHASE_ORDERS_FILTERS_KEY, state);
  }
}