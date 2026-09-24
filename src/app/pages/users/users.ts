import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { finalize } from 'rxjs';

// UI
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
import { AuthService } from '../../auth/services/auth.service';

// Interfaces
import { PaginatedResponse } from '../../shared/interfaces/general-interfaces';
import * as entity from './interfaces/users-interfaces';
import { UsersService } from './services/user.service';
import { UserModal } from './components/user-modal/user-modal';

const USERS_FILTERS_KEY = 'mp_users_filters_v1';

const COLUMNS_CONFIG: ColumnsConfig[] = [
  {
    key: 'name',
    label: 'Nombre',
    sortable: true,
    sortKey: 'name',
  },
  {
    key: 'lastName',
    label: 'Apellido',
    sortable: true,
    sortKey: 'last_name',
  },
  {
    key: 'email',
    label: 'Correo',
    sortable: true,
    sortKey: 'email',
  },
  {
    key: 'roles',
    label: 'Roles',
    type: 'chip',
    typeVariant: 'chip-neutral',
  },
  {
    key: 'isActive',
    label: 'Activo',
    type: 'booleanConfirm',
    align: 'center',
    sortable: true,
    sortKey: 'is_active',
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
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    ModuleHeader,
    DataTable,
    BtnsSection,
    InputField,
    LoadingOverlay,
    MatPaginatorModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly dialogService = inject(DialogService);
  private readonly fb = inject(FormBuilder);
  private readonly storage = inject(LocalStorageService);
  private readonly auth = inject(AuthService);

  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;
  readonly headerConfig = HEADER_CONFIG;
  readonly loadingTable = signal(false);

  sorts: entity.UserSortItem[] = [];

  filters: entity.FiltersUsers = {
    page: 1,
    limit: 10,
    sorts: [],
  };

  usersTableData!: PaginatedResponse<entity.UserResponseDto>;

  formFilters = this.fb.group({
    name: this.fb.control<string>(''),
    email: this.fb.control<string>(''),
  });

  // Evita borrarte a ti mismo
  canDeleteRow = (row: entity.UserResponseDto) => {
    const meId = this.auth.currentUser()?.id;
    return row.id !== meId;
  };

  deleteTooltip = (row: entity.UserResponseDto) => {
    const meId = this.auth.currentUser()?.id;

    return row.id === meId
      ? 'No puedes eliminar tu propio usuario.'
      : null;
  };

  ngOnInit(): void {
    this.restoreFiltersFromStorage();
  }

  private buildBackendFiltersFromUi(
    ui: entity.UsersUiFilters,
  ): entity.FiltersUsers {
    return {
      page: ui.page,
      limit: ui.limit,
      name: ui.name?.trim() || '',
      email: ui.email?.trim() || '',
      sorts: [...(ui.sorts ?? [])],
    };
  }

  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();

    const uiState: entity.UsersUiFilters = {
      name: value.name?.trim() || '',
      email: value.email?.trim() || '',
      page: 1,
      limit: this.filters.limit,
      sorts: [...this.sorts],
    };

    this.filters = this.buildBackendFiltersFromUi(uiState);
    this.saveFiltersToStorage(uiState);
    this.loadUsers();
  }

  onSortChange(event: DataTableSortEvent): void {
    this.sorts = [...event.sorts];

    this.filters = {
      ...this.filters,
      page: 1,
      sorts: [...this.sorts],
    };

    this.saveFiltersToStorage();
    this.loadUsers();
  }

  loadUsers(): void {
    if (this.loadingTable()) return;

    this.loadingTable.set(true);

    this.usersService
      .getPaginated(this.filters)
      .pipe(finalize(() => this.loadingTable.set(false)))
      .subscribe({
        next: (res) => {
          this.usersTableData = res;
        },
        error: (err) =>
          console.error('Error al cargar usuarios:', err),
      });
  }

  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;

    this.saveFiltersToStorage();
    this.loadUsers();
  }

  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();

    const hasEmail = !!form.email?.trim();
    const hasName = !!form.name?.trim();
    const hasSort = this.sorts.length > 0;

    return hasEmail || hasName || hasSort;
  }

  clearAllAndSearch(): void {
    this.formFilters.reset(
      {
        name: '',
        email: '',
      },
      { emitEvent: false },
    );

    this.sorts = [];

    this.filters = {
      page: 1,
      limit: this.filters.limit,
      name: '',
      email: '',
      sorts: [],
    };

    this.storage.removeItem(USERS_FILTERS_KEY);
    this.loadUsers();
  }

  onHeaderAction(action: string): void {
    if (action === 'new') {
      this.openUserModal();
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
    ev: DataTableActionEvent<entity.UserResponseDto>,
  ): void {
    switch (ev.type) {
      case 'edit':
        this.openUserModal(ev.row);
        break;

      case 'delete':
        this.onDelete(ev.row);
        break;
    }
  }

  onDelete(row: entity.UserResponseDto): void {
    this.dialogService
      .confirm({
        message: `¿Quieres eliminar el usuario:\n"${row.email}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        size: 'mini',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.usersService.remove(row.id).subscribe({
          next: () => this.loadUsers(),
          error: (err) =>
            console.error('Error al eliminar usuario:', err),
        });
      });
  }

  openUserModal(
    user?: entity.UserResponseDto | null,
  ): void {
    this.dialogService
      .open(
        UserModal,
        user ?? null,
        'medium',
      )
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.loadUsers();
        }
      });
  }

  private restoreFiltersFromStorage(): void {
    const saved =
      this.storage.getItem<entity.UsersUiFilters>(
        USERS_FILTERS_KEY,
      );

    if (!saved) {
      this.sorts = [];
      this.searchWithFilters();
      return;
    }

    this.sorts = [...(saved.sorts ?? [])];

    const state: entity.UsersUiFilters = {
      name: saved.name ?? '',
      email: saved.email ?? '',
      page: saved.page ?? 1,
      limit: saved.limit ?? this.filters.limit,
      sorts: [...this.sorts],
    };

    this.formFilters.patchValue(
      {
        name: state.name,
        email: state.email,
      },
      { emitEvent: false },
    );

    this.filters = this.buildBackendFiltersFromUi(state);
    this.loadUsers();
  }

  private saveFiltersToStorage(
    state?: entity.UsersUiFilters,
  ): void {
    if (!state) {
      const value = this.formFilters.getRawValue();

      state = {
        name: value.name?.trim() || '',
        email: value.email?.trim() || '',
        page: this.filters.page,
        limit: this.filters.limit,
        sorts: [...this.sorts],
      };
    }

    this.storage.setItem(
      USERS_FILTERS_KEY,
      state,
    );
  }
}