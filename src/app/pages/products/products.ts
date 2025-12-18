import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';

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
export class Products {
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

  // ==========================
  //  ESTADO / DATA
  // ==========================
  // Filtros que van al backend
  filters: products.FiltersProducts = { page: 1, limit: 5 };

  // Data de la tabla
  productsTableData!: PaginatedResponse<products.ProductResponseDto>;

  // Form de filtros de la grilla (estado de la UI)
  formFilters = this.fb.group({
    name: this.fb.control<string>(''),
  });

  // ==========================
  //  CICLO DE VIDA
  // ==========================
  ngOnInit() {
    this.restoreFiltersFromStorage(); // reconstruye filtros + carga tabla
  }

  // ==========================
  //  HELPER: UI → FILTROS BACKEND
  // ==========================
  /**
   * Recibe el estado de la UI (form + paginación)
   * y devuelve el objeto de filtros que espera el backend.
   */
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
  searchWithFilters() {
    const value = this.formFilters.getRawValue();

    // Estado completo de la UI (incluye página/limit)
    const uiState: products.ProductsUiFilters = {
      name: value.name?.trim() || '',
      page: 1, // siempre que haces una nueva búsqueda, vas a la página 1
      limit: this.filters.limit,
    };

    // Mapeamos a filtros de backend usando el helper
    this.filters = this.buildBackendFiltersFromUi(uiState);

    // Guardamos el estado de UI para persistir filtros
    this.saveFiltersToStorage(uiState);

    // Disparamos la carga
    this.loadProducts();
  }

  loadProducts() {
    this.productsService.getProducts(this.filters).subscribe({
      next: (response: PaginatedResponse<products.ProductResponseDto>) => {
        this.productsTableData = response;
      },
      error: (err) => console.error('Error al cargar productos:', err),
    });
  }

  // ==========================
  //  PAGINACIÓN
  // ==========================
  onPageChange(event: PageEvent) {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;

    // Actualizamos solo page/limit en storage con el estado actual del form
    this.saveFiltersToStorage();
    this.loadProducts();
  }

  // ==========================
  //  ACCIONES HEADER
  // ==========================
  onHeaderAction(action: string) {
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
  onBtnsSectionAction(action: string) {
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
  onTableAction(ev: DataTableActionEvent<products.ProductResponseDto>) {
    switch (ev.type) {
      case 'edit':
        this.productModal(ev.row);
        break;
      case 'delete':
        this.onDelete(ev.row);
        break;
    }
  }

  onDelete(product: products.ProductResponseDto) {
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

  clearAllAndSearch() {
    // Limpia formulario de filtros
    this.formFilters.reset(
      {
        name: '',
      },
      { emitEvent: false },
    );

    // Resetea filtros de backend
    this.filters = {
      page: 1,
      limit: this.filters.limit,
      name: '',
    };

    // Limpia storage para este módulo
    this.storage.removeItem(PRODUCTS_FILTERS_KEY);
    this.loadProducts();
  }

  // ==========================
  //  MODAL DE PRODUCTO
  // ==========================
  productModal(product?: products.ProductResponseDto) {
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
  private restoreFiltersFromStorage() {
    const saved =
      this.storage.getItem<products.ProductsUiFilters>(PRODUCTS_FILTERS_KEY);

    if (!saved) {
      // Primera vez: busca con los valores por defecto del form
      this.searchWithFilters();
      return;
    }

    // Parchear formulario con lo guardado
    this.formFilters.patchValue(
      {
        name: saved.name,
      },
      { emitEvent: false },
    );

    // Reconstruir filtros de backend desde el estado de UI guardado
    this.filters = this.buildBackendFiltersFromUi(saved);

    // Cargar tabla con esos filtros
    this.loadProducts();
  }

  /**
   * Guarda el estado de filtros de la UI en localStorage.
   * - Si recibe `state`, guarda ese.
   * - Si no, reconstruye el estado a partir del form + this.filters.
   */
  private saveFiltersToStorage(state?: products.ProductsUiFilters) {
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
