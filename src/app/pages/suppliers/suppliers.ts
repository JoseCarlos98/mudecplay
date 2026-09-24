import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
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
import { SearchMultiSelect } from '../../shared/ui/autocomplete-multiple/autocomplete-multiple';
import { InputDate } from '../../shared/ui/input-date/input-date';
import { InputField } from '../../shared/ui/input-field/input-field';
import { BtnsSection } from '../../shared/ui/btns-section/btns-section';
import { InputSelect } from '../../shared/ui/input-select/input-select';
import { LoadingOverlay } from '../../shared/ui/loading-overlay/loading-overlay';

// Servicios
import { DialogService } from '../../shared/services/dialog.service';
import { CatalogsService } from '../../shared/services/catalogs.service';
import { LocalStorageService } from '../../shared/services/local-storage.service';

// Interfaces
import { Catalog, PaginatedResponse } from '../../shared/interfaces/general-interfaces';
import * as entity from '../suppliers/interfaces/supplier-interfaces';
import { SupplierService } from './services/supplier.service';
import { SupplierModal } from './components/supplier-modal/supplier-modal';

const EXPENSES_FILTERS_KEY = 'mp_supplier_filters_v1';

const COLUMNS_CONFIG: ColumnsConfig[] = [
  {
    key: 'company_name',
    label: 'Razón Social',
    sortable: true,
    sortKey: 'company_name',
  },
  {
    key: 'rfc',
    label: 'RFC',
    sortable: true,
    sortKey: 'rfc',
  },
  {
    key: 'name',
    label: 'Nombre Comercial',
    sortable: true,
    sortKey: 'name',
  },
  {
    key: 'area',
    label: 'Área',
    type: 'relation',
    fallback: 'No asignado',
    fallbackVariant: 'chip-warning',
    sortable: true,
    sortKey: 'area',
  },
  {
    key: 'contact_name',
    label: 'Contacto',
    sortable: true,
    sortKey: 'contact_name',
  },
  {
    key: 'phone',
    label: 'Teléfono',
    type: 'phone',
    sortable: true,
    sortKey: 'phone',
  },
  {
    key: 'email',
    label: 'Correo',
    sortable: true,
    sortKey: 'email',
  },
  {
    key: 'address',
    label: 'Dirección',
    sortable: true,
    sortKey: 'address',
  },
  {
    key: 'days_credit',
    label: 'Crédito (días)',
    sortable: true,
    sortKey: 'days_credit',
  },
  {
    key: 'will_invoice',
    label: '¿Factura?',
    type: 'booleanConfirm',
    align: 'center',
    sortable: true,
    sortKey: 'will_invoice',
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
  selector: 'app-suppliers',
  standalone: true,
  imports: [
    CommonModule,

    // UI
    ModuleHeader,
    DataTable,
    BtnsSection,
    InputDate,
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
    MatDatepickerModule,
    MatNativeDateModule,

    // Forms
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './suppliers.html',
  styleUrl: './suppliers.scss',
})
export class Suppliers implements OnInit {
  // ==========================
  // INYECCIONES
  // ==========================

  private readonly supplierService = inject(SupplierService);
  private readonly dialogService = inject(DialogService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly fb = inject(FormBuilder);
  private readonly storage = inject(LocalStorageService);

  // ==========================
  // CONFIG UI
  // ==========================

  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;
  readonly headerConfig = HEADER_CONFIG;
  readonly loadingTable = signal(false);

  catalogAreaSuppliers: Catalog[] = [];
  sorts: entity.SupplierSortItem[] = [];

  // ==========================
  // ESTADO / DATA
  // ==========================

  filters: entity.FiltersSupplier = {
    page: 1,
    limit: 5,
    sorts: [],
  };

  expensesTableData!: PaginatedResponse<entity.SupplierResponseDto>;

  formFilters = this.fb.group({
    areasIds: this.fb.control<number[]>([]),
    email: this.fb.control<string>(''),
    phone: this.fb.control<string>(''),
    company_name: this.fb.control<string>(''),
  });

  // ==========================
  // CICLO DE VIDA
  // ==========================

  ngOnInit(): void {
    this.restoreFiltersFromStorage();
    this.loadCatalogs();
  }

  // ==========================
  // CARGA DE CATÁLOGOS
  // ==========================

  loadCatalogs(): void {
    this.catalogsService.areasSuppliersCatalog().subscribe({
      next: (response: Catalog[]) => {
        this.catalogAreaSuppliers = response;
      },
      error: (err) =>
        console.error('Error al cargar áreas de proveedores:', err),
    });
  }

  // ==========================
  // UI -> FILTROS BACKEND
  // ==========================

  private buildBackendFiltersFromUi(
    ui: entity.SupplierUiFilters,
  ): entity.FiltersSupplier {
    return {
      page: ui.page,
      limit: ui.limit,
      areasIds: ui.areasIds ?? null,
      email: ui.email?.trim() || '',
      company_name: ui.company_name?.trim() || '',
      phone: ui.phone?.trim() || '',
      sorts: [...(ui.sorts ?? [])],
    };
  }

  // ==========================
  // FILTROS + BÚSQUEDA
  // ==========================

  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();

    const uiState: entity.SupplierUiFilters = {
      areasIds: value.areasIds ?? [],
      email: value.email?.trim() || '',
      phone: value.phone?.trim() || '',
      company_name: value.company_name?.trim() || '',
      page: 1,
      limit: this.filters.limit,
      sorts: [...this.sorts],
    };

    this.filters = this.buildBackendFiltersFromUi(uiState);
    this.saveFiltersToStorage(uiState);
    this.loadSupplier();
  }

  // ==========================
  // ORDENAMIENTO
  // ==========================

  onSortChange(event: DataTableSortEvent): void {
    this.sorts = [...event.sorts];

    this.filters = {
      ...this.filters,
      page: 1,
      sorts: [...this.sorts],
    };

    this.saveFiltersToStorage();
    this.loadSupplier();
  }

  // ==========================
  // CARGAR PROVEEDORES
  // ==========================

  loadSupplier(): void {
    if (this.loadingTable()) return;

    this.loadingTable.set(true);

    this.supplierService
      .getSuppliers(this.filters)
      .pipe(finalize(() => this.loadingTable.set(false)))
      .subscribe({
        next: (response: PaginatedResponse<entity.SupplierResponseDto>) => {
          this.expensesTableData = response;
        },
        error: (err) =>
          console.error('Error al cargar proveedores:', err),
      });
  }

  // ==========================
  // PAGINACIÓN
  // ==========================

  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;

    this.saveFiltersToStorage();
    this.loadSupplier();
  }

  // ==========================
  // ACCIONES HEADER
  // ==========================

  onHeaderAction(action: string): void {
    switch (action) {
      case 'new':
        this.supplierModal();
        break;

      case 'upload':
        break;
    }
  }

  // ==========================
  // ACCIONES FILTROS
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
  // ACCIONES TABLA
  // ==========================

  onTableAction(
    ev: DataTableActionEvent<entity.SupplierResponseDto>,
  ): void {
    switch (ev.type) {
      case 'edit':
        this.supplierModal(ev.row);
        break;

      case 'delete':
        this.onDelete(ev.row);
        break;
    }
  }

  onDelete(supplier: entity.SupplierResponseDto): void {
    this.dialogService
      .confirm({
        message: `¿Quieres eliminar el proveedor:\n"${supplier?.rfc?.trim()}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        size: 'mini',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.supplierService.remove(supplier.id).subscribe({
          next: () => this.loadSupplier(),
          error: (err) =>
            console.error('Error al eliminar proveedor:', err),
        });
      });
  }

  // ==========================
  // ESTADO DE FILTROS
  // ==========================

  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();

    const hasAreas = (form.areasIds?.length ?? 0) > 0;
    const hasEmail = !!form.email?.trim();
    const hasPhone = !!form.phone?.trim();
    const hasCompanyName = !!form.company_name?.trim();
    const hasSort = this.sorts.length > 0;

    return (
      hasCompanyName ||
      hasAreas ||
      hasEmail ||
      hasPhone ||
      hasSort
    );
  }

  clearAllAndSearch(): void {
    this.formFilters.reset(
      {
        areasIds: [],
        email: '',
        phone: '',
        company_name: '',
      },
      { emitEvent: false },
    );

    this.sorts = [];

    this.filters = {
      page: 1,
      limit: this.filters.limit,
      areasIds: [],
      email: '',
      phone: '',
      company_name: '',
      sorts: [],
    };

    this.storage.removeItem(EXPENSES_FILTERS_KEY);
    this.loadSupplier();
  }

  // ==========================
  // MODAL
  // ==========================

  supplierModal(supplier?: entity.SupplierResponseDto): void {
    this.dialogService
      .open(SupplierModal, supplier ? supplier : null, 'medium')
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.loadSupplier();
        }
      });
  }

  // ==========================
  // LOCAL STORAGE
  // ==========================

  private restoreFiltersFromStorage(): void {
    const saved =
      this.storage.getItem<entity.SupplierUiFilters>(
        EXPENSES_FILTERS_KEY,
      );

    if (!saved) {
      this.sorts = [];
      this.searchWithFilters();
      return;
    }

    this.sorts = [...(saved.sorts ?? [])];

    this.formFilters.patchValue(
      {
        areasIds: saved.areasIds ?? [],
        email: saved.email ?? '',
        phone: saved.phone ?? '',
        company_name: saved.company_name ?? '',
      },
      { emitEvent: false },
    );

    this.filters = this.buildBackendFiltersFromUi({
      ...saved,
      areasIds: saved.areasIds ?? [],
      email: saved.email ?? '',
      phone: saved.phone ?? '',
      company_name: saved.company_name ?? '',
      page: saved.page ?? 1,
      limit: saved.limit ?? this.filters.limit,
      sorts: [...this.sorts],
    });

    this.loadSupplier();
  }

  private saveFiltersToStorage(
    state?: entity.SupplierUiFilters,
  ): void {
    if (!state) {
      const value = this.formFilters.getRawValue();

      state = {
        areasIds: value.areasIds ?? [],
        email: value.email?.trim() || '',
        phone: value.phone?.trim() || '',
        company_name: value.company_name?.trim() || '',
        page: this.filters.page,
        limit: this.filters.limit,
        sorts: [...this.sorts],
      };
    }

    this.storage.setItem(
      EXPENSES_FILTERS_KEY,
      state,
    );
  }
}