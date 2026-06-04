import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { finalize } from 'rxjs';

import { ModuleHeaderConfig } from '../../../../../../shared/ui/module-header/interfaces/module-header-interface';
import {
  ColumnsConfig,
  DataTableActionEvent,
  DataTableExtraAction,
} from '../../../../../../shared/ui/data-table/interfaces/table-interfaces';

import {
  PendingTicketPhotoRow,
  PurchaseOrderFilters,
  PurchaseOrderResponseDto,
} from '../../../../interfaces/purchase-orders.interfaces';

import { Catalog } from '../../../../../../shared/interfaces/general-interfaces';

import { ModuleHeader } from '../../../../../../shared/ui/module-header/module-header';
import { DataTable } from '../../../../../../shared/ui/data-table/data-table';
import { DateRangeValue, InputDate } from '../../../../../../shared/ui/input-date/input-date';
import { InputField } from '../../../../../../shared/ui/input-field/input-field';
import { BtnsSection } from '../../../../../../shared/ui/btns-section/btns-section';
import { LoadingOverlay } from '../../../../../../shared/ui/loading-overlay/loading-overlay';
import { SearchMultiSelect } from '../../../../../../shared/ui/autocomplete-multiple/autocomplete-multiple';

import { PurchaseOrdersService } from '../../../../services/purchase-orders.service';

const HEADER_CONFIG: ModuleHeaderConfig = {
  formFull: true,
};

type ReconcilePurchaseOrderFilters = PurchaseOrderFilters & {
  date_from?: string | null;
  date_to?: string | null;
};

type ReconcileOrderRow = PurchaseOrderResponseDto & {
  selected: boolean;
  project_name: string;
  requested_by_display: string;
  destination_name: string;
  invoice_name: string;
  status_name: string;
  created_at_date: string;
};

const COLUMNS_CONFIG: ColumnsConfig[] = [
  {
    key: 'selected',
    label: 'Elegir',
    type: 'select',
    align: 'center',
    selectActionType: 'selectPurchaseOrder',
    selectedResolver: (row: ReconcileOrderRow) => !!row.selected,
    selectTooltip: (row: ReconcileOrderRow) =>
      row.selected ? 'O.C. seleccionada' : 'Seleccionar O.C.',
  },
  {
    key: 'folio',
    label: 'Folio',
  },
  {
    key: 'project_name',
    label: 'Proyecto',
  },
  {
    key: 'requested_by_display',
    label: 'Solicitó',
  },
  {
    key: 'concept',
    label: 'Concepto',
  },
  {
    key: 'requested_amount',
    label: 'Importe',
    type: 'money',
    align: 'right',
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
    key: 'created_at_date',
    label: 'Fecha O.C.',
    type: 'date',
  },
];

const DISPLAYED_COLUMNS: string[] = COLUMNS_CONFIG.map(
  (column) => column.key,
);

interface ReconcileOrdersTableData {
  data: ReconcileOrderRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type ReconcileOrderAction = DataTableActionEvent<ReconcileOrderRow>;

@Component({
  selector: 'app-photo-reconcile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    // UI
    ModuleHeader,
    DataTable,
    InputDate,
    InputField,
    BtnsSection,
    LoadingOverlay,
    SearchMultiSelect,

    // Material
    MatIconModule,
    MatPaginatorModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './photo-reconcile.html',
  styleUrl: './photo-reconcile.scss',
})
export class PhotoReconcile implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly purchaseOrdersService = inject(PurchaseOrdersService);
  private readonly fb = inject(FormBuilder);

  readonly pageTitle = 'Conciliar foto con O.C.';
  readonly headerConfig = HEADER_CONFIG;
  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;
  readonly pageSizeOptions: number[] = [5, 10, 25];

  readonly loadingPhoto = signal(false);
  readonly loadingOrders = signal(false);
  readonly saving = signal(false);

