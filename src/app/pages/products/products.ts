import { Component, OnInit, inject, signal } from '@angular/core';
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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

// UI compartidos
import { ModuleHeader } from '../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../shared/ui/module-header/interfaces/module-header-interface';
import { DataTable } from '../../shared/ui/data-table/data-table';
import {
  ColumnsConfig,
  DataTableActionEvent,
} from '../../shared/ui/data-table/interfaces/table-interfaces';
import { InputField } from '../../shared/ui/input-field/input-field';
import { BtnsSection } from '../../shared/ui/btns-section/btns-section';
import { LoadingOverlay } from '../../shared/ui/loading-overlay/loading-overlay';

// Servicios
import { DialogService } from '../../shared/services/dialog.service';
import { LocalStorageService } from '../../shared/services/local-storage.service';

// Interfaces
import { PaginatedResponse } from '../../shared/interfaces/general-interfaces';
import * as products from './interfaces/products-interfaces';
import { ProductsService } from './services/products.service';
import { ProductModal } from './components/product-modal/product-modal';

// ==========================
//  CONSTANTES DEL MÓDULO
// ==========================

const PRODUCTS_FILTERS_KEY = 'mp_products_filters_v1';

const COLUMNS_CONFIG: ColumnsConfig[] = [
  { key: 'name', label: 'Nombre' },
  { key: 'clave_prod_serv', label: 'Clave SAT (prod/serv)' },
  { key: 'no_identificacion', label: 'SKU / No. interno' },
];

const DISPLAYED_COLUMNS: string[] = [
  ...COLUMNS_CONFIG.map((c) => c.key),
  'actions',
];

const HEADER_CONFIG: ModuleHeaderConfig = {
  showNew: true,
};

@Component({
  selector: 'app-products',
  imports: [
    CommonModule,

    // UI
    ModuleHeader,
    DataTable,
    BtnsSection,
    InputField,
    LoadingOverlay,

    // Angular Material
    MatPaginatorModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatTableModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,

    // Forms
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class Products implements OnInit {
  // ==========================
  //  INYECCIONES
  // ==========================
  private readonly productsService = inject(ProductsService);
  private readonly dialogService = inject(DialogService);
  private readonly fb = inject(FormBuilder);
  private readonly storage = inject(LocalStorageService);

  // ==========================
  //  CONFIG UI
  // ==========================
  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;
  readonly headerConfig = HEADER_CONFIG;

  readonly loadingTable = signal(false);

  // ==========================
  //  ESTADO / DATA
  // ==========================
  filters: products.FiltersProducts = { page: 1, limit: 5 };

  productsTableData!: PaginatedResponse<products.ProductResponseDto>;

  formFilters = this.fb.group({
    name: this.fb.control<string>(''),
  });

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
    ui: products.ProductsUiFilters,
  ): products.FiltersProducts {
    return {
      page: ui.page,
      limit: ui.limit,
      name: ui.name?.trim() || '',
    };
  }

  // ==========================
  //  FILTROS + BÚSQUEDA
  // ==========================
  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();

    const uiState: products.ProductsUiFilters = {
      name: value.name?.trim() || '',
      page: 1,
      limit: this.filters.limit,
    };

    this.filters = this.buildBackendFiltersFromUi(uiState);
    this.saveFiltersToStorage(uiState);
    this.loadProducts();
  }

  loadProducts(): void {
    if (this.loadingTable()) return;

    this.loadingTable.set(true);

    this.productsService
      .getProducts(this.filters)
      .pipe(finalize(() => this.loadingTable.set(false)))
      .subscribe({
        next: (response: PaginatedResponse<products.ProductResponseDto>) => {
          this.productsTableData = response;
        },
        error: (err) => console.error('Error al cargar productos:', err),
      });
  }

  // ==========================
  //  PAGINACIÓN
  // ==========================
  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;

    this.saveFiltersToStorage();
    this.loadProducts();
  }

  // ==========================
  //  ACCIONES HEADER
  // ==========================
  onHeaderAction(action: string): void {
    switch (action) {
      case 'new':
        this.productModal();
        break;

      case 'upload':
        // si luego quieres importar productos por archivo, aquí va
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
  onTableAction(ev: DataTableActionEvent<products.ProductResponseDto>): void {
    switch (ev.type) {
      case 'edit':
        this.productModal(ev.row);
        break;

      case 'delete':
        this.onDelete(ev.row);
        break;
    }
  }

  onDelete(product: products.ProductResponseDto): void {
    this.dialogService
      .confirm({
        message: `¿Quieres eliminar el producto:\n"${product.name.trim()}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.productsService.remove(product.id).subscribe({
          next: () => this.loadProducts(),
          error: (err) => console.error('Error al eliminar producto:', err),
        });
      });
  }

  // ==========================
  //  ESTADO DE FILTROS (UI)
  // ==========================
  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();
    const hasName = !!(form.name?.trim() !== '');
    return hasName;
  }

  clearAllAndSearch(): void {
    this.formFilters.reset(
      {
        name: '',
      },
      { emitEvent: false },
    );

    this.filters = {
      page: 1,
      limit: this.filters.limit,
      name: '',
    };

    this.storage.removeItem(PRODUCTS_FILTERS_KEY);
    this.loadProducts();
  }

  // ==========================
  //  MODAL DE PRODUCTO
  // ==========================
  productModal(product?: products.ProductResponseDto): void {
    this.dialogService
      .open(ProductModal, product ? product : null, 'medium')
      .afterClosed()
      .subscribe((result) => {
        if (result) this.loadProducts();
      });
  }

  // ==========================
  //  LOCAL STORAGE (FILTROS)
  // ==========================
  private restoreFiltersFromStorage(): void {
    const saved =
      this.storage.getItem<products.ProductsUiFilters>(PRODUCTS_FILTERS_KEY);

    if (!saved) {
      this.searchWithFilters();
      return;
    }

    this.formFilters.patchValue(
      {
        name: saved.name,
      },
      { emitEvent: false },
    );

    this.filters = this.buildBackendFiltersFromUi(saved);
    this.loadProducts();
  }

  private saveFiltersToStorage(state?: products.ProductsUiFilters): void {
    if (!state) {
      const value = this.formFilters.getRawValue();

      state = {
        name: value.name?.trim() || '',
        page: this.filters.page,
        limit: this.filters.limit,
      };
    }

    this.storage.setItem(PRODUCTS_FILTERS_KEY, state);
  }
}