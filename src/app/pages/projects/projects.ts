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
import {
  Catalog,
  PaginatedResponse,
} from '../../shared/interfaces/general-interfaces';
import * as entity from '../projects/interfaces/project-interfaces';
import { ProjectService } from './services/projects.service';
import { ProjectModal } from './components/project-modal/project-modal';

const PROJECTS_FILTERS_KEY = 'mp_projects_filters_v1';

const COLUMNS_CONFIG: ColumnsConfig[] = [
  {
    key: 'name',
    label: 'Proyecto',
    sortable: true,
    sortKey: 'name',
  },
  {
    key: 'client',
    label: 'Cliente',
    type: 'relation',
    fallback: 'No asignado',
    fallbackVariant: 'chip-warning',
    sortable: true,
    sortKey: 'client',
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
    key: 'responsible',
    label: 'Responsable',
    type: 'relation',
    fallback: 'No asignado',
    fallbackVariant: 'chip-warning',
    sortable: true,
    sortKey: 'responsible',
  },
  {
    key: 'contact_name',
    label: 'Contacto',
    sortable: true,
    sortKey: 'contact_name',
  },
  {
    key: 'location',
    label: 'Ubicación',
    sortable: true,
    sortKey: 'location',
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
    key: 'charge_amount',
    label: 'Monto de cargo',
    type: 'money',
    sortable: true,
    sortKey: 'charge_amount',
  },
  {
    key: 'days_credit',
    label: 'Crédito (días)',
    sortable: true,
    sortKey: 'days_credit',
  },
  {
    key: 'statusProject',
    label: '¿Abierto?',
    type: 'booleanConfirm',
    align: 'center',
    sortable: true,
    sortKey: 'status_project',
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

const PAYMENT_STATUS_OPTIONS: Catalog[] = [
  { id: 'open', name: 'Abierto' },
  { id: 'close', name: 'Cerrado' },
];

type ProjectStatus = 'open' | 'close';
type ProjectStatusOrNull = ProjectStatus | null;

@Component({
  selector: 'app-projects',
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
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
})
export class Projects implements OnInit {
  // ==========================
  // INYECCIONES
  // ==========================

  private readonly projectService = inject(ProjectService);
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
  readonly statusProjectOptions = PAYMENT_STATUS_OPTIONS;

  sorts: entity.ProjectSortItem[] = [];

  // ==========================
  // ESTADO / DATA
  // ==========================

  filters: entity.FiltersProject = {
    page: 1,
    limit: 5,
    sorts: [],
  };

  expensesTableData!: PaginatedResponse<entity.ProjectResponseDto>;

  formFilters = this.fb.group({
    clientsIds: this.fb.control<number[]>([]),
    responsibleIds: this.fb.control<number[]>([]),
    email: this.fb.control<string>(''),
    name: this.fb.control<string>(''),
    phone: this.fb.control<string>(''),
    statusProject: this.fb.control<ProjectStatusOrNull>(null),
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
    ui: entity.ProjectUiFilters,
  ): entity.FiltersProject {
    const filters: entity.FiltersProject = {
      page: ui.page,
      limit: ui.limit,
      clientsIds: ui.clientsIds ?? [],
      responsibleIds: ui.responsibleIds ?? [],
      email: ui.email?.trim() || '',
      name: ui.name?.trim() || '',
      phone: ui.phone?.trim() || '',
      sorts: [...(ui.sorts ?? [])],
    };

    if (ui.statusProject) {
      filters.statusProject = ui.statusProject;
    }

    return filters;
  }

  // ==========================
  // FILTROS + BÚSQUEDA
  // ==========================

  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();

    const uiState: entity.ProjectUiFilters = {
      clientsIds: value.clientsIds ?? [],
      responsibleIds: value.responsibleIds ?? [],
      email: value.email?.trim() || '',
      name: value.name?.trim() || '',
      phone: value.phone?.trim() || '',
      statusProject: value.statusProject ?? null,
      page: 1,
      limit: this.filters.limit,
      sorts: [...this.sorts],
    };

    this.filters = this.buildBackendFiltersFromUi(uiState);
    this.saveFiltersToStorage(uiState);
    this.loadProject();
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
    this.loadProject();
  }

  // ==========================
  // CARGAR PROYECTOS
  // ==========================

  loadProject(): void {
    if (this.loadingTable()) return;

    this.loadingTable.set(true);

    this.projectService
      .getProjects(this.filters)
      .pipe(finalize(() => this.loadingTable.set(false)))
      .subscribe({
        next: (response: PaginatedResponse<entity.ProjectResponseDto>) => {
          this.expensesTableData = response;
        },
        error: (err) =>
          console.error('Error al cargar proyectos:', err),
      });
  }

  // ==========================
  // PAGINACIÓN
  // ==========================

  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;

    this.saveFiltersToStorage();
    this.loadProject();
  }

  // ==========================
  // HEADER
  // ==========================

  onHeaderAction(action: string): void {
    switch (action) {
      case 'new':
        this.projectModal();
        break;

      case 'upload':
        console.log('upload');
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
    ev: DataTableActionEvent<entity.ProjectResponseDto>,
  ): void {
    switch (ev.type) {
      case 'edit':
        this.projectModal(ev.row);
        break;

      case 'delete':
        this.onDelete(ev.row);
        break;
    }
  }

  onDelete(project: entity.ProjectResponseDto): void {
    this.dialogService
      .confirm({
        message: `¿Quieres eliminar el proyecto:\n"${project.name?.trim()}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        size: 'mini',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.projectService.remove(project.id).subscribe({
          next: () => this.loadProject(),
          error: (err) =>
            console.error('Error al eliminar proyecto:', err),
        });
      });
  }

  // ==========================
  // FILTROS ACTIVOS
  // ==========================

  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();

    const hasClients = (form.clientsIds?.length ?? 0) > 0;
    const hasResponsible = (form.responsibleIds?.length ?? 0) > 0;
    const hasEmail = !!form.email?.trim();
    const hasPhone = !!form.phone?.trim();
    const hasName = !!form.name?.trim();
    const hasStatus = form.statusProject !== null;
    const hasSort = this.sorts.length > 0;

    return (
      hasClients ||
      hasResponsible ||
      hasEmail ||
      hasPhone ||
      hasName ||
      hasStatus ||
      hasSort
    );
  }

  // ==========================
  // LIMPIAR
  // ==========================

  clearAllAndSearch(): void {
    this.formFilters.reset(
      {
        clientsIds: [],
        responsibleIds: [],
        email: '',
        phone: '',
        name: '',
        statusProject: null,
      },
      { emitEvent: false },
    );

    this.sorts = [];

    this.filters = {
      page: 1,
      limit: this.filters.limit,
      clientsIds: [],
      responsibleIds: [],
      email: '',
      phone: '',
      name: '',
      sorts: [],
    };

    this.storage.removeItem(PROJECTS_FILTERS_KEY);
    this.loadProject();
  }

  // ==========================
  // MODAL
  // ==========================

  projectModal(project?: entity.ProjectResponseDto): void {
    this.dialogService
      .open(
        ProjectModal,
        project ? project : null,
        'medium',
      )
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.loadProject();
        }
      });
  }

  // ==========================
  // LOCAL STORAGE
  // ==========================

  private restoreFiltersFromStorage(): void {
    const saved =
      this.storage.getItem<entity.ProjectUiFilters>(
        PROJECTS_FILTERS_KEY,
      );

    if (!saved) {
      this.sorts = [];
      this.searchWithFilters();
      return;
    }

    this.sorts = [...(saved.sorts ?? [])];

    this.formFilters.patchValue(
      {
        clientsIds: saved.clientsIds ?? [],
        responsibleIds: saved.responsibleIds ?? [],
        name: saved.name ?? '',
        email: saved.email ?? '',
        phone: saved.phone ?? '',
        statusProject: saved.statusProject ?? null,
      },
      { emitEvent: false },
    );

    this.filters = this.buildBackendFiltersFromUi({
      ...saved,
      clientsIds: saved.clientsIds ?? [],
      responsibleIds: saved.responsibleIds ?? [],
      name: saved.name ?? '',
      email: saved.email ?? '',
      phone: saved.phone ?? '',
      statusProject: saved.statusProject ?? null,
      page: saved.page ?? 1,
      limit: saved.limit ?? this.filters.limit,
      sorts: [...this.sorts],
    });

    this.loadProject();
  }

  private saveFiltersToStorage(
    state?: entity.ProjectUiFilters,
  ): void {
    if (!state) {
      const value = this.formFilters.getRawValue();

      state = {
        clientsIds: value.clientsIds ?? [],
        responsibleIds: value.responsibleIds ?? [],
        email: value.email?.trim() || '',
        phone: value.phone?.trim() || '',
        name: value.name?.trim() || '',
        statusProject: value.statusProject ?? null,
        page: this.filters.page,
        limit: this.filters.limit,
        sorts: [...this.sorts],
      };
    }

    this.storage.setItem(
      PROJECTS_FILTERS_KEY,
      state,
    );
  }
}