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
import { SearchMultiSelect } from '../../../../shared/ui/autocomplete-multiple/autocomplete-multiple';

// Servicios
import { LocalStorageService } from '../../../../shared/services/local-storage.service';
import { DialogService } from '../../../../shared/services/dialog.service';
import { PurchaseOrdersService } from '../../services/purchase-orders.service';
import { AuthService } from '../../../../auth/services/auth.service';

// Interfaces
import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import * as entity from '../../interfaces/purchase-orders.interfaces';

// Componentes
import { ModalSeePhoto } from './components/modal-see-photo/modal-see-photo';
import { ChangeProyect } from './components/change-proyect/change-proyect';

// ==========================
//  CONSTANTES DEL MÓDULO
// ==========================
const PHOTO_WITHOUT_COST_FILTERS_KEY = 'mp_purchase_order_pending_photos_filters_v1';

const PHOTOS_WITHOUT_EXPENSE_ROLE = 'ORDENES_COMPRA_FOTOS_SIN_GASTO_EDITOR';
const ADMIN_GENERAL_ROLE = 'ADMIN_GENERAL';

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
    variantResolver: (row: entity.PendingTicketPhotoRow) =>
      resolvePhotoStatusVariant(row),
  },
];

const DISPLAYED_COLUMNS: string[] = [
  ...COLUMNS_CONFIG.map((column) => column.key),
  'actions',
];

const PAGE_SIZE_OPTIONS: number[] = [5, 10, 25, 50];

type PhotoWithoutCostTableExtraAction =
  DataTableExtraAction<entity.PendingTicketPhotoRow>;

type PhotoWithoutCostAction =
  DataTableActionEvent<entity.PendingTicketPhotoRow>;

interface PendingTicketPhotosTableData {
  data: entity.PendingTicketPhotoRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function resolvePhotoStatusVariant(
  row: entity.PendingTicketPhotoRow,
): ColumnVariant {
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
  private readonly auth = inject(AuthService);

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
      type: 'changeProject',
      icon: 'edit',
      tooltip: () => 'Cambiar proyecto',
      visible: (row) => this.canChangePhotoProject(row),
      disabled: (row) => row.status !== 'pending',
    },
    {
      type: 'reconcilePhoto',
      icon: 'fact_check',
      tooltip: () => 'Conciliar con O.C.',
      visible: () => true,
      disabled: (row) => row.status !== 'pending',
    },
    {
      type: 'deletePhoto',
      icon: 'delete',
      tooltip: () => 'Eliminar foto',
      visible: () => this.isAdminGeneral,
      disabled: (row) => row.status !== 'pending',
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

  get isAdminGeneral(): boolean {
    return this.hasRole(ADMIN_GENERAL_ROLE);
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
            data: (response.data ?? []).map((photo) =>
              this.mapPhotoRow(photo),
            ),
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

  private mapPhotoRow(
    photo: entity.PurchaseOrderTicketPhotoDto,
  ): entity.PendingTicketPhotoRow {
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
      file_name:
        photo.file_name ??
        photo.fileName ??
        photo.filename ??
        'Foto sin nombre',
      project_name: photo.project?.name ?? 'Sin proyecto',
      uploaded_by_name:
        photo.uploaded_by_user?.name ??
        photo.uploadedByUser?.name ??
        photo.user?.name ??
        'Sin dato',
      uploaded_by_user_id:
        photo.uploaded_by_user?.id ??
        photo.uploadedByUser?.id ??
        photo.user?.id ??
        null,
      status: photo.status ?? 'pending',
      status_label: this.getPhotoStatusLabel(photo.status ?? 'pending'),
      project_id: photo.project?.id ?? null,
      created_at: createdAt,
      created_at_date: createdAt,
      public_url: publicUrl,
    };
  }

  private removePhotoFromCurrentTable(photoId: number): void {
    const nextData = this.photos.filter(
      (photo) => Number(photo.id) !== Number(photoId),
    );

    this.photoTicketsTableData = {
      ...this.photoTicketsTableData,
      data: nextData,
      total: Math.max(Number(this.photoTicketsTableData.total ?? 0) - 1, 0),
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
        this.router.navigateByUrl('/ordenes-compra/subir-ticket-gasto');
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

      case 'changeProject':
        this.changeProject(event.row);
        break;

      case 'reconcilePhoto':
        this.reconcilePhoto(event.row);
        break;

      case 'deletePhoto':
        this.deletePhoto(event.row);
        break;

      default:
        break;
    }
  }

  private viewPhoto(row: entity.PendingTicketPhotoRow): void {
    if (!row?.id) return;

    this.dialogService.open(ModalSeePhoto, row, 'medium');
  }

  private changeProject(row: entity.PendingTicketPhotoRow): void {
    if (!row?.id || !this.canChangePhotoProject(row)) return;

    this.dialogService
      .open(ChangeProyect, row, 'small')
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;

        this.loadPhotos();
      });
  }

  private reconcilePhoto(row: entity.PendingTicketPhotoRow): void {
    if (!row?.id) return;

    this.router.navigateByUrl(
      `/ordenes-compra/fotos-sin-gasto/${row.id}/conciliar`,
    );
  }

  private deletePhoto(row: entity.PendingTicketPhotoRow): void {
    if (!row?.id || !this.isAdminGeneral) return;

    this.dialogService
      .confirm({
        size: 'mini',
        message: `¿Quieres eliminar la foto:\n"${row.file_name}"?\n\nEsta acción eliminará la foto del sistema.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.purchaseOrdersService.deleteTicketPhoto(row.id).subscribe({
          next: () => {
            if (this.photos.length === 1 && this.filters.page > 1) {
              this.filters.page = this.filters.page - 1;
              this.saveFiltersToStorage();
            }

            this.removePhotoFromCurrentTable(row.id);
            this.loadPhotos();
          },
          error: (err) => {
            console.error('Error al eliminar foto:', err);

            this.dialogService
              .confirm({
                size: 'small',
                title: 'No se pudo eliminar',
                message:
                  err?.error?.message ||
                  'Ocurrió un error al eliminar la foto.',
                confirmText: 'OK',
                cancelText: '',
              })
              .subscribe();
          },
        });
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
  //  PERMISOS
  // ==========================
  private canChangePhotoProject(row: entity.PendingTicketPhotoRow): boolean {
    if (!row || row.status !== 'pending') {
      return false;
    }

    if (this.isAdminGeneral) {
      return true;
    }

    if (!this.hasRole(PHOTOS_WITHOUT_EXPENSE_ROLE)) {
      return false;
    }

    const currentUserId = this.getCurrentUserId();
    const uploadedByUserId = Number(row.uploaded_by_user_id ?? 0);

    return (
      !!currentUserId &&
      uploadedByUserId > 0 &&
      uploadedByUserId === currentUserId
    );
  }

  private hasRole(roleCode: string): boolean {
    const roles = this.auth.currentUser()?.roles ?? [];

    return roles.some((role: any) => {
      if (!role) return false;

      if (typeof role === 'string') {
        return role.trim().toUpperCase() === roleCode;
      }

      const value =
        role.code ??
        role.name ??
        role.role ??
        role.roleCode ??
        role.role_code ??
        null;

      return String(value || '').trim().toUpperCase() === roleCode;
    });
  }

  private getCurrentUserId(): number | null {
    const user: any = this.auth.currentUser();

    const rawId =
      user?.id ??
      user?.userId ??
      user?.user_id ??
      user?.sub ??
      null;

    const userId = Number(rawId);

    return Number.isFinite(userId) && userId > 0 ? userId : null;
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