import { Component, ElementRef, ViewChild, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
  DataTableExtraAction,
} from '../../shared/ui/data-table/interfaces/table-interfaces';
import { DateRangeValue, InputDate } from '../../shared/ui/input-date/input-date';
import { InputField } from '../../shared/ui/input-field/input-field';
import { BtnsSection } from '../../shared/ui/btns-section/btns-section';
import { InputSelect } from '../../shared/ui/input-select/input-select';

// Servicios
import { AccountsReceivableService } from './services/accounts-receivable.service';
import { DialogService } from '../../shared/services/dialog.service';
import { LocalStorageService } from '../../shared/services/local-storage.service';

// Interfaces
import { PaginatedResponse } from '../../shared/interfaces/general-interfaces';
import * as entity from './interfaces/accounts-receivable-interfaces';

// Auth
import { HasRoleDirective } from '../../auth/directives/has-role.directive';
import { ModalReceivableXml } from './components/modal-receivable-xml/modal-receivable-xml';
import { ModalAdvance } from './components/modal-advance/modal-advance';
import { ModalAdvanceHistory } from './components/modal-advance-history/modal-advance-history';

const ACCOUNTS_RECEIVABLE_FILTERS_KEY = 'mp_accounts_receivable_filters_v1';

const COLUMNS_CONFIG: ColumnsConfig[] = [
  { key: 'company_label', label: 'Empresa', type: 'chip', typeVariant: 'chip-neutral' },
  { key: 'invoice_display', label: 'Factura' },
  { key: 'receiver_name', label: 'Cliente' },
  { key: 'issue_date', label: 'Fecha emisión', type: 'date' },
  { key: 'total', label: 'Total', type: 'money', align: 'right' },
  { key: 'advance_amount', label: 'Total anticipos', type: 'money', align: 'right' },
  { key: 'status_label', label: 'Estatus', type: 'chip', typeVariant: 'chip-neutral' },
  { key: 'collected_at', label: 'Fecha cobro', type: 'date' },
];

const DISPLAYED_COLUMNS: string[] = [...COLUMNS_CONFIG.map((c) => c.key), 'actions'];

const HEADER_CONFIG: ModuleHeaderConfig = {
  showNew: false,
  showUploadXml: true,
  uploadXmlRoles: ['CUENTAS_POR_COBRAR_XML_IMPORTADOR'],
};

@Component({
  selector: 'app-accounts-receivable',
  standalone: true,
  imports: [
    CommonModule,
    ModuleHeader,
    DataTable,
    BtnsSection,
    InputDate,
    InputField,
    InputSelect,
    MatPaginatorModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatTableModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    FormsModule,
    ReactiveFormsModule,
    HasRoleDirective,
  ],
  templateUrl: './accounts-receivable.html',
  styleUrl: './accounts-receivable.scss',
})
export class AccountsReceivable implements OnInit {
  private readonly accountsReceivableService = inject(AccountsReceivableService);
  private readonly dialogService = inject(DialogService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly storage = inject(LocalStorageService);

  @ViewChild('xmlInput') xmlInput!: ElementRef<HTMLInputElement>;

  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;
  readonly headerConfig = HEADER_CONFIG;
  readonly statusOptions = entity.ACCOUNTS_RECEIVABLE_STATUS_OPTIONS;
  readonly companyOptions = entity.ACCOUNTS_RECEIVABLE_COMPANY_OPTIONS;

  readonly extraActions: DataTableExtraAction<entity.AccountReceivableRow>[] = [
    {
      type: 'addAdvance',
      icon: 'payments',
      tooltip: 'Registrar anticipo',
      visible: (row) =>
        row.status === 'pending' &&
        Number(row.advance_amount ?? 0) < Number(row.total ?? 0),
      disabled: () => false,
    },
    {
      type: 'showAdvanceHistory',
      icon: 'history',
      tooltip: 'Ver historial de anticipos',
      visible: (row) => Number(row.advance_amount ?? 0) > 0,
      disabled: () => false,
    },
  ];

  filters: entity.FiltersAccountsReceivable = { page: 1, limit: 5 };

  accountsReceivableTableData!: PaginatedResponse<entity.AccountReceivableRow>;

  formFilters = this.fb.group({
    dateRange: this.fb.control<DateRangeValue | null>(null),
    folio: this.fb.control<string>(''),
    companyCode: this.fb.control<string | null>(null),
    clientQuery: this.fb.control<string>(''),
    status: this.fb.control<'pending' | 'collected' | null>(null),
  });

  ngOnInit(): void {
    this.restoreFiltersFromStorage();
  }

  private buildBackendFiltersFromUi(
    ui: entity.AccountsReceivableUiFilters,
  ): entity.FiltersAccountsReceivable {
    return {
      page: ui.page,
      limit: ui.limit,
      startDate: ui.dateRange?.startDate ?? null,
      endDate: ui.dateRange?.endDate ?? null,
      folio: ui.folio?.trim() || null,
      companyCode: ui.companyCode ?? null,
      clientQuery: ui.clientQuery?.trim() || null,
      status: ui.status ?? null,
    };
  }

  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();

    const uiState: entity.AccountsReceivableUiFilters = {
      dateRange: value.dateRange ?? null,
      folio: value.folio ?? '',
      companyCode: value.companyCode ?? null,
      clientQuery: value.clientQuery ?? '',
      status: value.status ?? null,
      page: 1,
      limit: this.filters.limit,
    };

    this.filters = this.buildBackendFiltersFromUi(uiState);
    this.saveFiltersToStorage(uiState);
    this.loadAccountsReceivable();
  }

