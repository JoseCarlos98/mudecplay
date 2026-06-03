import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

// Angular Material
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

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
import { Autocomplete } from '../../../../shared/ui/autocomplete/autocomplete';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';
import { LoadingOverlay } from '../../../../shared/ui/loading-overlay/loading-overlay';

// Servicios
import { LocalStorageService } from '../../../../shared/services/local-storage.service';
import { PurchaseOrdersService } from '../../services/purchase-orders.service';

// Interfaces
import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import * as entity from '../../interfaces/purchase-orders.interfaces';
import { SearchMultiSelect } from '../../../../shared/ui/autocomplete-multiple/autocomplete-multiple';

import { DialogService } from '../../../../shared/services/dialog.service';
import { ModalSeePhoto } from './components/modal-see-photo/modal-see-photo';
import { ModalConciliarPhoto } from './components/modal-conciliar-photo/modal-conciliar-photo';
// ==========================
//  CONSTANTES DEL MÓDULO
// ==========================
const PHOTO_WITHOUT_COST_FILTERS_KEY = 'mp_purchase_order_pending_photos_filters_v1';

const HEADER_CONFIG: ModuleHeaderConfig = {
  showNew: true,
};

const COLUMNS_CONFIG: ColumnsConfig[] = [
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
    label: 'Subido por',
  },
  {
    key: 'created_at_date',
    label: 'Fecha',
    type: 'date',
  },
  {
    key: 'status_label',
    label: 'Estatus',
    type: 'chip',
    variantResolver: (row: entity.PendingTicketPhotoRow) => resolvePhotoStatusVariant(row),
  },
];

const DISPLAYED_COLUMNS: string[] = [...COLUMNS_CONFIG.map((column) => column.key), 'actions'];

const PAGE_SIZE_OPTIONS: number[] = [5, 10, 25, 50];

type PhotoWithoutCostTableExtraAction = DataTableExtraAction<entity.PendingTicketPhotoRow>;

type PhotoWithoutCostAction = DataTableActionEvent<entity.PendingTicketPhotoRow>;

interface PendingTicketPhotosTableData {
  data: entity.PendingTicketPhotoRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function resolvePhotoStatusVariant(row: entity.PendingTicketPhotoRow): ColumnVariant {
  switch (row.status) {
    case 'reconciled':
      return 'chip-success';

    case 'discarded':
      return 'chip-danger';

    case 'pending':
    default:
      return 'chip-warning';
  }
}

@Component({
  selector: 'app-photo-without-cost',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    // UI
    ModuleHeader,
    DataTable,
    Autocomplete,
    BtnsSection,
    LoadingOverlay,
    SearchMultiSelect,

    // Angular Material
    MatIconModule,
    MatPaginatorModule,
  ],
  templateUrl: './photo-without-cost.html',
  styleUrl: './photo-without-cost.scss',
})
export class PhotoWithoutCost implements OnInit {
  // ==========================
  //  INYECCIONES
  // ==========================
  private readonly purchaseOrdersService = inject(PurchaseOrdersService);
  private readonly fb = inject(FormBuilder);
  private readonly storage = inject(LocalStorageService);
  private readonly router = inject(Router);
  private readonly dialogService = inject(DialogService);
  // ==========================
  //  CONFIG UI
  // ==========================
  readonly headerConfig = HEADER_CONFIG;
  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  readonly loadingTable = signal(false);

  readonly extraActions: PhotoWithoutCostTableExtraAction[] = [
    {
      type: 'viewPhoto',
      icon: 'visibility',
      tooltip: () => 'Ver foto',
      visible: () => true,
      disabled: (row) => !row.public_url,
    },
    {
      type: 'reconcilePhoto',
      icon: 'fact_check',
      tooltip: () => 'Conciliar con O.C.',
      visible: () => true,
      disabled: () => false,
    },
  ];

  // ==========================
  //  ESTADO / DATA
  // ==========================
  filters: entity.FiltersTicketPhotos = {
    page: 1,
    limit: 5,
    project_id: null,
  };

  photoTicketsTableData: PendingTicketPhotosTableData = {
    data: [],
    total: 0,
    page: 1,
    limit: 5,
    totalPages: 0,
  };

  formFilters = this.fb.group({
    project: this.fb.control<Catalog | number | string | null>(null),
  });

  // ==========================
  //  CICLO DE VIDA
  // ==========================
  ngOnInit(): void {
    this.restoreFiltersFromStorage();
  }

  // ==========================
  //  GETTERS UI
  // ==========================
  get hasActiveFilters(): boolean {
    const value = this.formFilters.getRawValue();

    return !!this.getCatalogId(value.project ?? null);
  }

  get photos(): entity.PendingTicketPhotoRow[] {
    return this.photoTicketsTableData?.data ?? [];
  }

  get totalPhotos(): number {
    return this.photoTicketsTableData?.total ?? 0;
  }

  // ==========================
  //  HELPER: UI → FILTROS BACKEND
  // ==========================
  private buildBackendFiltersFromUi(): entity.FiltersTicketPhotos {
    const value = this.formFilters.getRawValue();

    return {
      page: 1,
      limit: this.filters.limit,
      project_id: this.getCatalogId(value.project ?? null),
    };
  }

