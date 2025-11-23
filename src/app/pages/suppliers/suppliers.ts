import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
import { ColumnsConfig, DataTableActionEvent } from '../../shared/ui/data-table/interfaces/table-interfaces';
import { SearchMultiSelect } from '../../shared/ui/autocomplete-multiple/autocomplete-multiple';
import { DateRangeValue, InputDate } from '../../shared/ui/input-date/input-date';
import { InputField } from '../../shared/ui/input-field/input-field';
import { BtnsSection } from '../../shared/ui/btns-section/btns-section';
import { InputSelect } from '../../shared/ui/input-select/input-select';

// Servicios
import { DialogService } from '../../shared/services/dialog.service';
import { CatalogsService } from '../../shared/services/catalogs.service';
import { LocalStorageService } from '../../shared/services/local-storage.service';

// Interfaces
import { Catalog, PaginatedResponse } from '../../shared/interfaces/general-interfaces';
import * as entity from '../suppliers/interfaces/supplier-interfaces';
import { SupplierService } from './services/supplier.service';

// Componentes propios


// ==========================
//  CONSTANTES DEL MÓDULO
// ==========================

const EXPENSES_FILTERS_KEY = 'mp_supplier_filters_v1';

const COLUMNS_CONFIG: ColumnsConfig[] = [
  { key: 'company_name', label: 'Razon sócial' },
  { key: 'name', label: 'Nombre Comercial' },
  { key: 'contact_name', label: 'Nombre Contacto' },
  { key: 'phone', label: 'Telefono' },
  { key: 'email', label: 'Correo' },
  { key: 'days_credit', label: 'Dias Credito' },
  { key: 'will_invoice', label: 'Factura' },
  { key: 'area', label: 'Area', type: 'relation', path: 'name'},
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
export class Suppliers {
  // ==========================
  //  INYECCIONES
  // ==========================
  private readonly supplierService = inject(SupplierService);
  private readonly dialogService = inject(DialogService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly storage = inject(LocalStorageService);

  // ==========================
  //  CONFIG UI
  // ==========================
  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;
  readonly headerConfig = HEADER_CONFIG;

  catalogAreaSuppliers: Catalog[] = [];

  // ==========================
  //  ESTADO / DATA
  // ==========================
  // Filtros que van al backend
  filters: entity.FiltersSupplier = { page: 1, limit: 5 };
  expensesTableData!: PaginatedResponse<entity.SupplierResponseDto>;

  // Form de filtros de la grilla (estado de la UI)
  formFilters = this.fb.group({
    suppliersIds: this.fb.control<number[]>([]),
    areasIds: this.fb.control<number[]>([]),
    email: this.fb.control<string>(''),
    phone: this.fb.control<string>(''),
    // area_id: this.fb.control<string | number>([]),
  });


  // ==========================
  //  CICLO DE VIDA
  // ==========================
  ngOnInit(): void {
    this.restoreFiltersFromStorage(); // reconstruye filtros + carga tabla
    this.loadCatalogs();              // carga catálogos de selects
  }

  // ==========================
  //  CARGA DE CATÁLOGOS
  // ==========================
  loadCatalogs(): void {
    this.catalogsService.areaSuppliersCatalog().subscribe({
      next: (response: Catalog[]) => {
        this.catalogAreaSuppliers = response;
      },
      error: (err) => console.error('Error al cargar estados de gasto:', err),
    });
  }


  // ==========================
  //  HELPER: UI → FILTROS BACKEND
  // ==========================
  /**
   * Recibe el estado de la UI (form + paginación)
   * y devuelve el objeto de filtros que espera el backend.
   */
  private buildBackendFiltersFromUi(ui: entity.SupplierUiFilters): entity.FiltersSupplier {
    return {
      page: ui.page,
      limit: ui.limit,
      suppliersIds: ui.suppliersIds ?? [],
      areasIds: ui.areasIds ?? null,
      email: ui.email?.trim() || '', 
      phone: ui.phone?.trim() || '', 
    };
  }

  // ==========================
  //  FILTROS + BÚSQUEDA
  // ==========================
  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();

    // Estado completo de la UI (incluye página/limit)
    const uiState: entity.SupplierUiFilters = {
      suppliersIds: value.suppliersIds ?? [],
      areasIds: value.areasIds ?? [],
      email: value.email?.trim() || '',
      phone: value.phone?.trim() || '',
      page: 1,
      limit: this.filters.limit,
    };

    console.log(uiState);
    
    // Mapeamos a filtros de backend usando el helper
    this.filters = this.buildBackendFiltersFromUi(uiState);

    // Guardamos el estado de UI para persistir filtros
    this.saveFiltersToStorage(uiState);

    // Disparamos la carga
    this.loadExpenses();
  }


  loadExpenses(): void {
    this.supplierService.getSuppliers(this.filters).subscribe({
      next: (response: PaginatedResponse<entity.SupplierResponseDto>) => {
        this.expensesTableData = response;
      },
      error: (err) => console.error('Error al cargar gastos:', err),
    });
  }

  // ==========================
  //  PAGINACIÓN
  // ==========================
  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;

    // Actualizamos solo page/limit en storage con el estado actual del form
    this.saveFiltersToStorage();
    this.loadExpenses();
  }

  // ==========================
  //  ACCIONES HEADER
  // ==========================
  onHeaderAction(action: string): void {
    switch (action) {
      case 'new':
        this.router.navigateByUrl('/gastos/nuevo');
        break;
      case 'upload':
        console.log('upload');
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
    }
  }

  // ==========================
  //  ACCIONES TABLA
  // ==========================
  onTableAction(ev: DataTableActionEvent<entity.SupplierResponseDto>): void {
    switch (ev.type) {
      case 'edit':
        this.router.navigateByUrl(`/gastos/editar/${ev.row.id}`);
        break;

      case 'delete':
        this.onDelete(ev.row);
        break;
    }
  }

  // Confirmación + delete
  onDelete(expense: entity.SupplierResponseDto): void {
    this.dialogService
      .confirm({
        // message: `¿Quieres eliminar el gasto:\n"${expense.folio.trim()}"?`,
        message: `¿Quieres eliminar el gasto:\n""?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        // this.expenseService.remove(expense.id).subscribe({
        //   next: () => this.loadExpenses(),
        //   error: (err) => console.error('Error al eliminar gasto:', err),
        // });
      });
  }

  // ==========================
  //  ESTADO DE FILTROS (UI)
  // ==========================
  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();

    const hasSuppliers = (form.suppliersIds?.length ?? 0) > 0;
    const hasAreas = (form.suppliersIds?.length ?? 0) > 0;
    const hasEmail = !!(form.email && form.email.trim() !== '');

    return hasSuppliers || hasAreas || hasEmail;
  }

  clearAllAndSearch(): void {
    // Limpia formulario de filtros
    this.formFilters.reset(
      {
        suppliersIds: [],
        areasIds: [],
        email: '',
        phone: '',
      },
      { emitEvent: false },
    );

    // Resetea filtros de backend
    this.filters = {
      page: 1,
      limit: this.filters.limit,
      suppliersIds: [],
      areasIds: [],
      email: '',
      phone: '',
    }

    // Limpia storage para este módulo
    this.storage.removeItem(EXPENSES_FILTERS_KEY);
    this.loadExpenses();
  }

  // ==========================
  //  MODAL DE ITEMS
  // ==========================
  expenseModal(expense?: any): void {
    // this.dialogService
    //   .open(ExpenseModal, expense ? expense : null, 'medium')
    //   .afterClosed()
    //   .subscribe((result) => {
    //     if (result) this.loadExpenses();
    //   });
  }

  // ==========================
  //  LOCAL STORAGE (FILTROS)
  // ==========================
  private restoreFiltersFromStorage(): void {
    const saved = this.storage.getItem<entity.SupplierUiFilters>(EXPENSES_FILTERS_KEY);
    console.log('[DEBUG] restoreFiltersFromStorage()', saved);

    if (!saved) {
      // Primera vez: busca con los valores por defecto del form
      this.searchWithFilters();
      return;
    }

    // 1) Parchear formulario con lo guardado
    this.formFilters.patchValue(
      {
        suppliersIds: saved.suppliersIds,
        areasIds: saved.areasIds,
        email: saved.email,
        phone: saved.phone,
      },
      { emitEvent: false },
    );

    // 2) Reconstruir filtros de backend desde el estado de UI guardado
    this.filters = this.buildBackendFiltersFromUi(saved);

    // 3) Cargar tabla con esos filtros
    this.loadExpenses();
  }

  /**
   * Guarda el estado de filtros de la UI en localStorage.
   * - Si recibe `state`, guarda ese.
   * - Si no, reconstruye el estado a partir del form + this.filters.
   */
  private saveFiltersToStorage(state?: entity.SupplierUiFilters): void {
    if (!state) {
      const value = this.formFilters.getRawValue();

      state = {
        suppliersIds: value.suppliersIds ?? [],
        areasIds: value.areasIds ?? [],
        email: value.email?.trim() || '',
        phone: value.phone?.trim() || '',
        page: this.filters.page,
        limit: this.filters.limit,
      };
    }

    this.storage.setItem(EXPENSES_FILTERS_KEY, state);
  }
}
