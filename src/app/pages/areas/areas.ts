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
import * as entity from './interfaces/area-interfaces';

// Modal y service
import { AreaModal } from './components/area-modal/area-modal';
import { AreasService } from './services/areas.service';

const AREA_FILTERS_KEY = 'mp_area_filters_v1';

const COLUMNS_CONFIG: ColumnsConfig[] = [
  {
    key: 'name',
    label: 'Nombre',
    sortable: true,
    sortKey: 'name',
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
  selector: 'app-areas',
  imports: [
    CommonModule,
    ModuleHeader,
    DataTable,
    BtnsSection,
    InputField,
    LoadingOverlay,

    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTableModule,
    MatButtonModule,

    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './areas.html',
  styleUrl: './areas.scss',
})
export class Areas implements OnInit {
  private readonly areasService = inject(AreasService);
  private readonly dialogService = inject(DialogService);
  private readonly fb = inject(FormBuilder);
  private readonly storage = inject(LocalStorageService);

  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;
  readonly headerConfig = HEADER_CONFIG;
  readonly loadingTable = signal(false);

  sorts: entity.AreaSortItem[] = [];

  filters: entity.FiltersArea = {
    page: 1,
    limit: 5,
    sorts: [],
  };

  areasTableData!: PaginatedResponse<entity.AreaResponseDto>;

  formFilters = this.fb.group({
    name: this.fb.control<string>(''),
  });

  ngOnInit(): void {
    this.restoreFiltersFromStorage();
  }

  private buildBackendFiltersFromUi(
    ui: entity.AreaUiFilters,
  ): entity.FiltersArea {
    return {
      page: ui.page,
      limit: ui.limit,
      name: ui.name?.trim() || '',
      sorts: [...(ui.sorts ?? [])],
    };
  }

  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();

    const uiState: entity.AreaUiFilters = {
      name: value.name?.trim() || '',
      page: 1,
      limit: this.filters.limit,
      sorts: [...this.sorts],
    };

    this.filters = this.buildBackendFiltersFromUi(uiState);
    this.saveFiltersToStorage(uiState);
    this.loadAreas();
  }

  onSortChange(event: DataTableSortEvent): void {
    this.sorts = [...event.sorts];

    this.filters = {
      ...this.filters,
      page: 1,
      sorts: [...this.sorts],
    };

    this.saveFiltersToStorage();
    this.loadAreas();
  }

  loadAreas(): void {
    if (this.loadingTable()) return;

    this.loadingTable.set(true);

    this.areasService
      .getAreas(this.filters)
      .pipe(finalize(() => this.loadingTable.set(false)))
      .subscribe({
        next: (response: PaginatedResponse<entity.AreaResponseDto>) => {
          this.areasTableData = response;
        },
        error: (err) =>
          console.error('Error al cargar áreas:', err),
      });
  }

  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;

    this.saveFiltersToStorage();
    this.loadAreas();
  }

  onHeaderAction(action: string): void {
    switch (action) {
      case 'new':
        this.areaModal();
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
    ev: DataTableActionEvent<entity.AreaResponseDto>,
  ): void {
    switch (ev.type) {
      case 'edit':
        this.areaModal(ev.row);
        break;

      case 'delete':
        this.onDelete(ev.row);
        break;
    }
  }

  onDelete(area: entity.AreaResponseDto): void {
    this.dialogService
      .confirm({
        message: `¿Quieres eliminar el área:\n"${area.name.trim()}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        size: 'mini',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.areasService.remove(area.id).subscribe({
          next: () => this.loadAreas(),
          error: (err) =>
            console.error('Error al eliminar área:', err),
        });
      });
  }

  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();

    return !!(
      form.name?.trim() ||
      this.sorts.length > 0
    );
  }

  clearAllAndSearch(): void {
    this.formFilters.reset(
      {
        name: '',
      },
      {
        emitEvent: false,
      },
    );

    this.sorts = [];

    this.filters = {
      page: 1,
      limit: this.filters.limit,
      name: '',
      sorts: [],
    };

    this.storage.removeItem(AREA_FILTERS_KEY);
    this.loadAreas();
  }

  areaModal(area?: entity.AreaResponseDto): void {
    this.dialogService
      .open(
        AreaModal,
        area ? area : null,
        'mini',
      )
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.loadAreas();
        }
      });
  }

  private restoreFiltersFromStorage(): void {
    const saved =
      this.storage.getItem<entity.AreaUiFilters>(
        AREA_FILTERS_KEY,
      );

    if (!saved) {
      this.sorts = [];
      this.searchWithFilters();
      return;
    }

    this.sorts = [...(saved.sorts ?? [])];

    this.formFilters.patchValue(
      {
        name: saved.name ?? '',
      },
      {
        emitEvent: false,
      },
    );

    this.filters = this.buildBackendFiltersFromUi({
      ...saved,
      name: saved.name ?? '',
      page: saved.page ?? 1,
      limit: saved.limit ?? this.filters.limit,
      sorts: [...this.sorts],
    });

    this.loadAreas();
  }

  private saveFiltersToStorage(
    state?: entity.AreaUiFilters,
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
      AREA_FILTERS_KEY,
      state,
    );
  }
}