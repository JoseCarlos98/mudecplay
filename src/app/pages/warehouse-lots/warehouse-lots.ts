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

// UI compartidos
import { ModuleHeader } from '../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../shared/ui/module-header/interfaces/module-header-interface';
import { DataTable } from '../../shared/ui/data-table/data-table';
import {
  ColumnsConfig,
  DataTableActionEvent,
  DataTableExtraAction,
} from '../../shared/ui/data-table/interfaces/table-interfaces';
import { InputField } from '../../shared/ui/input-field/input-field';
import { BtnsSection } from '../../shared/ui/btns-section/btns-section';
import { InputSelect } from '../../shared/ui/input-select/input-select';
import { LoadingOverlay } from '../../shared/ui/loading-overlay/loading-overlay';
import { SearchMultiSelect } from '../../shared/ui/autocomplete-multiple/autocomplete-multiple';

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
import { ModalWarehouseMovements } from './components/modal-warehouse-movements/modal-warehouse-movements';
import { ModalWarehouseCancel } from './components/modal-warehouse-cancel/modal-warehouse-cancel';

// ==========================
//  CONSTANTES DEL MÓDULO
// ==========================

const WAREHOUSE_FILTERS_KEY = 'mp_warehouse_lots_filters_v2';

const STOCK_VIEW_OPTIONS: Catalog[] = [
  { id: 'available', name: 'Con existencia' },
  { id: 'depleted', name: 'Agotados' },
  { id: 'all', name: 'Todos' },
];

const STATUS_OPTIONS: Catalog[] = [
  { id: 'available', name: 'Disponible' },
  { id: 'partial', name: 'Parcial' },
  { id: 'depleted', name: 'Agotado' },
];

