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
import * as entity from '../responsible/interfaces/responsible-interfaces';

// Modal y service
import { ResponsibleModal } from './components/responsible-modal/responsible-modal';
import { ResponsibleService } from './services/responsible.service';

const RESPONSIBLE_FILTERS_KEY = 'mp_responsible_filters_v1';

const COLUMNS_CONFIG: ColumnsConfig[] = [
  {
    key: 'name',
    label: 'Nombre',
    sortable: true,
    sortKey: 'name',
  },
  {
    key: 'last_name',
    label: 'Apellido',
    sortable: true,
    sortKey: 'last_name',
  },
  {
    key: 'phone',
    label: 'Telefono',
    type: 'phone',
    sortable: true,
    sortKey: 'phone',
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
  selector: 'app-responsible',
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
  templateUrl: './responsible.html',
  styleUrl: './responsible.scss',
})
export class Responsible implements OnInit {
  private readonly responsibleService = inject(ResponsibleService);
  private readonly dialogService = inject(DialogService);
  private readonly fb = inject(FormBuilder);
  private readonly storage = inject(LocalStorageService);

  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;
  readonly headerConfig = HEADER_CONFIG;
  readonly loadingTable = signal(false);

  sorts: entity.ResponsibleSortItem[] = [];

  filters: entity.FiltersResponsible = {
    page: 1,
    limit: 5,
    sorts: [],
  };

  expensesTableData!: PaginatedResponse<entity.ResponsibleResponseDto>;

  formFilters = this.fb.group({
    phone: this.fb.control<string>(''),
    name: this.fb.control<string>(''),
  });

  ngOnInit(): void {
    this.restoreFiltersFromStorage();
  }

  private buildBackendFiltersFromUi(
    ui: entity.ResponsibleUiFilters,
  ): entity.FiltersResponsible {
    return {
      page: ui.page,
      limit: ui.limit,
      name: ui.name?.trim() || '',
      phone: ui.phone?.trim() || '',
      sorts: [...(ui.sorts ?? [])],
    };
  }

  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();

    const uiState: entity.ResponsibleUiFilters = {
      name: value.name?.trim() || '',
      phone: value.phone?.trim() || '',
      page: 1,
      limit: this.filters.limit,
      sorts: [...this.sorts],
    };

    this.filters = this.buildBackendFiltersFromUi(uiState);
    this.saveFiltersToStorage(uiState);
    this.loadClients();
  }

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

  loadClients(): void {
    if (this.loadingTable()) return;

    this.loadingTable.set(true);

    this.responsibleService
      .getResposible(this.filters)
      .pipe(finalize(() => this.loadingTable.set(false)))
      .subscribe({
        next: (response: PaginatedResponse<entity.ResponsibleResponseDto>) => {
          this.expensesTableData = response;
        },
        error: (err) =>
          console.error('Error al cargar responsables:', err),
      });
  }

  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;

    this.saveFiltersToStorage();
    this.loadClients();
  }

  onHeaderAction(action: string): void {
    switch (action) {
      case 'new':
        this.supplierModal();
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
    ev: DataTableActionEvent<entity.ResponsibleResponseDto>,
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

  onDelete(responsible: entity.ResponsibleResponseDto): void {
    this.dialogService
      .confirm({
        message: `¿Quieres eliminar el responsable:\n"${responsible.name.trim()}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        size: 'mini',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.responsibleService.remove(responsible.id).subscribe({
          next: () => this.loadClients(),
          error: (err) =>
            console.error('Error al eliminar responsable:', err),
        });
      });
  }

  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();

    const hasName = !!form.name?.trim();
    const hasPhone = !!form.phone?.trim();
    const hasSort = this.sorts.length > 0;

    return hasName || hasPhone || hasSort;
  }

  clearAllAndSearch(): void {
    this.formFilters.reset(
      {
        name: '',
        phone: '',
      },
      { emitEvent: false },
    );

    this.sorts = [];

    this.filters = {
      page: 1,
      limit: this.filters.limit,
      name: '',
      phone: '',
      sorts: [],
    };

    this.storage.removeItem(RESPONSIBLE_FILTERS_KEY);
    this.loadClients();
  }

  supplierModal(
    responsible?: entity.ResponsibleResponseDto,
  ): void {
    this.dialogService
      .open(
        ResponsibleModal,
        responsible ? responsible : null,
        'medium',
      )
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.loadClients();
        }
      });
  }

  private restoreFiltersFromStorage(): void {
    const saved =
      this.storage.getItem<entity.ResponsibleUiFilters>(
        RESPONSIBLE_FILTERS_KEY,
      );

    if (!saved) {
      this.sorts = [];
      this.searchWithFilters();
      return;
    }

    this.sorts = [...(saved.sorts ?? [])];

    const state: entity.ResponsibleUiFilters = {
      name: saved.name ?? '',
      phone: saved.phone ?? '',
      page: saved.page ?? 1,
      limit: saved.limit ?? this.filters.limit,
      sorts: [...this.sorts],
    };

    this.formFilters.patchValue(
      {
        name: state.name,
        phone: state.phone,
      },
      { emitEvent: false },
    );

    this.filters = this.buildBackendFiltersFromUi(state);
    this.loadClients();
  }

  private saveFiltersToStorage(
    state?: entity.ResponsibleUiFilters,
  ): void {
    if (!state) {
      const value = this.formFilters.getRawValue();

      state = {
        name: value.name?.trim() || '',
        phone: value.phone?.trim() || '',
        page: this.filters.page,
        limit: this.filters.limit,
        sorts: [...this.sorts],
      };
    }

    this.storage.setItem(
      RESPONSIBLE_FILTERS_KEY,
      state,
    );
  }
}