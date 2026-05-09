import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

// Angular Material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';

import { ModalWarehouseMovements } from './components/modal-warehouse-movements/modal-warehouse-movements';

// UI compartidos
import { ModuleHeader } from '../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../shared/ui/module-header/interfaces/module-header-interface';
import { DataTable } from '../../shared/ui/data-table/data-table';
import {
  ColumnsConfig,
  DataTableActionEvent,
  DataTableExtraAction,
} from '../../shared/ui/data-table/interfaces/table-interfaces';
import { Autocomplete } from '../../shared/ui/autocomplete/autocomplete';
import { InputField } from '../../shared/ui/input-field/input-field';
import { BtnsSection } from '../../shared/ui/btns-section/btns-section';
import { InputSelect } from '../../shared/ui/input-select/input-select';
import { LoadingOverlay } from '../../shared/ui/loading-overlay/loading-overlay';

// Servicios
import { DialogService } from '../../shared/services/dialog.service';
import { LocalStorageService } from '../../shared/services/local-storage.service';
import { WarehouseService } from './services/warehouse.service';

// Interfaces
import {
  Catalog,
  PaginatedResponse,
} from '../../shared/interfaces/general-interfaces';
import * as entity from './interfaces/warehouse-interfaces';

// Componentes
import { ModalWarehouseLots } from './components/modal-warehouse-lots/modal-warehouse-lots';
import { toIdForm } from '../../shared/helpers/general-helpers';

// ==========================
//  CONSTANTES DEL MÓDULO
// ==========================

const WAREHOUSE_FILTERS_KEY = 'mp_warehouse_lots_filters_v1';

const STATUS_OPTIONS: Catalog[] = [
  { id: 'available', name: 'Disponible' },
  { id: 'partial', name: 'Parcial' },
  { id: 'depleted', name: 'Agotado' },
  { id: 'cancelled', name: 'Cancelado' },
];

const COLUMNS_CONFIG: ColumnsConfig[] = [
  { key: 'status_name', label: 'Estado', type: 'chip', typeVariant: 'chip-neutral' },
  { key: 'product_name_snapshot', label: 'Producto' },
  { key: 'expense_folio_snapshot', label: 'Folio gasto' },
  { key: 'supplier_name_snapshot', label: 'Proveedor' },
  { key: 'purchase_date', label: 'Compra', type: 'date' },
  { key: 'original_quantity_text', label: 'Cantidad original', align: 'right' },
  { key: 'available_quantity_text', label: 'Disponible', align: 'right' },
  { key: 'used_quantity_text', label: 'Usado', align: 'right' },
  { key: 'unit_cost', label: 'Costo unitario', type: 'money', align: 'right' },
  { key: 'available_cost', label: 'Costo disponible', type: 'money', align: 'right' },
];

const DISPLAYED_COLUMNS: string[] = [
  ...COLUMNS_CONFIG.map((c) => c.key),
  'actions',
];

const HEADER_CONFIG: ModuleHeaderConfig = {
  showNew: false,
};

type WarehouseTableExtraAction =
  DataTableExtraAction<entity.WarehouseLotResponseDto>;

