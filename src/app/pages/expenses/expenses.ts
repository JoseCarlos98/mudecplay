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
import { ExpenseService } from './services/expense.service';
import { DialogService } from '../../shared/services/dialog.service';
import { CatalogsService } from '../../shared/services/catalogs.service';
import { LocalStorageService } from '../../shared/services/local-storage.service';

// Interfaces
import { Catalog, PaginatedResponse } from '../../shared/interfaces/general-interfaces';
import * as entity from '../expenses/interfaces/expense-interfaces';

// Componentes propios
import { ExpenseModal } from './components/expense-modal/expense-modal';

// ==========================
//  CONSTANTES DEL MÓDULO
// ==========================

const EXPENSES_FILTERS_KEY = 'mp_expenses_filters_v1';

const COLUMNS_CONFIG: ColumnsConfig[] = [
  { key: 'internal_folio', label: 'Folio' },
  { key: 'products', label: 'Productos', type: 'showItems' },
  { key: 'date', label: 'Fecha', type: 'date' },
  { key: 'total_amount', label: 'Monto', type: 'money', align: 'right' },
  {
    key: 'supplier',
    label: 'Proveedor',
    type: 'relation',
    path: 'company_name',
    fallback: 'No asignado',
    fallbackVariant: 'chip-warning',
  },
];

const DISPLAYED_COLUMNS: string[] = [
  ...COLUMNS_CONFIG.map((c) => c.key),
  'actions',
];

const HEADER_CONFIG: ModuleHeaderConfig = {
  showNew: true,
  showUploadXml: true,
};

// Catálogo extra de estados “virtuales”
const STATUS_COMPLEMENTS: Catalog[] = [
  { id: 'missing_supplier', name: 'Sin proveedor' },
  { id: 'missing_project', name: 'Sin proyecto' },
];

@Component({
  selector: 'app-expenses',
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
  templateUrl: './expenses.html',
  styleUrl: './expenses.scss',
})
export class Expenses implements OnInit {
  // ==========================
  //  INYECCIONES
  // ==========================
  private readonly expenseService = inject(ExpenseService);
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

  catalogStatusExpense: Catalog[] = [];

  // ==========================
  //  ESTADO / DATA
  // ==========================
  // Filtros que van al backend
  filters: entity.FiltersExpenses = { page: 1, limit: 5 };
  expensesTableData!: PaginatedResponse<entity.ExpenseResponseDto>;