  /**
   * Se deja vacío porque la selección real vive en la columna type: 'select'.
   */
  readonly extraActions: DataTableExtraAction<ReconcileOrderRow>[] = [];

  photoId: number | null = null;
  data: PendingTicketPhotoRow | null = null;

  photoUrl: string | null = null;
  imageError = false;
  errorMessage: string | null = null;

  selectedOrder: ReconcileOrderRow | null = null;

  filters: ReconcilePurchaseOrderFilters = {
    page: 1,
    limit: 10,
    search: '',
    status: null,
    destination_type: null,
    will_have_invoice: null,
    project_id: null,
    date_from: null,
    date_to: null,
  };

  ordersTableData: ReconcileOrdersTableData = {
    data: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  };

  formFilters = this.fb.group({
    dateRange: this.fb.control<DateRangeValue | null>(null),
    search: this.fb.control<string>(''),
    projects: this.fb.control<Catalog[]>([]),
  });

  ngOnInit(): void {
    this.photoId = this.getPhotoIdFromRoute();

    if (!this.photoId) {
      this.errorMessage = 'No se encontró el identificador de la foto.';
      return;
    }

    const statePhoto = this.getPhotoFromNavigationState();

    if (statePhoto?.id) {
      this.setPhotoData(statePhoto);
      this.loadPhotoUrl();
      this.loadAvailableOrders();
      return;
    }

    this.loadTicketPhotoDetail();
  }

  get fileName(): string {
    return this.data?.file_name || 'Foto del ticket';
  }

  get projectName(): string {
    return this.data?.project_name || 'Sin proyecto';
  }

  get uploadedByName(): string {
    return this.data?.uploaded_by_name || 'Sin dato';
  }

  get createdAt(): string {
    return this.data?.created_at_date || this.data?.created_at || 'Sin fecha';
  }

  get orders(): ReconcileOrderRow[] {
    return this.ordersTableData?.data ?? [];
  }

  get totalOrders(): number {
    return this.ordersTableData?.total ?? 0;
  }

  get canReconcile(): boolean {
    return !!this.photoId && !!this.selectedOrder?.id && !this.saving();
  }

  get hasActiveFilters(): boolean {
    const value = this.formFilters.getRawValue();

    const selectedProjectId = this.resolveSelectedProjectId(value.projects ?? []);
    const initialProjectId = this.data?.project_id
      ? Number(this.data.project_id)
      : null;

    const hasDates = !!(
      value.dateRange?.startDate ||
      value.dateRange?.endDate
    );
    const hasSearch = !!value.search?.trim();
    const hasProjectChanged = selectedProjectId !== initialProjectId;

    return hasDates || hasSearch || hasProjectChanged;
  }

  private getPhotoIdFromRoute(): number | null {
    const rawPhotoId = this.route.snapshot.paramMap.get('photoId');
    const photoId = Number(rawPhotoId);

    return Number.isFinite(photoId) && photoId > 0 ? photoId : null;
  }

  private getPhotoFromNavigationState(): PendingTicketPhotoRow | null {
    const state = history.state as { photo?: PendingTicketPhotoRow };

    if (!state?.photo?.id) return null;

    return state.photo;
  }

  private buildFallbackPhoto(photoId: number): PendingTicketPhotoRow {
    return {
      id: photoId,
      preview_url: null,
      file_name: 'Foto del ticket',
      project_name: 'Sin proyecto',
      uploaded_by_name: 'Sin dato',
      status: 'pending',
      status_label: 'Pendiente',
      project_id: null,
      created_at: '',
      created_at_date: '',
      public_url: null,
    };
  }