  // ==========================
  //  FILTROS + BÚSQUEDA
  // ==========================
  searchWithFilters(): void {
    this.filters = this.buildBackendFiltersFromUi();

    this.saveFiltersToStorage();
    this.loadPhotos();
  }

  clearAllAndSearch(): void {
    this.formFilters.reset(
      {
        project: null,
      },
      { emitEvent: false },
    );

    this.filters = {
      page: 1,
      limit: this.filters.limit,
      project_id: null,
    };

    this.storage.removeItem(PHOTO_WITHOUT_COST_FILTERS_KEY);
    this.loadPhotos();
  }

  // ==========================
  //  DATA
  // ==========================
  loadPhotos(): void {
    if (this.loadingTable()) return;

    this.loadingTable.set(true);

    this.purchaseOrdersService
      .getPendingTicketPhotos(this.filters)
      .pipe(finalize(() => this.loadingTable.set(false)))
      .subscribe({
        next: (response) => {
          this.photoTicketsTableData = {
            ...response,
            data: (response.data ?? []).map((photo) => this.mapPhotoRow(photo)),
          };
        },
        error: (err) => {
          console.error('Error al cargar fotos pendientes:', err);

          this.photoTicketsTableData = {
            data: [],
            total: 0,
            page: this.filters.page,
            limit: this.filters.limit,
            totalPages: 0,
          };
        },
      });
  }

  private mapPhotoRow(photo: entity.PurchaseOrderTicketPhotoDto): entity.PendingTicketPhotoRow {
    const createdAt = photo.created_at ?? photo.createdAt ?? '';

    const publicUrl =
      photo.public_url ??
      photo.publicUrl ??
      photo.preview_url ??
      photo.previewUrl ??
      photo.url ??
      null;

    return {
      id: photo.id,
      preview_url: publicUrl,
      file_name: photo.file_name ?? photo.fileName ?? photo.filename ?? 'Foto sin nombre',
      project_name: photo.project?.name ?? 'Sin proyecto',
      uploaded_by_name:
        photo.uploaded_by_user?.name ??
        photo.uploadedByUser?.name ??
        photo.user?.name ??
        'Sin dato',
      status: photo.status ?? 'pending',
      status_label: this.getPhotoStatusLabel(photo.status ?? 'pending'),
      project_id: photo.project?.id ?? null,
      created_at: createdAt,
      created_at_date: createdAt,
      public_url: publicUrl,
    };
  }

  // ==========================
  //  PAGINACIÓN
  // ==========================
  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;

    this.saveFiltersToStorage();
    this.loadPhotos();
  }

  // ==========================
  //  ACCIONES HEADER
  // ==========================
  onHeaderAction(action: string): void {
    switch (action) {
      case 'new':
        this.router.navigateByUrl('/ordenes-compra/subir-foto');
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

      default:
        break;
    }
  }

  // ==========================
  //  ACCIONES TABLA
  // ==========================
  onTableAction(event: PhotoWithoutCostAction): void {
    switch (event.type) {
      case 'viewPhoto':
        this.viewPhoto(event.row);
        break;

      case 'reconcilePhoto':
        this.reconcilePhoto(event.row);
        break;

      default:
        break;
    }
  }

  private viewPhoto(row: entity.PendingTicketPhotoRow): void {
    if (!row?.id) return;

    this.dialogService.open(ModalSeePhoto, row, 'medium');
  }

  private reconcilePhoto(row: entity.PendingTicketPhotoRow): void {
    if (!row?.id) return;

    this.dialogService
      .open(ModalConciliarPhoto, row, 'large')
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.loadPhotos();
        }
      });
  }

  // ==========================
  //  LOCAL STORAGE
  // ==========================
  private restoreFiltersFromStorage(): void {
    const saved = this.storage.getItem<entity.FiltersTicketPhotos>(
      PHOTO_WITHOUT_COST_FILTERS_KEY,
    );

    if (!saved) {
      this.loadPhotos();
      return;
    }

    this.filters = {
      page: saved.page ?? 1,
      limit: saved.limit ?? this.filters.limit,
      project_id: saved.project_id ?? null,
    };

    /**
     * Nota:
     * El autocomplete remoto normalmente necesita el objeto Catalog completo
     * para mostrar el nombre. Por eso aquí solo restauramos el filtro backend.
     * Si más adelante queremos restaurar visualmente el nombre del proyecto,
     * usamos un endpoint getProjectById o guardamos también project_name.
     */
    this.formFilters.patchValue(
      {
        project: this.filters.project_id ?? null,
      },
      { emitEvent: false },
    );

    this.loadPhotos();
  }

  private saveFiltersToStorage(): void {
    this.storage.setItem(PHOTO_WITHOUT_COST_FILTERS_KEY, {
      page: this.filters.page,
      limit: this.filters.limit,
      project_id: this.filters.project_id ?? null,
    });
  }

  // ==========================
  //  HELPERS
  // ==========================
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

  private getCatalogId(value: Catalog | number | string | null): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    const parsed = Number(value.id);

    return Number.isFinite(parsed) ? parsed : null;
  }
}