  // Form de filtros de la grilla (estado de la UI)
  formFilters = this.fb.group({
    dateRange: this.fb.control<DateRangeValue | null>(null),
    suppliersIds: this.fb.control<number[]>([]),
    projectIds: this.fb.control<number[]>([]),
    concept: this.fb.control<string>(''),
    status_id: this.fb.control<string | number>(1),
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
    this.catalogsService.statusExpenseCatalog().subscribe({
      next: (response: Catalog[]) => {
        this.catalogStatusExpense = [
          ...response,
          ...STATUS_COMPLEMENTS,
        ];
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
  private buildBackendFiltersFromUi(ui: entity.ExpensesUiFilters): entity.FiltersExpenses {
    return {
      page: ui.page,
      limit: ui.limit,
      startDate: ui.dateRange?.startDate ?? null,
      endDate: ui.dateRange?.endDate ?? null,
      suppliersIds: ui.suppliersIds ?? [],
      projectIds: ui.projectIds ?? [],
      status_id: ui.status_id ?? null,
      concept: ui.concept?.trim() || '',
    };
  }

  // ==========================
  //  FILTROS + BÚSQUEDA
  // ==========================
  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();

    // Estado completo de la UI (incluye página/limit)
    const uiState: entity.ExpensesUiFilters = {
      dateRange: value.dateRange ?? null,
      suppliersIds: value.suppliersIds ?? [],
      projectIds: value.projectIds ?? [],
      status_id: value.status_id ?? null,
      concept: value.concept?.trim() || '',
      page: 1,
      limit: this.filters.limit,
    };

    // Mapeamos a filtros de backend usando el helper
    this.filters = this.buildBackendFiltersFromUi(uiState);

    // Guardamos el estado de UI para persistir filtros
    this.saveFiltersToStorage(uiState);

    // Disparamos la carga
    this.loadExpenses();
  }

  loadExpenses(): void {
    this.expenseService.getExpenses(this.filters).subscribe({
      next: (response: PaginatedResponse<entity.ExpenseResponseDto>) => {
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
  onTableAction(ev: DataTableActionEvent<entity.ExpenseResponseDto>): void {
    switch (ev.type) {
      case 'edit':
        this.router.navigateByUrl(`/gastos/editar/${ev.row.id}`);
        break;

      case 'delete':
        this.onDelete(ev.row);
        break;

      case 'showItems':
        this.expenseModal(ev.row.items);
        break;
    }
  }

  // Confirmación + delete
  onDelete(expense: entity.ExpenseResponseDto): void {
    this.dialogService
      .confirm({
        message: `¿Quieres eliminar el gasto:\n"${expense.folio.trim()}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.expenseService.remove(expense.id).subscribe({
          next: () => this.loadExpenses(),
          error: (err) => console.error('Error al eliminar gasto:', err),
        });
      });
  }

  // ==========================
  //  ESTADO DE FILTROS (UI)
  // ==========================
  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();

    const hasDates = !!(form.dateRange?.startDate || form.dateRange?.endDate);
    const hasSuppliers = (form.suppliersIds?.length ?? 0) > 0;
    const hasProjects = (form.projectIds?.length ?? 0) > 0;
    const hasStatus = form.status_id !== '';
    const hasConcept = !!(form.concept && form.concept.trim() !== '');

    return hasDates || hasSuppliers || hasProjects || hasStatus || hasConcept;
  }

  clearAllAndSearch(): void {
    // Limpia formulario de filtros
    this.formFilters.reset(
      {
        dateRange: null,
        suppliersIds: [],
        projectIds: [],
        status_id: '',
        concept: '',
      },
      { emitEvent: false },
    );

    // Resetea filtros de backend
    this.filters = {
      page: 1,
      limit: this.filters.limit,
      startDate: null,
      endDate: null,
      suppliersIds: [],
      projectIds: [],
      status_id: null,
      concept: '',
    }

    // Limpia storage para este módulo
    this.storage.removeItem(EXPENSES_FILTERS_KEY);
    this.loadExpenses();
  }

  // ==========================
  //  MODAL DE ITEMS
  // ==========================
  expenseModal(expense?: entity.ExpenseItem[]): void {
    this.dialogService
      .open(ExpenseModal, expense ? expense : null, 'medium')
      .afterClosed()
      .subscribe((result) => {
        if (result) this.loadExpenses();
      });
  }

  // ==========================
  //  LOCAL STORAGE (FILTROS)
  // ==========================
  private restoreFiltersFromStorage(): void {
    const saved = this.storage.getItem<entity.ExpensesUiFilters>(EXPENSES_FILTERS_KEY);
    console.log('[DEBUG] restoreFiltersFromStorage()', saved);

    if (!saved) {
      // Primera vez: busca con los valores por defecto del form
      this.searchWithFilters();
      return;
    }

    // 1) Parchear formulario con lo guardado
    this.formFilters.patchValue(
      {
        dateRange: saved.dateRange,
        suppliersIds: saved.suppliersIds,
        projectIds: saved.projectIds,
        status_id: saved.status_id,
        concept: saved.concept,
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
  private saveFiltersToStorage(state?: entity.ExpensesUiFilters): void {
    if (!state) {
      const value = this.formFilters.getRawValue();

      state = {
        dateRange: value.dateRange ?? null,
        suppliersIds: value.suppliersIds ?? [],
        projectIds: value.projectIds ?? [],
        status_id: value.status_id ?? null,
        concept: value.concept?.trim() || '',
        page: this.filters.page,
        limit: this.filters.limit,
      };
    }

    this.storage.setItem(EXPENSES_FILTERS_KEY, state);
  }
}
