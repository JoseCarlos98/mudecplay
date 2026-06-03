import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
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
  modal: true,
};

type ReconcilePurchaseOrderFilters = PurchaseOrderFilters & {
  date_from?: string | null;
  date_to?: string | null;
};

const COLUMNS_CONFIG: ColumnsConfig[] = [
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
    label: 'Fecha',
  },
];

const DISPLAYED_COLUMNS: string[] = [
  ...COLUMNS_CONFIG.map((column) => column.key),
  'actions',
];

type ReconcileOrderRow = PurchaseOrderResponseDto & {
  project_name: string;
  requested_by_display: string;
  destination_name: string;
  invoice_name: string;
  status_name: string;
  created_at_date: string;
};

interface ReconcileOrdersTableData {
  data: ReconcileOrderRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type ReconcileOrderAction = DataTableActionEvent<ReconcileOrderRow>;

@Component({
  selector: 'app-modal-conciliar-photo',
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
  templateUrl: './modal-conciliar-photo.html',
  styleUrl: './modal-conciliar-photo.scss',
})
export class ModalConciliarPhoto implements OnInit {
  readonly data = inject<PendingTicketPhotoRow>(MAT_DIALOG_DATA);

  private readonly dialogRef = inject(MatDialogRef<ModalConciliarPhoto>);
  private readonly purchaseOrdersService = inject(PurchaseOrdersService);
  private readonly fb = inject(FormBuilder);

  readonly headerConfig = HEADER_CONFIG;
  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;
  readonly pageSizeOptions: number[] = [5, 10, 25, 50];

  readonly loadingPhoto = signal(false);
  readonly loadingOrders = signal(false);
  readonly saving = signal(false);

  readonly extraActions: DataTableExtraAction<ReconcileOrderRow>[] = [
    {
      type: 'selectPurchaseOrder',
      icon: 'check_circle',
      tooltip: (row) =>
        this.selectedOrder?.id === row.id
          ? 'O.C. seleccionada'
          : 'Seleccionar O.C.',
      visible: () => true,
      disabled: () => false,
    },
  ];

  photoUrl: string | null = null;
  imageError = false;
  errorMessage: string | null = null;

  selectedOrder: ReconcileOrderRow | null = null;

  filters: ReconcilePurchaseOrderFilters = {
    page: 1,
    limit: 5,
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
    limit: 5,
    totalPages: 0,
  };

  formFilters = this.fb.group({
    dateRange: this.fb.control<DateRangeValue | null>(null),
    search: this.fb.control<string>(''),
    projects: this.fb.control<Catalog[]>([]),
  });

  ngOnInit(): void {
    this.formFilters.patchValue(
      {
        projects: this.getInitialProjects(),
      },
      { emitEvent: false },
    );

    this.filters = this.buildFiltersFromForm(1, this.filters.limit);

    this.loadPhotoUrl();
    this.loadAvailableOrders();
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
    return !!this.data?.id && !!this.selectedOrder?.id && !this.saving();
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

  loadPhotoUrl(): void {
    if (!this.data?.id) {
      this.errorMessage = 'No se encontró el identificador de la foto.';
      return;
    }

    this.loadingPhoto.set(true);
    this.photoUrl = null;
    this.imageError = false;
    this.errorMessage = null;

    this.purchaseOrdersService
      .getTicketPhotoViewUrl(this.data.id)
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
        this.closeModal();
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
    this.selectedOrder = row;
  }

  reconcile(): void {
    if (!this.canReconcile || !this.selectedOrder?.id || !this.data?.id) {
      return;
    }

    this.saving.set(true);

    this.purchaseOrdersService
      .reconcileTicketPhoto(this.data.id, {
        purchase_order_id: this.selectedOrder.id,
        notes: null,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('Error al conciliar foto:', err);
        },
      });
  }

  closeModal(): void {
    this.dialogRef.close(false);
  }
}