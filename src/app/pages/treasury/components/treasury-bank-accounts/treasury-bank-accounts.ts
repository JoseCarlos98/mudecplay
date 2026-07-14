import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

// UI compartidos
import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { DataTable } from '../../../../shared/ui/data-table/data-table';
import {
  ColumnsConfig,
  ColumnVariant,
  DataTableActionEvent,
  DataTableActionPopover,
  DataTableExtraAction,
} from '../../../../shared/ui/data-table/interfaces/table-interfaces';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { InputSelect } from '../../../../shared/ui/input-select/input-select';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';
import { LoadingOverlay } from '../../../../shared/ui/loading-overlay/loading-overlay';

// Servicios
import { LocalStorageService } from '../../../../shared/services/local-storage.service';
import { TreasuryService } from '../../services/treasury.service';

// Interfaces
import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import * as entity from '../../interfaces/treasury.interfaces';
import { CatalogsService } from '../../../../shared/services/catalogs.service';

// =========================================================
// TESORERÍA: CUENTAS BANCARIAS - CONSTANTES
// =========================================================

const TREASURY_BANK_ACCOUNTS_FILTERS_KEY =
  'mp_treasury_bank_accounts_filters_v1';

const ACTIVE_STATUS_OPTIONS: Catalog[] = [
  { id: 'true', name: 'Activas' },
  { id: 'false', name: 'Inactivas' },
];

const COLUMNS_CONFIG: ColumnsConfig[] = [
  { key: 'company_name', label: 'Empresa' },
  { key: 'bank_name', label: 'Banco' },
  { key: 'account_identifier', label: 'Cuenta / Identificador' },
  { key: 'alias_display', label: 'Alias' },
  {
    key: 'currency',
    label: 'Moneda',
    type: 'chip',
    typeVariant: 'chip-neutral',
  },
  {
    key: 'is_active_label',
    label: 'Estatus',
    type: 'chip',
    variantResolver: (row: entity.TreasuryBankAccountTableRow) =>
      resolveBankAccountStatusVariant(row),
  },
  { key: 'created_at_date', label: 'Fecha de alta', type: 'date' },
];

function resolveBankAccountStatusVariant(
  row: entity.TreasuryBankAccountTableRow,
): ColumnVariant {
  return row.is_active ? 'chip-success' : 'chip-danger';
}

const DISPLAYED_COLUMNS: string[] = [
  ...COLUMNS_CONFIG.map((column) => column.key),
  'actions',
];

const HEADER_CONFIG: ModuleHeaderConfig = {
  showNew: true,
};

type TreasuryBankAccountTableExtraAction =
  DataTableExtraAction<entity.TreasuryBankAccountTableRow>;