  private loadTicketPhotoDetail(): void {
    if (!this.photoId) {
      this.errorMessage = 'No se encontró el identificador de la foto.';
      return;
    }

    this.loadingPhoto.set(true);
    this.errorMessage = null;

    this.purchaseOrdersService
      .getTicketPhotoById(this.photoId)
      .pipe(finalize(() => this.loadingPhoto.set(false)))
      .subscribe({
        next: (photo) => {
          const mappedPhoto = this.mapTicketPhotoToRow(photo);

          this.setPhotoData(mappedPhoto);
          this.loadPhotoUrl();
          this.loadAvailableOrders();
        },
        error: (err) => {
          console.error('Error al cargar detalle de la foto:', err);

          this.data = this.buildFallbackPhoto(this.photoId!);
          this.errorMessage =
            err?.error?.message ||
            'No se pudo cargar la información de la foto.';

          this.loadPhotoUrl();
          this.loadAvailableOrders();
        },
      });
  }

  private setPhotoData(photo: PendingTicketPhotoRow): void {
    this.data = photo;

    this.formFilters.patchValue(
      {
        projects: this.getInitialProjects(),
      },
      { emitEvent: false },
    );

    this.filters = this.buildFiltersFromForm(1, this.filters.limit);
  }

  private mapTicketPhotoToRow(
    photo: any,
  ): PendingTicketPhotoRow {
    const createdAt = photo.created_at ?? photo.createdAt ?? '';

    const publicUrl =
      photo.public_url ??
      photo.publicUrl ??
      photo.preview_url ??
      photo.previewUrl ??
      photo.url ??
      null;

    const status = photo.status ?? 'pending';

    return {
      id: Number(photo.id ?? 0),
      project_id: photo.project?.id ?? null,
      preview_url: publicUrl,
      file_name:
        photo.file_name ??
        photo.fileName ??
        photo.filename ??
        'Foto del ticket',
      project_name: photo.project?.name ?? 'Sin proyecto',
      uploaded_by_name:
        photo.uploaded_by_user?.name ??
        photo.uploadedByUser?.name ??
        photo.user?.name ??
        'Sin dato',
      status,
      status_label: this.getPhotoStatusLabel(status),
      created_at: createdAt,
      created_at_date: this.formatDateTime(createdAt),
      public_url: publicUrl,
    };
  }

  private getPhotoStatusLabel(status: string): string {
    switch (status) {
      case 'reconciled':
        return 'Conciliada';

      case 'discarded':
        return 'Descartada';

      case 'pending':
      default:
        return 'Pendiente';
    }
  }

  private formatDateTime(value: string | Date | null | undefined): string {
    if (!value) return 'Sin fecha';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return 'Sin fecha';

    return date
      .toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      .replace(',', '');
  }

  loadPhotoUrl(): void {
    if (!this.photoId) {
      this.errorMessage = 'No se encontró el identificador de la foto.';
      return;
    }

    this.loadingPhoto.set(true);
    this.photoUrl = null;
    this.imageError = false;
    this.errorMessage = null;

    this.purchaseOrdersService
      .getTicketPhotoViewUrl(this.photoId)
      .pipe(finalize(() => this.loadingPhoto.set(false)))
      .subscribe({
        next: (response) => {
          this.photoUrl = response.url;
        },
        error: (err) => {
          console.error('Error al cargar foto para conciliación:', err);

          this.errorMessage =
            err?.error?.message ||
            'No se pudo cargar la foto del ticket.';
        },
      });
  }

  onImageError(): void {
    this.imageError = true;
    this.errorMessage = 'No se pudo mostrar la imagen.';
  }

  openPhotoInNewTab(): void {
    if (!this.photoUrl) return;

    window.open(this.photoUrl, '_blank', 'noopener,noreferrer');
  }

  loadAvailableOrders(): void {
    if (this.loadingOrders()) return;

    this.loadingOrders.set(true);

    this.purchaseOrdersService
      .getAvailableForReconciliation(this.filters)
      .pipe(finalize(() => this.loadingOrders.set(false)))
      .subscribe({
        next: (response) => {
          this.ordersTableData = {
            ...response,
            data: (response.data ?? []).map((order) =>
              this.mapPurchaseOrderRow(order),
            ),
          };
        },
        error: (err) => {
          console.error('Error al cargar O.C. disponibles:', err);

          this.ordersTableData = {
            data: [],
            total: 0,
            page: this.filters.page,
            limit: this.filters.limit,
            totalPages: 0,
          };
        },
      });
  }

