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
import {
  Catalog,
  PaginatedResponse,
} from '../../shared/interfaces/general-interfaces';
import * as entity from '../clients/interfaces/clients-interfaces';

// Modal y service
import { ClientModal } from './components/client-modal/client-modal';
import { ClientsService } from './services/clients.service';

const EXPENSES_FILTERS_KEY = 'mp_clients_filters_v1';

const COLUMNS_CONFIG: ColumnsConfig[] = [
  {
    key: 'name',
    label: 'Nombre',
    sortable: true,
    sortKey: 'name',
  },
  {
    key: 'company_name',
    label: 'Razón Social',
    sortable: true,
    sortKey: 'company_name',
  },
  {
    key: 'responsible',
    label: 'Responsable',
    type: 'relation',
    path: 'name',
    fallback: 'No asignado',
    fallbackVariant: 'chip-warning',
    sortable: true,
    sortKey: 'responsible',
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
    label: 'Ubicación',
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
  // newRoles: ['ADMIN_GENERAL'],
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
  // INYECCIONES
  // ==========================

  private readonly clientsService = inject(ClientsService);
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
  sorts: entity.ClientSortItem[] = [];

  // ==========================
  // ESTADO / DATA
  // ==========================

  filters: entity.FiltersClients = {
    page: 1,
    limit: 5,
    sorts: [],
  };

  expensesTableData!: PaginatedResponse<entity.ClientsResponseDto>;

  formFilters = this.fb.group({
    responsibleIds: this.fb.control<number[]>([]),
    clientsIds: this.fb.control<number[]>([]),
    areasIds: this.fb.control<number[]>([]),
    email: this.fb.control<string>(''),
    phone: this.fb.control<string>(''),
    name: this.fb.control<string>(''),
  });

  // ==========================
  // CICLO DE VIDA
  // ==========================

  ngOnInit(): void {
    this.restoreFiltersFromStorage();
    this.loadCatalogs();
  }

  // ==========================
  // CATÁLOGOS
  // ==========================

  loadCatalogs(): void {
    this.catalogsService.areasSuppliersCatalog().subscribe({
      next: (response: Catalog[]) => {
        this.catalogAreaSuppliers = response;
      },
      error: (err) =>
        console.error('Error al cargar estados de gasto:', err),
    });
  }

  // ==========================
  // UI -> FILTROS BACKEND
  // ==========================

  private buildBackendFiltersFromUi(
    ui: entity.ClientsUiFilters,
  ): entity.FiltersClients {
    return {
      page: ui.page,
      limit: ui.limit,
      responsibleIds: ui.responsibleIds ?? [],
      name: ui.name?.trim() || '',
      email: ui.email?.trim() || '',
      phone: ui.phone?.trim() || '',
      sorts: [...(ui.sorts ?? [])],
    };
  }

  // ==========================
  // FILTROS + BÚSQUEDA
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
      sorts: [...this.sorts],
    };

    this.filters = this.buildBackendFiltersFromUi(uiState);
    this.saveFiltersToStorage(uiState);
    this.loadClients();
  }

  // ==========================
  // SORTING
  // ==========================

  onSortChange(event: DataTableSortEvent): void {
    this.sorts = [...event.sorts];

    this.filters = {
      ...this.filters,
      page: 1,
      sorts: [...this.sorts],
    };

    this.saveFiltersToStorage();
    this.loadClients();
  }

  // ==========================
  // CARGAR CLIENTES
  // ==========================

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
        error: (err) =>
          console.error('Error al cargar clientes:', err),
      });
  }

  // ==========================
  // PAGINACIÓN
  // ==========================

  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;

    this.saveFiltersToStorage();
    this.loadClients();
  }

  // ==========================
  // HEADER
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
  // BOTONES FILTROS
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
    ev: DataTableActionEvent<entity.ClientsResponseDto>,
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

  onDelete(client: entity.ClientsResponseDto): void {
    this.dialogService
      .confirm({
        message: `¿Quieres eliminar el cliente:\n"${client?.company_name?.trim()}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        size: 'mini',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.clientsService.remove(client.id).subscribe({
          next: () => this.loadClients(),
          error: (err) =>
            console.error('Error al eliminar cliente:', err),
        });
      });
  }

  // ==========================
  // FILTROS ACTIVOS
  // ==========================

  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();

    const hasResponsible = (form.responsibleIds?.length ?? 0) > 0;
    const hasName = !!form.name?.trim();
    const hasEmail = !!form.email?.trim();
    const hasPhone = !!form.phone?.trim();
    const hasSort = this.sorts.length > 0;

    return (
      hasResponsible ||
      hasName ||
      hasEmail ||
      hasPhone ||
      hasSort
    );
  }

  // ==========================
  // LIMPIAR
  // ==========================

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

    this.sorts = [];

    this.filters = {
      page: 1,
      limit: this.filters.limit,
      responsibleIds: [],
      name: '',
      email: '',
      phone: '',
      sorts: [],
    };

    this.storage.removeItem(EXPENSES_FILTERS_KEY);
    this.loadClients();
  }

  // ==========================
  // MODAL
  // ==========================

  supplierModal(client?: entity.ClientsResponseDto): void {
    this.dialogService
      .open(
        ClientModal,
        client ? client : null,
        'medium',
      )
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.loadClients();
        }
      });
  }

  // ==========================
  // LOCAL STORAGE
  // ==========================

  private restoreFiltersFromStorage(): void {
    const saved =
      this.storage.getItem<entity.ClientsUiFilters>(
        EXPENSES_FILTERS_KEY,
      );

    if (!saved) {
      this.sorts = [];
      this.searchWithFilters();
      return;
    }

    this.sorts = [...(saved.sorts ?? [])];

    const state: entity.ClientsUiFilters = {
      responsibleIds: saved.responsibleIds ?? [],
      name: saved.name ?? '',
      email: saved.email ?? '',
      phone: saved.phone ?? '',
      page: saved.page ?? 1,
      limit: saved.limit ?? this.filters.limit,
      sorts: [...this.sorts],
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

  private saveFiltersToStorage(
    state?: entity.ClientsUiFilters,
  ): void {
    if (!state) {
      const value = this.formFilters.getRawValue();

      state = {
        responsibleIds: value.responsibleIds ?? [],
        email: value.email?.trim() || '',
        name: value.name?.trim() || '',
        phone: value.phone?.trim() || '',
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