  onTableAction(ev: DataTableActionEvent<entity.AccountReceivableRow>): void {
    switch (ev.type) {
      case 'edit':
        this.router.navigateByUrl(`/cuentas-por-cobrar/editar/${ev.row.id}`);
        break;

      case 'delete':
        this.onDelete(ev.row);
        break;

      case 'addAdvance':
        this.openAdvanceModal(ev.row);
        break;

      case 'showAdvanceHistory':
        this.openAdvanceHistoryModal(ev.row);
        break;
    }
  }

  private openAdvanceHistoryModal(account: entity.AccountReceivableRow): void {
    this.dialogService.open(
      ModalAdvanceHistory,
      account,
      'small',
    );
  }

  private openAdvanceModal(account: entity.AccountReceivableRow): void {
    this.dialogService
      .open(ModalAdvance, account, 'mini')
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;

        if (result.action === 'saved') {
          this.loadAccountsReceivable();
        }
      });
  }

  onDelete(account: entity.AccountReceivableRow): void {
    this.dialogService
      .confirm({
        size: 'mini',
        message: `¿Quieres eliminar la cuenta por cobrar:\n"${account.series ? account.series + '-' : ''}${account.folio}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.accountsReceivableService.remove(account.id).subscribe({
          next: () => this.loadAccountsReceivable(),
          error: (err) => console.error('Error al eliminar cuenta por cobrar:', err),
        });
      });
  }

  loadAccountsReceivable(): void {
    this.accountsReceivableService.getAccountsReceivable(this.filters).subscribe({
      next: (response) => {
        const data: entity.AccountReceivableRow[] = (response.data ?? []).map((row) => ({
          ...row,
          invoice_display: row.series ? `${row.series}-${row.folio}` : row.folio,
          company_label: this.resolveCompanyLabel(row.company_code),
          status_label: row.status === 'collected' ? 'Cobrada' : 'Pendiente',
        }));

        this.accountsReceivableTableData = {
          ...response,
          data,
        };
      },
      error: (err) => console.error('Error al cargar cuentas por cobrar:', err),
    });
  }

  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;

    this.saveFiltersToStorage();
    this.loadAccountsReceivable();
  }

  onHeaderAction(action: string): void {
    switch (action) {
      case 'upload':
        this.xmlInput.nativeElement.click();
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

  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();

    const hasDates = !!(form.dateRange?.startDate || form.dateRange?.endDate);
    const hasFolio = !!form.folio?.trim();
    const hasCompany = !!form.companyCode;
    const hasClientQuery = !!form.clientQuery?.trim();
    const hasStatus = !!form.status;

    return hasDates || hasFolio || hasCompany || hasClientQuery || hasStatus;
  }

  clearAllAndSearch(): void {
    this.formFilters.reset(
      {
        dateRange: null,
        folio: '',
        companyCode: null,
        clientQuery: '',
        status: null,
      },
      { emitEvent: false },
    );

    this.filters = {
      page: 1,
      limit: this.filters.limit,
      startDate: null,
      endDate: null,
      folio: null,
      companyCode: null,
      clientQuery: null,
      status: null,
    };

    this.storage.removeItem(ACCOUNTS_RECEIVABLE_FILTERS_KEY);
    this.loadAccountsReceivable();
  }

  private restoreFiltersFromStorage(): void {
    const saved = this.storage.getItem<entity.AccountsReceivableUiFilters>(
      ACCOUNTS_RECEIVABLE_FILTERS_KEY,
    );

    if (!saved) {
      this.searchWithFilters();
      return;
    }

    this.formFilters.patchValue(
      {
        dateRange: saved.dateRange,
        folio: saved.folio,
        companyCode: saved.companyCode,
        clientQuery: saved.clientQuery,
        status: saved.status,
      },
      { emitEvent: false },
    );

    this.filters = this.buildBackendFiltersFromUi(saved);
    this.loadAccountsReceivable();
  }

  private saveFiltersToStorage(state?: entity.AccountsReceivableUiFilters): void {
    if (!state) {
      const value = this.formFilters.getRawValue();

      state = {
        dateRange: value.dateRange ?? null,
        folio: value.folio ?? '',
        companyCode: value.companyCode ?? null,
        clientQuery: value.clientQuery ?? '',
        status: value.status ?? null,
        page: this.filters.page,
        limit: this.filters.limit,
      };
    }

    this.storage.setItem(ACCOUNTS_RECEIVABLE_FILTERS_KEY, state);
  }

  onXmlSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);

    this.accountsReceivableService
      .uploadXml(files)
      .pipe(finalize(() => (input.value = '')))
      .subscribe({
        next: (resp) => {
          const drafts = resp.drafts ?? [];
          const duplicates = resp.duplicates ?? [];
          const errors = resp.errors ?? [];

          if (errors.length > 0 && drafts.length === 0 && duplicates.length === 0) {
            const msg = errors.map((e) => `• ${e.sourceFileName}: ${e.reason}`).join('\n');

            this.dialogService
              .confirm({
                title: 'Errores al leer XML',
                message: msg || 'Ocurrió un error al procesar los XML.',
                confirmText: 'OK',
                cancelText: '',
              })
              .subscribe();
            return;
          }

          if (!drafts.length && !duplicates.length) {
            this.dialogService
              .confirm({
                title: 'Sin resultados',
                message: 'No se encontraron XML válidos en la carga.',
                confirmText: 'OK',
                cancelText: '',
              })
              .subscribe();
            return;
          }

          this.dialogService
            .open(
              ModalReceivableXml,
              {
                drafts,
                duplicates,
              },
              'large',
            )
            .afterClosed()
            .subscribe((result) => {
              if (!result) return;

              if (result.action === 'import' && result.drafts?.length) {
                this.accountsReceivableService.setXmlQueueToImport(result.drafts);
                this.router.navigateByUrl('/cuentas-por-cobrar/nuevo');
              }
            });
        },
        error: (err) => {
          console.error('Error al subir XMLs', err);
          this.dialogService
            .confirm({
              title: 'Error',
              message: 'Ocurrió un error al subir los XML.',
              confirmText: 'OK',
              cancelText: '',
            })
            .subscribe();
        },
      });
  }

  private resolveCompanyLabel(code: string): string {
    switch (code) {
      case 'MUDECPLAY':
        return 'MUDECPLAY';
      case 'CONSTRUCTORA_PELEN':
        return 'CONSTRUCTORA PELEN';
      default:
        return code || 'OTRA';
    }
  }
}