@Component({
  selector: 'app-treasury-bank-accounts',
  standalone: true,
  imports: [
    CommonModule,

    // UI
    ModuleHeader,
    DataTable,
    BtnsSection,
    InputField,
    InputSelect,
    LoadingOverlay,

    // Angular Material
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatTableModule,
    MatButtonModule,

    // Forms
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './treasury-bank-accounts.html',
  styleUrl: './treasury-bank-accounts.scss',
})
export class TreasuryBankAccounts implements OnInit {
  // =========================================================
  // INYECCIONES
  // =========================================================

  private readonly treasuryService = inject(TreasuryService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly fb = inject(FormBuilder);
  private readonly storage = inject(LocalStorageService);

  // =========================================================
  // CONFIG UI
  // =========================================================

  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;
  readonly headerConfig = HEADER_CONFIG;

  readonly activeStatusOptions = ACTIVE_STATUS_OPTIONS;

  readonly loadingTable = signal(false);

  companyOptions: Catalog[] = [];
  bankOptions: Catalog[] = [];

  // =========================================================
  // ESTADO / DATA
  // =========================================================

  filters: entity.TreasuryBankAccountFilters = {
    company_id: null,
    bank_id: null,
    search: '',
    is_active: null,
  };

  treasuryBankAccountsTableData: entity.TreasuryBankAccountTableRow[] = [];

  formFilters = this.fb.group({
    search: this.fb.control<string>(''),
    company_id: this.fb.control<Catalog | number | string | null>(null),
    bank_id: this.fb.control<Catalog | number | string | null>(null),
    is_active: this.fb.control<'true' | 'false' | ''>(''),
  });

  readonly extraActions: TreasuryBankAccountTableExtraAction[] = [
    {
      type: 'editBankAccount',
      icon: 'edit',
      tooltip: () => 'Editar cuenta bancaria',
      visible: () => true,
      disabled: () => false,
    },
    {
      type: 'deactivateBankAccount',
      icon: 'toggle_off',
      tooltip: (row) => this.getDeactivateTooltip(row),
      popoverContent: (row) => this.getDeactivatePopover(row),
      visible: (row) => !!row.is_active,
      disabled: () => false,
    },
    {
      type: 'activateBankAccount',
      icon: 'toggle_on',
      tooltip: () => 'Reactivar cuenta bancaria',
      visible: (row) => !row.is_active,
      disabled: () => false,
    },
  ];

  // =========================================================
  // CICLO DE VIDA
  // =========================================================

  ngOnInit(): void {
    this.loadInitialData();
  }

  // =========================================================
  // GETTERS UI
  // =========================================================

  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();

    const hasSearch = !!form.search?.trim();
    const hasCompany = !!this.getCatalogValue(form.company_id ?? null);
    const hasBank = !!this.getCatalogValue(form.bank_id ?? null);
    const hasStatus = !!form.is_active;

    return hasSearch || hasCompany || hasBank || hasStatus;
  }

  // =========================================================
  // CARGA INICIAL
  // =========================================================

  private loadInitialData(): void {
    this.loadingTable.set(true);

    forkJoin({
      companies: this.catalogsService.treasuryCompaniesCatalog(),
      banks: this.catalogsService.treasuryBanksCatalog(),
    }).subscribe({
      next: ({ companies, banks }) => {
        this.companyOptions = companies ?? [];
        this.bankOptions = banks ?? [];

        // Importante:
        // Se apaga antes de restaurar/cargar la tabla, porque loadBankAccounts()
        // trae una protección: if (this.loadingTable()) return;
        this.loadingTable.set(false);

        this.restoreFiltersFromStorage();
      },
      error: (err) => {
        this.loadingTable.set(false);
        console.error('Error cargando catálogos de Tesorería:', err);
      },
    });
  }

  // =========================================================
  // FILTROS + BÚSQUEDA
  // =========================================================

  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();

    const uiState: entity.TreasuryBankAccountUiFilters = {
      search: value.search?.trim() || '',
      company_id: value.company_id ?? null,
      bank_id: value.bank_id ?? null,
      is_active: value.is_active || '',
    };

    this.filters = this.buildBackendFiltersFromUi(uiState);
    this.saveFiltersToStorage(uiState);
    this.loadBankAccounts();
  }

  clearAllAndSearch(): void {
    this.formFilters.reset(
      {
        search: '',
        company_id: null,
        bank_id: null,
        is_active: '',
      },
      { emitEvent: false },
    );

    this.filters = {
      company_id: null,
      bank_id: null,
      search: '',
      is_active: null,
    };

    this.storage.removeItem(TREASURY_BANK_ACCOUNTS_FILTERS_KEY);
    this.loadBankAccounts();
  }

  loadBankAccounts(): void {
    if (this.loadingTable()) return;

    this.loadingTable.set(true);

    this.treasuryService
      .getBankAccounts(this.filters)
      .pipe(finalize(() => this.loadingTable.set(false)))
      .subscribe({
        next: (response) => {
          this.treasuryBankAccountsTableData = (response ?? []).map((row) =>
            this.mapBankAccountRow(row),
          );
        },
        error: (err) => {
          console.error('Error cargando cuentas bancarias:', err);
        },
      });
  }

  private buildBackendFiltersFromUi(
    ui: entity.TreasuryBankAccountUiFilters,
  ): entity.TreasuryBankAccountFilters {
    const companyId = this.getNumberId(ui.company_id);
    const bankId = this.getNumberId(ui.bank_id);

    return {
      search: ui.search?.trim() || '',
      company_id: companyId,
      bank_id: bankId,
      is_active:
        ui.is_active === 'true'
          ? true
          : ui.is_active === 'false'
            ? false
            : null,
    };
  }

  private mapBankAccountRow(
    row: entity.TreasuryBankAccount,
  ): entity.TreasuryBankAccountTableRow {
    const isActive = Boolean(row.is_active ?? row.isActive ?? false);

    return {
      ...row,
      account_identifier:
        row.account_identifier ?? row.accountIdentifier ?? 'Sin cuenta',
      alias_display: row.alias?.trim() || 'Sin alias',
      currency: row.currency || 'MXN',
      is_active: isActive,
      is_active_label: isActive ? 'Activa' : 'Inactiva',
      company_name: row.company?.name ?? 'Sin empresa',
      bank_name: row.bank?.name ?? 'Sin banco',
      bank_parser_code: row.bank?.parser_code ?? '',
      created_at_date: row.created_at ?? row.createdAt ?? null,
    };
  }

  // =========================================================
  // ACCIONES HEADER
  // =========================================================

  onHeaderAction(action: string): void {
    switch (action) {
      case 'new':
        this.openCreateBankAccountForm();
        break;

      default:
        break;
    }
  }

  private openCreateBankAccountForm(): void {
    // Se conecta en el siguiente paso con treasury-bank-account-form.
    console.warn('Pendiente conectar formulario de nueva cuenta bancaria.');
  }

  // =========================================================
  // ACCIONES FOOTER-FILTROS
  // =========================================================

  onBtnsSectionAction(action: string): void {
    switch (action) {
      case 'search':
        this.searchWithFilters();
        break;

      case 'clean':
        this.clearAllAndSearch();
        break;

      default:
        break;
    }
  }

  // =========================================================
  // ACCIONES TABLA
  // =========================================================

  onTableAction(
    ev: DataTableActionEvent<entity.TreasuryBankAccountTableRow>,
  ): void {
    switch (ev.type) {
      case 'editBankAccount':
        this.openEditBankAccountForm(ev.row);
        break;

      case 'deactivateBankAccount':
        this.deactivateBankAccount(ev.row);
        break;

      case 'activateBankAccount':
        this.activateBankAccount(ev.row);
        break;

      default:
        break;
    }
  }

  private openEditBankAccountForm(
    row: entity.TreasuryBankAccountTableRow,
  ): void {
    if (!row?.id) return;

    // Se conecta en el siguiente paso con treasury-bank-account-form.
    console.warn('Pendiente conectar formulario de edición:', row);
  }

  private deactivateBankAccount(
    row: entity.TreasuryBankAccountTableRow,
  ): void {
    if (!row?.id || !row.is_active) return;

    const confirmed = window.confirm(
      `¿Seguro que deseas desactivar la cuenta "${row.alias_display}"?`,
    );

    if (!confirmed) return;

    this.loadingTable.set(true);

    this.treasuryService
      .deactivateBankAccount(row.id)
      .pipe(finalize(() => this.loadingTable.set(false)))
      .subscribe({
        next: () => {
          this.loadBankAccounts();
        },
        error: (err) => {
          console.error('Error desactivando cuenta bancaria:', err);
        },
      });
  }

  private activateBankAccount(
    row: entity.TreasuryBankAccountTableRow,
  ): void {
    if (!row?.id || row.is_active) return;

    const confirmed = window.confirm(
      `¿Seguro que deseas reactivar la cuenta "${row.alias_display}"?`,
    );

    if (!confirmed) return;

    this.loadingTable.set(true);

    this.treasuryService
      .updateBankAccount(row.id, { is_active: true })
      .pipe(finalize(() => this.loadingTable.set(false)))
      .subscribe({
        next: () => {
          this.loadBankAccounts();
        },
        error: (err) => {
          console.error('Error reactivando cuenta bancaria:', err);
        },
      });
  }

  private getDeactivateTooltip(
    row: entity.TreasuryBankAccountTableRow,
  ): string {
    return row.is_active ? 'Desactivar cuenta bancaria' : '';
  }

  private getDeactivatePopover(
    row: entity.TreasuryBankAccountTableRow,
  ): DataTableActionPopover | null {
    if (row.is_active) return null;

    return {
      title: 'No disponible',
      message: null,
      items: ['Esta cuenta bancaria ya está inactiva.'],
      kind: 'warning',
    };
  }

  // =========================================================
  // LOCAL STORAGE
  // =========================================================

  private restoreFiltersFromStorage(): void {
    const saved = this.storage.getItem<entity.TreasuryBankAccountUiFilters>(
      TREASURY_BANK_ACCOUNTS_FILTERS_KEY,
    );

    if (!saved) {
      this.loadBankAccounts();
      return;
    }

    this.formFilters.patchValue(
      {
        search: saved.search ?? '',
        company_id: saved.company_id ?? null,
        bank_id: saved.bank_id ?? null,
        is_active: saved.is_active ?? '',
      },
      { emitEvent: false },
    );

    this.filters = this.buildBackendFiltersFromUi({
      search: saved.search ?? '',
      company_id: saved.company_id ?? null,
      bank_id: saved.bank_id ?? null,
      is_active: saved.is_active ?? '',
    });

    this.loadBankAccounts();
  }

  private saveFiltersToStorage(
    state?: entity.TreasuryBankAccountUiFilters,
  ): void {
    if (!state) {
      const value = this.formFilters.getRawValue();

      state = {
        search: value.search?.trim() || '',
        company_id: value.company_id ?? null,
        bank_id: value.bank_id ?? null,
        is_active: value.is_active || '',
      };
    }

    this.storage.setItem(TREASURY_BANK_ACCOUNTS_FILTERS_KEY, state);
  }

  // =========================================================
  // HELPERS
  // =========================================================
  private getCatalogValue(
    value: Catalog | number | string | null,
  ): string | number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number' || typeof value === 'string') {
      return value;
    }

    return value.id;
  }

  private getNumberId(value: unknown): number | null {
    const rawId = this.getCatalogValue(value as Catalog | number | string | null);
    const id = Number(rawId);

    if (!id || Number.isNaN(id)) return null;

    return id;
  }
}