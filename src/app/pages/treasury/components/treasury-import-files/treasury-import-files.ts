import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

// UI compartidos
import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { DataTable } from '../../../../shared/ui/data-table/data-table';
import {
  ColumnsConfig,
  ColumnVariant,
} from '../../../../shared/ui/data-table/interfaces/table-interfaces';
import { InputSelect } from '../../../../shared/ui/input-select/input-select';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';
import { LoadingOverlay } from '../../../../shared/ui/loading-overlay/loading-overlay';

// Servicios
import { CatalogsService } from '../../../../shared/services/catalogs.service';
import { LocalStorageService } from '../../../../shared/services/local-storage.service';
import { TreasuryService } from '../../services/treasury.service';

// Interfaces
import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import * as entity from '../../interfaces/treasury.interfaces';

// =========================================================
// TESORERÍA: IMPORTACIONES BANCARIAS - CONSTANTES
// =========================================================

const TREASURY_IMPORT_FILES_FILTERS_KEY =
  'mp_treasury_import_files_filters_v1';

const HEADER_CONFIG: ModuleHeaderConfig = {};

const IMPORT_STATUS_OPTIONS: Catalog[] = [
  { id: 'processed', name: 'Procesado' },
  { id: 'processed_with_errors', name: 'Procesado con errores' },
  { id: 'rejected', name: 'Rechazado' },
];

const COLUMNS_CONFIG: ColumnsConfig[] = [
  { key: 'created_at_date', label: 'Fecha', type: 'date' },
  { key: 'company_name', label: 'Empresa' },
  { key: 'bank_name', label: 'Banco' },
  { key: 'bank_account_display', label: 'Cuenta' },
  { key: 'original_file_name', label: 'Archivo' },
  { key: 'parser_label', label: 'Parser' },
  {
    key: 'status_label',
    label: 'Estatus',
    type: 'chip',
    variantResolver: (row: entity.TreasuryImportFileTableRow) =>
      resolveImportStatusVariant(row),
  },
  { key: 'total_rows', label: 'Total' },
  { key: 'inserted_rows', label: 'Insertadas' },
  { key: 'duplicate_rows', label: 'Duplicadas' },
  { key: 'error_rows', label: 'Errores' },
];

const DISPLAYED_COLUMNS: string[] = COLUMNS_CONFIG.map((column) => column.key);

function resolveImportStatusVariant(
  row: entity.TreasuryImportFileTableRow,
): ColumnVariant {
  switch (row.status) {
    case 'processed':
      return 'chip-success';

    case 'processed_with_errors':
      return 'chip-warning';

    case 'rejected':
      return 'chip-danger';

    default:
      return 'chip-neutral';
  }
}