@Component({
  selector: 'app-warehouse-lots',
  imports: [
    CommonModule,

    // UI
    ModuleHeader,
    DataTable,
    BtnsSection,
    Autocomplete,
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
  templateUrl: './warehouse-lots.html',
  styleUrl: './warehouse-lots.scss',
})
export class WarehouseLots implements OnInit {
  // ==========================
  //  INYECCIONES
  // ==========================
  private readonly warehouseService = inject(WarehouseService);
  private readonly dialogService = inject(DialogService);
  private readonly fb = inject(FormBuilder);
  private readonly storage = inject(LocalStorageService);

  // ==========================
  //  CONFIG UI
  // ==========================
  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;
  readonly headerConfig = HEADER_CONFIG;
  readonly statusOptions = STATUS_OPTIONS;

  readonly loadingTable = signal(false);

  // ==========================
  //  ESTADO / DATA
  // ==========================
  filters: entity.WarehouseLotFilters = {
    page: 1,
    limit: 5,
  };

  warehouseLotsTableData!: PaginatedResponse<entity.WarehouseLotResponseDto>;

  formFilters = this.fb.group({
    product: this.fb.control<Catalog | null>(null),
    status: this.fb.control<string | null>(''),
    search: this.fb.control<string>(''),
  });

readonly extraActions: WarehouseTableExtraAction[] = [
  {
    type: 'assignWarehouseLot',
    icon: 'outbox',
    tooltip: (row) =>
      this.canAssignLot(row)
        ? 'Asignar material a proyecto'
        : 'Sin existencia disponible',
    visible: () => true,
    disabled: (row) => !this.canAssignLot(row),
  },
  {
    type: 'viewWarehouseMovements',
    icon: 'history',
    tooltip: () => 'Ver movimientos',
    visible: () => true,
    disabled: () => false,
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
    ui: entity.WarehouseLotUiFilters,
  ): entity.WarehouseLotFilters {
    return {
      page: ui.page,
      limit: ui.limit,
      productId: toIdForm(ui.product),
      status: ui.status || null,
      search: ui.search?.trim() || '',
    };
  }

  private mapWarehouseLotRow(
    row: entity.WarehouseLotResponseDto,
  ): entity.WarehouseLotResponseDto {
    return {
      ...row,
      status_name: this.getStatusLabel(row.status),
      original_quantity_text: this.formatQuantity(row.original_quantity, row.unit),
      available_quantity_text: this.formatQuantity(row.available_quantity, row.unit),
      used_quantity_text: this.formatQuantity(row.used_quantity, row.unit),
    };
  }

  private getStatusLabel(status: entity.WarehouseLotStatus): string {
    const option = STATUS_OPTIONS.find((s) => s.id === status);
    return option?.name ?? status;
  }

  private formatQuantity(value: number, unit?: string | null): string {
    const quantity = Number(value ?? 0).toLocaleString('es-MX', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });

    return `${quantity} ${unit ?? ''}`.trim();
  }

  private canAssignLot(row: entity.WarehouseLotResponseDto): boolean {
    return (
      Number(row.available_quantity ?? 0) > 0 &&
      (row.status === 'available' || row.status === 'partial')
    );
  }

  // ==========================
  //  FILTROS + BÚSQUEDA
  // ==========================
  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();

    const uiState: entity.WarehouseLotUiFilters = {
      product: value.product ?? null,
      status: value.status ?? null,
      search: value.search?.trim() || '',
      page: 1,
      limit: this.filters.limit,
    };

    this.filters = this.buildBackendFiltersFromUi(uiState);
    this.saveFiltersToStorage(uiState);
    this.loadWarehouseLots();
  }

  loadWarehouseLots(): void {
    if (this.loadingTable()) return;

    this.loadingTable.set(true);

    this.warehouseService
      .getWarehouseLots(this.filters)
      .pipe(finalize(() => this.loadingTable.set(false)))
      .subscribe({
        next: (response) => {
          const data = (response.data ?? []).map((row) =>
            this.mapWarehouseLotRow(row),
          );

          this.warehouseLotsTableData = {
            ...response,
            data,
          };
        },
        error: (err) => console.error('Error al cargar existencias:', err),
      });
  }

  // ==========================
  //  PAGINACIÓN
  // ==========================
  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;

    this.saveFiltersToStorage();
    this.loadWarehouseLots();
  }

  // ==========================
  //  ACCIONES HEADER
  // ==========================
  onHeaderAction(action: string): void {
    switch (action) {
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
onTableAction(ev: DataTableActionEvent<entity.WarehouseLotResponseDto>): void {
  switch (ev.type) {
    case 'assignWarehouseLot':
      this.openAssignModal(ev.row);
      break;

    case 'viewWarehouseMovements':
      this.openMovementsModal(ev.row);
      break;

    default:
      break;
  }
}

openMovementsModal(lot: entity.WarehouseLotResponseDto): void {
  this.dialogService
    .open(ModalWarehouseMovements, lot, 'medium')
    .afterClosed()
    .subscribe((result) => {
      if (result) this.loadWarehouseLots();
    });
}

  openAssignModal(lot: entity.WarehouseLotResponseDto): void {
    this.dialogService
      .open(ModalWarehouseLots, lot, 'small')
      .afterClosed()
      .subscribe((result) => {
        if (result) this.loadWarehouseLots();
      });
  }

  // ==========================
  //  ESTADO DE FILTROS (UI)
  // ==========================
  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();

    const hasProduct = !!form.product;
    const hasStatus = !!form.status;
    const hasSearch = !!(form.search && form.search.trim() !== '');

    return hasProduct || hasStatus || hasSearch;
  }

  clearAllAndSearch(): void {
    this.formFilters.reset(
      {
        product: null,
        status: '',
        search: '',
      },
      { emitEvent: false },
    );

    this.filters = {
      page: 1,
      limit: this.filters.limit,
      productId: null,
      status: null,
      search: '',
    };

    this.storage.removeItem(WAREHOUSE_FILTERS_KEY);
    this.loadWarehouseLots();
  }

  // ==========================
  //  LOCAL STORAGE (FILTROS)
  // ==========================
  private restoreFiltersFromStorage(): void {
    const saved = this.storage.getItem<entity.WarehouseLotUiFilters>(
      WAREHOUSE_FILTERS_KEY,
    );

    if (!saved) {
      this.searchWithFilters();
      return;
    }

    this.formFilters.patchValue(
      {
        product: saved.product ?? null,
        status: saved.status ?? '',
        search: saved.search ?? '',
      },
      { emitEvent: false },
    );

    this.filters = this.buildBackendFiltersFromUi(saved);
    this.loadWarehouseLots();
  }

  private saveFiltersToStorage(state?: entity.WarehouseLotUiFilters): void {
    if (!state) {
      const value = this.formFilters.getRawValue();

      state = {
        product: value.product ?? null,
        status: value.status ?? null,
        search: value.search?.trim() || '',
        page: this.filters.page,
        limit: this.filters.limit,
      };
    }

    this.storage.setItem(WAREHOUSE_FILTERS_KEY, state);
  }
}