  private mapPurchaseOrderRow(
    row: PurchaseOrderResponseDto,
  ): ReconcileOrderRow {
    return {
      ...row,
      selected: this.selectedOrder?.id === row.id,
      project_name: row.project?.name ?? 'Sin proyecto',
      requested_by_display:
        row.requested_by_employee?.name ??
        row.requested_by_name ??
        'Sin solicitante',
      destination_name: row.destination_type_label ?? row.destination_type,
      invoice_name: row.will_have_invoice_label ?? 'Sin dato',
      status_name: row.status_label ?? row.status,
      created_at_date: row.created_at,
    };
  }

  searchWithFilters(): void {
    this.filters = this.buildFiltersFromForm(1, this.filters.limit);

    this.selectedOrder = null;
    this.loadAvailableOrders();
  }

  clearAllAndSearch(): void {
    this.formFilters.reset(
      {
        dateRange: null,
        search: '',
        projects: this.getInitialProjects(),
      },
      { emitEvent: false },
    );

    this.filters = this.buildFiltersFromForm(1, this.filters.limit);

    this.selectedOrder = null;
    this.loadAvailableOrders();
  }

  private buildFiltersFromForm(
    page: number,
    limit: number,
  ): ReconcilePurchaseOrderFilters {
    const value = this.formFilters.getRawValue();

    return {
      ...this.filters,
      page,
      limit,
      search: value.search?.trim() || '',
      project_id: this.resolveSelectedProjectId(value.projects ?? []),
      date_from: value.dateRange?.startDate ?? null,
      date_to: value.dateRange?.endDate ?? null,
    };
  }

  private getInitialProjects(): Catalog[] {
    if (!this.data?.project_id) return [];

    return [
      {
        id: Number(this.data.project_id),
        name: this.data?.project_name || 'Proyecto de la foto',
      },
    ];
  }

  private resolveSelectedProjectId(projects: Catalog[]): number | null {
    const project = projects?.[0];

    if (!project?.id) return null;

    const projectId = Number(project.id);

    return Number.isFinite(projectId) && projectId > 0 ? projectId : null;
  }

  onHeaderAction(action: string): void {
    switch (action) {
      case 'back':
      case 'cancel':
      case 'close':
        this.goBackToPhotos();
        break;

      default:
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

      case 'save':
        this.reconcile();
        break;

      case 'cancel':
        this.goBackToPhotos();
        break;

      default:
        break;
    }
  }

  onPageChange(event: PageEvent): void {
    this.filters = this.buildFiltersFromForm(
      event.pageIndex + 1,
      event.pageSize,
    );

    this.loadAvailableOrders();
  }

  onTableAction(event: ReconcileOrderAction): void {
    switch (event.type) {
      case 'selectPurchaseOrder':
        this.selectOrder(event.row);
        break;

      default:
        break;
    }
  }

  private selectOrder(row: ReconcileOrderRow): void {
    const selectedRow: ReconcileOrderRow = {
      ...row,
      selected: true,
    };

    this.selectedOrder = selectedRow;

    this.ordersTableData = {
      ...this.ordersTableData,
      data: this.orders.map((order) => ({
        ...order,
        selected: order.id === selectedRow.id,
      })),
    };
  }

  reconcile(): void {
    if (!this.canReconcile || !this.selectedOrder?.id || !this.photoId) {
      return;
    }

    this.saving.set(true);

    this.purchaseOrdersService
      .reconcileTicketPhoto(this.photoId, {
        purchase_order_id: this.selectedOrder.id,
        notes: null,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.goBackToPhotos();
        },
        error: (err) => {
          console.error('Error al conciliar foto:', err);
        },
      });
  }

  goBackToPhotos(): void {
    this.router.navigateByUrl('/ordenes-compra/fotos-sin-gasto');
  }
}