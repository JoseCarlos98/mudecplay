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
import * as entity from '../clients/interfaces/clients-interfaces';
import { SupplierService } from '../suppliers/services/supplier.service';
import { ClientModal } from './components/client-modal/client-modal';
import { ClientsService } from './services/clients.service';

// ==========================
//  CONSTANTES DEL MÓDULO
// ==========================

const EXPENSES_FILTERS_KEY = 'mp_clients_filters_v1';

const COLUMNS_CONFIG: ColumnsConfig[] = [
  { key: 'name', label: 'Nombre' },
  { key: 'company_name', label: 'Cliente' },
  {
    key: 'responsible',
    label: 'Responsable',
    type: 'relation',
    path: 'name',
    fallback: 'No asignado',
    fallbackVariant: 'chip-warning',
  },
  {
    key: 'phone',
    label: 'Teléfono',
    type: 'phone',
  },
  { key: 'email', label: 'Correo Electrónico' },
  { key: 'address', label: 'Ubicación' },
  { key: 'days_credit', label: 'Crédito (días)' },
  {
    key: 'will_invoice',
    label: '¿Factura?',
    type: 'booleanConfirm',
    align: 'center',
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
  selector: 'app-clients',
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
  templateUrl: './clients.html',
  styleUrl: './clients.scss',
})
export class Clients {
  // ==========================
  //  INYECCIONES
  // ==========================
  private readonly clientsService = inject(ClientsService);
  private readonly dialogService = inject(DialogService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly fb = inject(FormBuilder);
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
  filters: entity.FiltersClients = { page: 1, limit: 5 };
  expensesTableData!: PaginatedResponse<entity.ClientsResponseDto>;

  // Form de filtros de la grilla (estado de la UI)
  formFilters = this.fb.group({
    responsibleIds: this.fb.control<number[]>([]),
    clientsIds: this.fb.control<number[]>([]),
    areasIds: this.fb.control<number[]>([]),
    email: this.fb.control<string>(''),
    phone: this.fb.control<string>(''),
    name: this.fb.control<string>(''),
  });


  // ==========================
  //  CICLO DE VIDA
  // ==========================
  ngOnInit() {
    this.restoreFiltersFromStorage(); // reconstruye filtros + carga tabla
    this.loadCatalogs();              // carga catálogos de selects
  }

  // ==========================
  //  CARGA DE CATÁLOGOS
  // ==========================
  loadCatalogs() {
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
  private buildBackendFiltersFromUi(ui: entity.ClientsUiFilters): entity.FiltersClients {
    return {
      page: ui.page,
      limit: ui.limit,
      responsibleIds: ui.responsibleIds ?? [],
      name: ui.name ?? null,
      email: ui.email?.trim() || '',
      phone: ui.phone?.trim() || '',
    };
  }

  // ==========================
  //  FILTROS + BÚSQUEDA
  // ==========================
  searchWithFilters() {
    const value = this.formFilters.getRawValue();

    // Estado completo de la UI (incluye página/limit)
    const uiState: entity.ClientsUiFilters = {
      responsibleIds: value.responsibleIds ?? [],
      email: value.email?.trim() || '',
      phone: value.phone?.trim() || '',
      name: value.name?.trim() || '',
      page: 1,
      limit: this.filters.limit,
    };

    // Mapeamos a filtros de backend usando el helper
    this.filters = this.buildBackendFiltersFromUi(uiState);

    // Guardamos el estado de UI para persistir filtros
    this.saveFiltersToStorage(uiState);

    // Disparamos la carga
    this.loadClients();
  }


  loadClients() {
    this.clientsService.getClients(this.filters).subscribe({
      next: (response: PaginatedResponse<entity.ClientsResponseDto>) => {
        this.expensesTableData = response;
      },
      error: (err) => console.error('Error al cargar gastos:', err),
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
    this.loadClients();
  }

  // ==========================
  //  ACCIONES HEADER
  // ==========================
  onHeaderAction(action: string) {
    switch (action) {
      case 'new':
        this.supplierModal();
        break;
      case 'upload':
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
  onTableAction(ev: DataTableActionEvent<entity.ClientsResponseDto>) {
    switch (ev.type) {
      case 'edit':
        this.supplierModal(ev.row)
        break;
      case 'delete':
        this.onDelete(ev.row);
        break;
    }
  }

  onDelete(supplier: entity.ClientsResponseDto) {
    this.dialogService
      .confirm({
        message: `¿Quieres eliminar el gasto:\n"${supplier.company_name.trim()}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.clientsService.remove(supplier.id).subscribe({
          next: () => this.loadClients(),
          error: (err) => console.error('Error al eliminar gasto:', err),
        });
      });
  }

  // ==========================
  //  ESTADO DE FILTROS (UI)
  // ==========================
  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();

    const hasSuppliers = (form.clientsIds?.length ?? 0) > 0;
    const hasAreas = (form.areasIds?.length ?? 0) > 0;
    const hasEmail = !!(form.email && form.email.trim() !== '');
    const hasPhone = !!(form.phone !== '');
    const hasName = !!(form.name !== '');

    return hasSuppliers || hasAreas || hasEmail || hasPhone || hasName;
  }

  clearAllAndSearch() {
    // Limpia formulario de filtros
    this.formFilters.reset(
      {
        clientsIds: [],
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
      responsibleIds: [],
      email: '',
      name: '',
      phone: '',
    }

    // Limpia storage para este módulo
    this.storage.removeItem(EXPENSES_FILTERS_KEY);
    this.loadClients();
  }

  // ==========================
  //  MODAL DE ITEMS
  // ==========================
  supplierModal(supplier?: any) {
    this.dialogService
      .open(ClientModal, supplier ? supplier : null, 'medium')
      .afterClosed()
      .subscribe((result) => {
        if (result) this.loadClients();
      });
  }

  // ==========================
  //  LOCAL STORAGE (FILTROS)
  // ==========================
  private restoreFiltersFromStorage() {
    const saved = this.storage.getItem<entity.ClientsUiFilters>(EXPENSES_FILTERS_KEY);

    if (!saved) {
      // Primera vez: busca con los valores por defecto del form
      this.searchWithFilters();
      return;
    }

    // 1) Parchear formulario con lo guardado
    this.formFilters.patchValue(
      {
        responsibleIds: saved.responsibleIds,
        email: saved.email,
        phone: saved.phone,
      },
      { emitEvent: false },
    );

    // 2) Reconstruir filtros de backend desde el estado de UI guardado
    this.filters = this.buildBackendFiltersFromUi(saved);

    // 3) Cargar tabla con esos filtros
    this.loadClients();
  }

  /**
   * Guarda el estado de filtros de la UI en localStorage.
   * - Si recibe `state`, guarda ese.
   * - Si no, reconstruye el estado a partir del form + this.filters.
   */
  private saveFiltersToStorage(state?: entity.ClientsUiFilters) {
    if (!state) {
      const value = this.formFilters.getRawValue();

      state = {
        responsibleIds: value.responsibleIds ?? [],
        email: value.email?.trim() || '',
        name: value.name?.trim() || '',
        phone: value.phone?.trim() || '',
        page: this.filters.page,
        limit: this.filters.limit,
      };
    }

    this.storage.setItem(EXPENSES_FILTERS_KEY, state);
  }
}