const COLUMNS_CONFIG: ColumnsConfig[] = [
  {
    key: 'status_name',
    label: 'Estado',
    type: 'chip',
    typeVariant: 'chip-neutral',
  },
  { key: 'product_name_snapshot', label: 'Producto' },
  { key: 'expense_folio_snapshot', label: 'Folio gasto' },
  { key: 'supplier_name_snapshot', label: 'Proveedor' },
  { key: 'purchase_date_display', label: 'Compra', type: 'date' },
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
  standalone: true,
  imports: [
    CommonModule,

    // UI
    ModuleHeader,
    DataTable,
    BtnsSection,
    InputField,
    InputSelect,
    SearchMultiSelect,
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
  readonly stockViewOptions = STOCK_VIEW_OPTIONS;

  readonly loadingTable = signal(false);

  // ==========================
  //  ESTADO / DATA
  // ==========================
  filters: entity.WarehouseLotFilters = {
    page: 1,
    limit: 5,
    search: '',
    productSearch: '',
    supplierIds: [],
    stockView: 'available',
    status: null,
  };

  warehouseLotsTableData!: PaginatedResponse<entity.WarehouseLotResponseDto>;

  formFilters = this.fb.group({
    search: this.fb.control<string>(''),
    productSearch: this.fb.control<string>(''),
    suppliersIds: this.fb.control<Catalog[]>([]),
    stockView: this.fb.control<entity.WarehouseStockView>('available'),
    status: this.fb.control<string | null>(''),
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
    // Mantener oculto si no quieres cancelar desde Almacén.
    // La cancelación ya está disponible desde Gastos.
    // {
    //   type: 'cancelWarehouseExpense',
    //   icon: 'delete_forever',
    //   tooltip: () => 'Cancelar gasto de almacén',
    //   visible: (row) => this.canShowCancelWarehouseExpense(row),
    //   disabled: (row) => !this.canCancelWarehouseExpense(row),
    // },
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
      search: ui.search?.trim() || '',
      productSearch: ui.productSearch?.trim() || '',
      supplierIds: (ui.suppliersIds ?? [])
        .map((supplier: any) => Number(supplier.id))
        .filter((id: number) => id > 0),
      stockView: ui.stockView || 'available',
      status: ui.status || null,
    };
  }

private mapWarehouseLotRow(
  row: entity.WarehouseLotResponseDto,
): entity.WarehouseLotResponseDto {
  return {
    ...row,
    status_name: this.getStatusLabel(row.status),
    purchase_date_display: this.formatDateOnly(row.purchase_date),
    original_quantity_text: this.formatQuantity(
      row.original_quantity,
      row.unit,
    ),
    available_quantity_text: this.formatQuantity(
      row.available_quantity,
      row.unit,
    ),
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

  private formatDateOnly(value: string | Date | null | undefined): string {
  if (!value) return '-';

  const raw = typeof value === 'string' ? value : value.toISOString();
  const datePart = raw.substring(0, 10);

  const [year, month, day] = datePart.split('-').map(Number);

  if (!year || !month || !day) return '-';

  const localDate = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(localDate)
    .replace('.', '');
}

  private canAssignLot(row: entity.WarehouseLotResponseDto): boolean {
    return (
      Number(row.available_quantity ?? 0) > 0 &&
      (row.status === 'available' || row.status === 'partial')
    );
  }

  private canShowCancelWarehouseExpense(
    row: entity.WarehouseLotResponseDto,
  ): boolean {
    return !!row?.expense_id && row.status !== 'cancelled';
  }

  private canCancelWarehouseExpense(
    row: entity.WarehouseLotResponseDto,
  ): boolean {
    return !!row?.expense_id && row.status !== 'cancelled';
  }

  // ==========================
  //  FILTROS + BÚSQUEDA
  // ==========================
  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();

    const uiState: entity.WarehouseLotUiFilters = {
      search: value.search?.trim() || '',
      productSearch: value.productSearch?.trim() || '',
      suppliersIds: value.suppliersIds ?? [],
      stockView: value.stockView || 'available',
      status: value.status ?? null,
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

      case 'cancelWarehouseExpense':
        this.openCancelWarehouseExpenseModal(ev.row);
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

  openCancelWarehouseExpenseModal(
    lot: entity.WarehouseLotResponseDto,
  ): void {
    if (!this.canCancelWarehouseExpense(lot)) return;

    this.dialogService
      .open(
        ModalWarehouseCancel,
        {
          expenseId: Number(lot.expense_id),
        },
        'medium',
      )
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.loadWarehouseLots();
        }
      });
  }

  // ==========================
  //  ESTADO DE FILTROS (UI)
  // ==========================
  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();

    const hasSearch = !!(form.search && form.search.trim() !== '');
    const hasProductSearch = !!(
      form.productSearch && form.productSearch.trim() !== ''
    );
    const hasSuppliers = (form.suppliersIds?.length ?? 0) > 0;
    const hasStatus = !!form.status;
    const hasNonDefaultStockView = form.stockView !== 'available';

    return (
      hasSearch ||
      hasProductSearch ||
      hasSuppliers ||
      hasStatus ||
      hasNonDefaultStockView
    );
  }

  clearAllAndSearch(): void {
    this.formFilters.reset(
      {
        search: '',
        productSearch: '',
        suppliersIds: [],
        stockView: 'available',
        status: '',
      },
      { emitEvent: false },
    );

    this.filters = {
      page: 1,
      limit: this.filters.limit,
      search: '',
      productSearch: '',
      supplierIds: [],
      stockView: 'available',
      status: null,
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
        search: saved.search ?? '',
        productSearch: saved.productSearch ?? '',
        suppliersIds: saved.suppliersIds ?? [],
        stockView: saved.stockView ?? 'available',
        status: saved.status ?? '',
      },
      { emitEvent: false },
    );

    this.filters = this.buildBackendFiltersFromUi({
      ...saved,
      stockView: saved.stockView ?? 'available',
      page: saved.page ?? 1,
      limit: saved.limit ?? this.filters.limit,
    });

    this.loadWarehouseLots();
  }

  private saveFiltersToStorage(state?: entity.WarehouseLotUiFilters): void {
    if (!state) {
      const value = this.formFilters.getRawValue();

      state = {
        search: value.search?.trim() || '',
        productSearch: value.productSearch?.trim() || '',
        suppliersIds: value.suppliersIds ?? [],
        stockView: value.stockView || 'available',
        status: value.status ?? null,
        page: this.filters.page,
        limit: this.filters.limit,
      };
    }

    this.storage.setItem(WAREHOUSE_FILTERS_KEY, state);
  }
}