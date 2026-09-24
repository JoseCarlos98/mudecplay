import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
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
  DataTableSortEvent,
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

// Modal y service
import { ProductsService } from './services/products.service';
import { ProductModal } from './components/product-modal/product-modal';

const PRODUCTS_FILTERS_KEY = 'mp_products_filters_v1';

const COLUMNS_CONFIG: ColumnsConfig[] = [
  {
    key: 'name',
    label: 'Nombre',
    sortable: true,
    sortKey: 'name',
  },
  {
    key: 'clave_prod_serv',
    label: 'Clave SAT (prod/serv)',
    sortable: true,
    sortKey: 'clave_prod_serv',
  },
  {
    key: 'no_identificacion',
    label: 'SKU / No. interno',
    sortable: true,
    sortKey: 'no_identificacion',
  },
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
  private readonly productsService = inject(ProductsService);
  private readonly dialogService = inject(DialogService);
  private readonly fb = inject(FormBuilder);
  private readonly storage = inject(LocalStorageService);

  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;
  readonly headerConfig = HEADER_CONFIG;
  readonly loadingTable = signal(false);

  sorts: products.ProductSortItem[] = [];

  filters: products.FiltersProducts = {
    page: 1,
    limit: 5,
    sorts: [],
  };

  productsTableData!: PaginatedResponse<products.ProductResponseDto>;

  formFilters = this.fb.group({
    name: this.fb.control<string>(''),
  });

  ngOnInit(): void {
    this.restoreFiltersFromStorage();
  }

  private buildBackendFiltersFromUi(
    ui: products.ProductsUiFilters,
  ): products.FiltersProducts {
    return {
      page: ui.page,
      limit: ui.limit,
      name: ui.name?.trim() || '',
      sorts: [...(ui.sorts ?? [])],
    };
  }

  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();

    const uiState: products.ProductsUiFilters = {
      name: value.name?.trim() || '',
      page: 1,
      limit: this.filters.limit,
      sorts: [...this.sorts],
    };

    this.filters = this.buildBackendFiltersFromUi(uiState);
    this.saveFiltersToStorage(uiState);
    this.loadProducts();
  }

  onSortChange(event: DataTableSortEvent): void {
    this.sorts = [...event.sorts];

    this.filters = {
      ...this.filters,
      page: 1,
      sorts: [...this.sorts],
    };

    this.saveFiltersToStorage();
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
        error: (err) =>
          console.error('Error al cargar productos:', err),
      });
  }

  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;

    this.saveFiltersToStorage();
    this.loadProducts();
  }

  onHeaderAction(action: string): void {
    switch (action) {
      case 'new':
        this.productModal();
        break;

      case 'upload':
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
    }
  }

  onTableAction(
    ev: DataTableActionEvent<products.ProductResponseDto>,
  ): void {
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
          error: (err) =>
            console.error('Error al eliminar producto:', err),
        });
      });
  }

  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();

    const hasName = !!form.name?.trim();
    const hasSort = this.sorts.length > 0;

    return hasName || hasSort;
  }

  clearAllAndSearch(): void {
    this.formFilters.reset(
      {
        name: '',
      },
      { emitEvent: false },
    );

    this.sorts = [];

    this.filters = {
      page: 1,
      limit: this.filters.limit,
      name: '',
      sorts: [],
    };

    this.storage.removeItem(PRODUCTS_FILTERS_KEY);
    this.loadProducts();
  }

  productModal(product?: products.ProductResponseDto): void {
    this.dialogService
      .open(
        ProductModal,
        product ? product : null,
        'medium',
      )
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.loadProducts();
        }
      });
  }

  private restoreFiltersFromStorage(): void {
    const saved =
      this.storage.getItem<products.ProductsUiFilters>(
        PRODUCTS_FILTERS_KEY,
      );

    if (!saved) {
      this.sorts = [];
      this.searchWithFilters();
      return;
    }

    this.sorts = [...(saved.sorts ?? [])];

    const state: products.ProductsUiFilters = {
      name: saved.name ?? '',
      page: saved.page ?? 1,
      limit: saved.limit ?? this.filters.limit,
      sorts: [...this.sorts],
    };

    this.formFilters.patchValue(
      {
        name: state.name,
      },
      { emitEvent: false },
    );

    this.filters = this.buildBackendFiltersFromUi(state);
    this.loadProducts();
  }

  private saveFiltersToStorage(
    state?: products.ProductsUiFilters,
  ): void {
    if (!state) {
      const value = this.formFilters.getRawValue();

      state = {
        name: value.name?.trim() || '',
        page: this.filters.page,
        limit: this.filters.limit,
        sorts: [...this.sorts],
      };
    }

    this.storage.setItem(
      PRODUCTS_FILTERS_KEY,
      state,
    );
  }
}