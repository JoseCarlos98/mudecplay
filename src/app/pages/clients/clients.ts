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
import { ColumnsConfig, DataTableActionEvent } from '../../shared/ui/data-table/interfaces/table-interfaces';
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
import * as entity from '../clients/interfaces/clients-interfaces';
import { ClientModal } from './components/client-modal/client-modal';
import { ClientsService } from './services/clients.service';

// ==========================
//  CONSTANTES DEL MÓDULO
// ==========================

const EXPENSES_FILTERS_KEY = 'mp_clients_filters_v1';

const COLUMNS_CONFIG: ColumnsConfig[] = [
  { key: 'name', label: 'Nombre' },
  { key: 'company_name', label: 'Razón Social' },
  {
    key: 'responsible',
    label: 'Responsable',
    type: 'relation',
    path: 'name',
    fallback: 'No asignado',
    fallbackVariant: 'chip-warning',
  },
  { key: 'phone', label: 'Teléfono', type: 'phone' },
  { key: 'email', label: 'Correo' },
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
  // newRoles: ['ADMIN_GENERAL'], // por ahora solo admin crea clientes
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
  templateUrl: './clients.html',
  styleUrl: './clients.scss',
})
export class Clients implements OnInit {
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

  readonly loadingTable = signal(false);

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
  ngOnInit(): void {
    this.restoreFiltersFromStorage(); // reconstruye filtros + carga tabla
    this.loadCatalogs();              // carga catálogos de selects
  }

  // ==========================
  //  CARGA DE CATÁLOGOS
  // ==========================
  loadCatalogs(): void {
    this.catalogsService.areasSuppliersCatalog().subscribe({
      next: (response: Catalog[]) => {
        this.catalogAreaSuppliers = response;
      },
      error: (err) => console.error('Error al cargar estados de gasto:', err),
    });
  }

  // ==========================
  //  HELPER: UI → FILTROS BACKEND
  // ==========================
  private buildBackendFiltersFromUi(ui: entity.ClientsUiFilters): entity.FiltersClients {
    return {
      page: ui.page,
      limit: ui.limit,
      responsibleIds: ui.responsibleIds ?? [],
      name: ui.name?.trim() || '',
      email: ui.email?.trim() || '',
      phone: ui.phone?.trim() || '',
    };
  }

  // ==========================
  //  FILTROS + BÚSQUEDA
  // ==========================
  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();

    const uiState: entity.ClientsUiFilters = {
      responsibleIds: value.responsibleIds ?? [],
      email: value.email?.trim() || '',
      phone: value.phone?.trim() || '',
      name: value.name?.trim() || '',
      page: 1,
      limit: this.filters.limit,
    };

    this.filters = this.buildBackendFiltersFromUi(uiState);
    this.saveFiltersToStorage(uiState);
    this.loadClients();
  }

  loadClients(): void {
    if (this.loadingTable()) return;

    this.loadingTable.set(true);

    this.clientsService
      .getClients(this.filters)
      .pipe(finalize(() => this.loadingTable.set(false)))
      .subscribe({
        next: (response: PaginatedResponse<entity.ClientsResponseDto>) => {
          this.expensesTableData = response;
        },
        error: (err) => console.error('Error al cargar clientes:', err),
      });
  }

  // ==========================
  //  PAGINACIÓN
  // ==========================
  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;

    this.saveFiltersToStorage();
    this.loadClients();
  }

  // ==========================
  //  ACCIONES HEADER
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
  onTableAction(ev: DataTableActionEvent<entity.ClientsResponseDto>): void {
    switch (ev.type) {
      case 'edit':
        this.supplierModal(ev.row);
        break;

      case 'delete':
        this.onDelete(ev.row);
        break;
    }
  }

  onDelete(supplier: entity.ClientsResponseDto): void {
    this.dialogService
      .confirm({
        message: `¿Quieres eliminar el cliente:\n"${supplier?.company_name?.trim()}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        size: 'mini',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.clientsService.remove(supplier.id).subscribe({
          next: () => this.loadClients(),
          error: (err) => console.error('Error al eliminar cliente:', err),
        });
      });
  }

  // ==========================
  //  ESTADO DE FILTROS (UI)
  // ==========================
  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();

    const hasResponsible = (form.responsibleIds?.length ?? 0) > 0;
    const hasName = (form.name?.trim() ?? '') !== '';
    const hasEmail = (form.email?.trim() ?? '') !== '';
    const hasPhone = (form.phone?.trim() ?? '') !== '';

    return hasResponsible || hasName || hasEmail || hasPhone;
  }

  clearAllAndSearch(): void {
    this.formFilters.reset(
      {
        responsibleIds: [],
        name: '',
        email: '',
        phone: '',
        clientsIds: [],
        areasIds: [],
      },
      { emitEvent: false },
    );

    this.filters = {
      page: 1,
      limit: this.filters.limit,
      responsibleIds: [],
      name: '',
      email: '',
      phone: '',
    };

    this.storage.removeItem(EXPENSES_FILTERS_KEY);
    this.loadClients();
  }

  // ==========================
  //  MODAL DE ITEMS
  // ==========================
  supplierModal(supplier?: entity.ClientsResponseDto): void {
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
  private restoreFiltersFromStorage(): void {
    const saved = this.storage.getItem<entity.ClientsUiFilters>(EXPENSES_FILTERS_KEY);

    if (!saved) {
      this.searchWithFilters();
      return;
    }

    const state: entity.ClientsUiFilters = {
      responsibleIds: saved.responsibleIds ?? [],
      name: saved.name ?? '',
      email: saved.email ?? '',
      phone: saved.phone ?? '',
      page: saved.page ?? 1,
      limit: saved.limit ?? this.filters.limit,
    };

    this.formFilters.patchValue(
      {
        responsibleIds: state.responsibleIds,
        name: state.name,
        email: state.email,
        phone: state.phone,
      },
      { emitEvent: false },
    );

    this.filters = this.buildBackendFiltersFromUi(state);
    this.loadClients();
  }

  private saveFiltersToStorage(state?: entity.ClientsUiFilters): void {
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