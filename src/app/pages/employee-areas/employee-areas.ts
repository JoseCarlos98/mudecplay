import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';

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
} from '../../shared/ui/data-table/interfaces/table-interfaces';
import { InputField } from '../../shared/ui/input-field/input-field';
import { BtnsSection } from '../../shared/ui/btns-section/btns-section';

// Servicios
import { DialogService } from '../../shared/services/dialog.service';
import { LocalStorageService } from '../../shared/services/local-storage.service';

// Interfaces
import { PaginatedResponse } from '../../shared/interfaces/general-interfaces';
import * as entity from './interfaces/employee-area-interfaces';

// Modal y service
import { EmployeeAreaModal } from './components/employee-area-modal/employee-area-modal';
import { EmployeeAreasService } from './services/employee-areas.service';

// ==========================
//  CONSTANTES DEL MÓDULO
// ==========================
const EMPLOYEE_AREA_FILTERS_KEY = 'mp_employee_area_filters_v1';

const COLUMNS_CONFIG: ColumnsConfig[] = [
  { key: 'name', label: 'Nombre' },
];

const DISPLAYED_COLUMNS: string[] = [
  ...COLUMNS_CONFIG.map((c) => c.key),
  'actions',
];

const HEADER_CONFIG: ModuleHeaderConfig = {
  showNew: true,
};

@Component({
  selector: 'app-employee-areas',
  imports: [
    CommonModule,
    ModuleHeader,
    DataTable,
    BtnsSection,
    InputField,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTableModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './employee-areas.html',
  styleUrl: './employee-areas.scss',
})
export class EmployeeAreas implements OnInit {
  private readonly employeeAreasService = inject(EmployeeAreasService);
  private readonly dialogService = inject(DialogService);
  private readonly fb = inject(FormBuilder);
  private readonly storage = inject(LocalStorageService);

  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;
  readonly headerConfig = HEADER_CONFIG;

  filters: entity.FiltersEmployeeArea = { page: 1, limit: 5 };
  employeeAreasTableData!: PaginatedResponse<entity.EmployeeAreaResponseDto>;

  formFilters = this.fb.group({
    name: this.fb.control<string>(''),
  });

  ngOnInit(): void {
    this.restoreFiltersFromStorage();
  }

  private buildBackendFiltersFromUi(
    ui: entity.EmployeeAreaUiFilters,
  ): entity.FiltersEmployeeArea {
    return {
      page: ui.page,
      limit: ui.limit,
      name: ui.name?.trim() || '',
    };
  }

  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();

    const uiState: entity.EmployeeAreaUiFilters = {
      name: value.name?.trim() || '',
      page: 1,
      limit: this.filters.limit,
    };

    this.filters = this.buildBackendFiltersFromUi(uiState);
    this.saveFiltersToStorage(uiState);
    this.loadEmployeeAreas();
  }

  loadEmployeeAreas(): void {
    this.employeeAreasService.getEmployeeAreas(this.filters).subscribe({
      next: (response: PaginatedResponse<entity.EmployeeAreaResponseDto>) => {
        this.employeeAreasTableData = response;
      },
      error: (err) => console.error('Error al cargar áreas de empleado:', err),
    });
  }

  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;

    this.saveFiltersToStorage();
    this.loadEmployeeAreas();
  }

  onHeaderAction(action: string): void {
    switch (action) {
      case 'new':
        this.employeeAreaModal();
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

  onTableAction(ev: DataTableActionEvent<entity.EmployeeAreaResponseDto>): void {
    switch (ev.type) {
      case 'edit':
        this.employeeAreaModal(ev.row);
        break;
      case 'delete':
        this.onDelete(ev.row);
        break;
    }
  }

  onDelete(employeeArea: entity.EmployeeAreaResponseDto): void {
    this.dialogService
      .confirm({
        message: `¿Quieres eliminar el área de empleado:\n"${employeeArea.name.trim()}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        size: 'mini',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.employeeAreasService.remove(employeeArea.id).subscribe({
          next: () => this.loadEmployeeAreas(),
          error: (err) => console.error('Error al eliminar área de empleado:', err),
        });
      });
  }

  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();
    return !!form.name?.trim();
  }

  clearAllAndSearch(): void {
    this.formFilters.reset(
      {
        name: '',
      },
      { emitEvent: false },
    );

    this.filters = {
      page: 1,
      limit: this.filters.limit,
      name: '',
    };

    this.storage.removeItem(EMPLOYEE_AREA_FILTERS_KEY);
    this.loadEmployeeAreas();
  }

  employeeAreaModal(employeeArea?: entity.EmployeeAreaResponseDto): void {
    this.dialogService
      .open(EmployeeAreaModal, employeeArea ? employeeArea : null, 'mini')
      .afterClosed()
      .subscribe((result) => {
        if (result) this.loadEmployeeAreas();
      });
  }

  private restoreFiltersFromStorage(): void {
    const saved = this.storage.getItem<entity.EmployeeAreaUiFilters>(
      EMPLOYEE_AREA_FILTERS_KEY,
    );

    if (!saved) {
      this.searchWithFilters();
      return;
    }

    this.formFilters.patchValue(
      {
        name: saved.name,
      },
      { emitEvent: false },
    );

    this.filters = this.buildBackendFiltersFromUi(saved);
    this.loadEmployeeAreas();
  }

  private saveFiltersToStorage(state?: entity.EmployeeAreaUiFilters): void {
    if (!state) {
      const value = this.formFilters.getRawValue();

      state = {
        name: value.name?.trim() || '',
        page: this.filters.page,
        limit: this.filters.limit,
      };
    }

    this.storage.setItem(EMPLOYEE_AREA_FILTERS_KEY, state);
  }
}