@Component({
  selector: 'app-treasury-import-files',
  standalone: true,
  imports: [
    CommonModule,

    // UI
    ModuleHeader,
    DataTable,
    BtnsSection,
    InputSelect,
    LoadingOverlay,

    // Angular Material
    MatPaginatorModule,
    MatButtonModule,

    // Forms
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './treasury-import-files.html',
  styleUrl: './treasury-import-files.scss',
})
export class TreasuryImportFiles implements OnInit {
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

  readonly importStatusOptions = IMPORT_STATUS_OPTIONS;

  readonly loadingTable = signal(false);
  readonly loadingCatalogs = signal(false);

  companyOptions: Catalog[] = [];
  bankOptions: Catalog[] = [];
  bankAccountOptions: Catalog[] = [];

  // =========================================================
  // ESTADO / DATA
  // =========================================================

  filters: entity.TreasuryImportFileFilters = {
    page: 1,
    limit: 10,
    company_id: null,
    bank_id: null,
    bank_account_id: null,
    status: null,
  };

  importFilesTableData!: entity.TreasuryImportFilesPaginatedResponse;

  formFilters = this.fb.group({
    company_id: this.fb.control<Catalog | number | string | null>(null),
    bank_id: this.fb.control<Catalog | number | string | null>(null),
    bank_account_id: this.fb.control<Catalog | number | string | null>(null),
    status: this.fb.control<entity.TreasuryImportFileStatus | ''>(''),
  });

  // =========================================================
  // CICLO DE VIDA
  // =========================================================

  ngOnInit(): void {
    this.restoreFiltersFromStorage();
    this.loadCatalogs();
  }

  // =========================================================
  // GETTERS UI
  // =========================================================

  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();

    const hasCompany = !!this.getCatalogValue(form.company_id ?? null);
    const hasBank = !!this.getCatalogValue(form.bank_id ?? null);
    const hasBankAccount = !!this.getCatalogValue(
      form.bank_account_id ?? null,
    );
    const hasStatus = !!form.status;

    return hasCompany || hasBank || hasBankAccount || hasStatus;
  }

  // =========================================================
  // CARGA DE CATÁLOGOS
  // =========================================================

  private loadCatalogs(): void {
    this.loadingCatalogs.set(true);

    forkJoin({
      companies: this.catalogsService.treasuryCompaniesCatalog(),
      banks: this.catalogsService.treasuryBanksCatalog(),
      bankAccounts: this.catalogsService.treasuryBankAccountsCatalog(false),
    })
      .pipe(finalize(() => this.loadingCatalogs.set(false)))
      .subscribe({
        next: ({ companies, banks, bankAccounts }) => {
          this.companyOptions = companies ?? [];
          this.bankOptions = banks ?? [];
          this.bankAccountOptions = bankAccounts ?? [];
        },
        error: (err) => {
          console.error('Error cargando catálogos de importaciones:', err);
        },
      });
  }

  // =========================================================
  // FILTROS + BÚSQUEDA
  // =========================================================

  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();

    const uiState: entity.TreasuryImportFileUiFilters = {
      company_id: value.company_id ?? null,
      bank_id: value.bank_id ?? null,
      bank_account_id: value.bank_account_id ?? null,
      status: value.status || '',
      page: 1,
      limit: this.filters.limit,
    };

    this.filters = this.buildBackendFiltersFromUi(uiState);
    this.saveFiltersToStorage(uiState);
    this.loadImportFiles();
  }

  clearAllAndSearch(): void {
    this.formFilters.reset(
      {
        company_id: null,
        bank_id: null,
        bank_account_id: null,
        status: '',
      },
      { emitEvent: false },
    );

    this.filters = {
      page: 1,
      limit: this.filters.limit,
      company_id: null,
      bank_id: null,
      bank_account_id: null,
      status: null,
    };

    this.storage.removeItem(TREASURY_IMPORT_FILES_FILTERS_KEY);
    this.loadImportFiles();
  }

  loadImportFiles(): void {
    if (this.loadingTable()) return;

    this.loadingTable.set(true);

    this.treasuryService
      .getImportFiles(this.filters)
      .pipe(finalize(() => this.loadingTable.set(false)))
      .subscribe({
        next: (response) => {
          const data = (response.data ?? []).map((row) =>
            this.mapImportFileRow(row),
          );

          this.importFilesTableData = {
            ...response,
            data,
          };
        },
        error: (err) => {
          console.error('Error cargando importaciones bancarias:', err);
        },
      });
  }

  private buildBackendFiltersFromUi(
    ui: entity.TreasuryImportFileUiFilters,
  ): entity.TreasuryImportFileFilters {
    return {
      page: ui.page,
      limit: ui.limit,

      company_id: this.getNumberId(ui.company_id),
      bank_id: this.getNumberId(ui.bank_id),
      bank_account_id: this.getNumberId(ui.bank_account_id),

      status: ui.status || null,
    };
  }

  private mapImportFileRow(
    row: entity.TreasuryImportFile,
  ): entity.TreasuryImportFileTableRow {
    return {
      ...row,

      company_name: row.company?.name ?? null,
      bank_name: row.bank?.name ?? null,
      bank_account_display: this.getBankAccountDisplay(row),

      status_label: this.getImportStatusLabel(row.status),
      parser_label: row.parser_code?.toUpperCase() || 'Sin parser',

      created_at_date: row.created_at ?? null,

      rows_summary: `${row.inserted_rows ?? 0} insertadas / ${
        row.duplicate_rows ?? 0
      } duplicadas / ${row.error_rows ?? 0} errores`,

      uploaded_by_display:
        row.uploaded_by_user?.name ??
        row.uploaded_by_user?.email ??
        null,

      error_message_display: row.error_message ?? null,
    };
  }

  // =========================================================
  // PAGINACIÓN
  // =========================================================

  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;

    this.saveFiltersToStorage();
    this.loadImportFiles();
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
  // LOCAL STORAGE
  // =========================================================

  private restoreFiltersFromStorage(): void {
    const saved = this.storage.getItem<entity.TreasuryImportFileUiFilters>(
      TREASURY_IMPORT_FILES_FILTERS_KEY,
    );

    if (!saved) {
      this.loadImportFiles();
      return;
    }

    this.formFilters.patchValue(
      {
        company_id: saved.company_id ?? null,
        bank_id: saved.bank_id ?? null,
        bank_account_id: saved.bank_account_id ?? null,
        status: saved.status ?? '',
      },
      { emitEvent: false },
    );

    this.filters = this.buildBackendFiltersFromUi({
      company_id: saved.company_id ?? null,
      bank_id: saved.bank_id ?? null,
      bank_account_id: saved.bank_account_id ?? null,
      status: saved.status ?? '',
      page: saved.page ?? 1,
      limit: saved.limit ?? this.filters.limit,
    });

    this.loadImportFiles();
  }

  private saveFiltersToStorage(
    state?: entity.TreasuryImportFileUiFilters,
  ): void {
    if (!state) {
      const value = this.formFilters.getRawValue();

      state = {
        company_id: value.company_id ?? null,
        bank_id: value.bank_id ?? null,
        bank_account_id: value.bank_account_id ?? null,
        status: value.status || '',
        page: this.filters.page,
        limit: this.filters.limit,
      };
    }

    this.storage.setItem(TREASURY_IMPORT_FILES_FILTERS_KEY, state);
  }

  // =========================================================
  // HELPERS
  // =========================================================

  private getBankAccountDisplay(row: entity.TreasuryImportFile): string | null {
    const alias = row.bank_account?.alias?.trim();
    const identifier = row.bank_account?.account_identifier?.trim();

    if (alias && identifier) return `${alias} · ${identifier}`;
    if (alias) return alias;
    if (identifier) return identifier;

    return null;
  }

  private getImportStatusLabel(status: string | null | undefined): string {
    switch (status) {
      case 'processed':
        return 'Procesado';

      case 'processed_with_errors':
        return 'Procesado con errores';

      case 'rejected':
        return 'Rechazado';

      default:
        return 'Sin estatus';
    }
  }

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
    const rawId = this.getCatalogValue(
      value as Catalog | number | string | null,
    );

    const id = Number(rawId);

    if (!id || Number.isNaN(id)) return null;

    return id;
  }
}