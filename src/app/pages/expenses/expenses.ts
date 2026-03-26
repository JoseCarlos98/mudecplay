import { Component, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';

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
import { ColumnsConfig, DataTableActionEvent, DataTableExtraAction } from '../../shared/ui/data-table/interfaces/table-interfaces';
import { SearchMultiSelect } from '../../shared/ui/autocomplete-multiple/autocomplete-multiple';
import { DateRangeValue, InputDate } from '../../shared/ui/input-date/input-date';
import { InputField } from '../../shared/ui/input-field/input-field';
import { BtnsSection } from '../../shared/ui/btns-section/btns-section';
import { InputSelect } from '../../shared/ui/input-select/input-select';

// Servicios
import { ExpenseService } from './services/expense.service';
import { DialogService } from '../../shared/services/dialog.service';
import { CatalogsService } from '../../shared/services/catalogs.service';
import { LocalStorageService } from '../../shared/services/local-storage.service';

// Interfaces
import { Catalog, PaginatedResponse } from '../../shared/interfaces/general-interfaces';
import * as entity from '../expenses/interfaces/expense-interfaces';

// Componentes propios
import { ExpenseModal } from './components/expense-modal/expense-modal';
import { finalize } from 'rxjs';
import { XmlsModal } from './components/xmls-modal/xmls-modal';
import { HasRoleDirective } from '../../auth/directives/has-role.directive';
import { PermissionsService } from '../../auth/services/permissions.service';
import { LoadingOverlay } from '../../shared/ui/loading-overlay/loading-overlay';

// ==========================
//  CONSTANTES DEL MÓDULO
// ==========================

const EXPENSES_FILTERS_KEY = 'mp_expenses_filters_v1';

const COLUMNS_CONFIG: ColumnsConfig[] = [
  { key: 'is_archived', label: '¿Archivado?', type: 'booleanConfirm', align: 'center' },
  { key: 'cfdi_uuid_name', label: 'Tipo', type: 'chip', typeVariant: 'chip-neutral' },

  { key: 'internal_folio', label: 'Folio' },
  { key: 'date', label: 'Fecha', type: 'date' },
  {
    key: 'supplier',
    label: 'Proveedor',
    type: 'relation',
    path: 'company_name',
    fallback: 'No asignado',
    fallbackVariant: 'chip-warning',
  },
  { key: 'products', label: 'Productos', type: 'showItems' },
  { key: 'total_amount', label: 'Monto', type: 'money', align: 'right' },
  { key: 'remaining_amount', label: 'Saldo', type: 'money', align: 'right' },
];

const DISPLAYED_COLUMNS: string[] = [
  ...COLUMNS_CONFIG.map((c) => c.key),
  'actions',
];

const HEADER_CONFIG: ModuleHeaderConfig = {
  showNew: true,
  showUploadXml: true,
  newRoles: ['GASTOS_EDITOR'],
  uploadXmlRoles: ['GASTOS_XML_IMPORTADOR'],
};

// Catálogo extra de estados “virtuales”
const STATUS_COMPLEMENTS: Catalog[] = [
  { id: 'missing_supplier', name: 'Sin proveedor' },
  { id: 'missing_project', name: 'Sin proyecto' },
];

const PAYMENTSTATUSOPTIONS: Catalog[] = [
  { id: 'paid', name: 'Pagado' },
  { id: 'unpaid', name: 'Con saldo' },
];

@Component({
  selector: 'app-expenses',
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
    HasRoleDirective,
    LoadingOverlay
  ],
  templateUrl: './expenses.html',
  styleUrl: './expenses.scss',
})
export class Expenses implements OnInit {
  @ViewChild('xmlInput') xmlInput!: ElementRef<HTMLInputElement>;

  // ==========================
  //  CONFIG UI
  // ==========================
  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;
  readonly headerConfig = HEADER_CONFIG;
  readonly paymentStatusOptions = PAYMENTSTATUSOPTIONS;

  // ==========================
  //  INYECCIONES
  // ==========================
  private readonly expenseService = inject(ExpenseService);
  private readonly dialogService = inject(DialogService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly storage = inject(LocalStorageService);
  private readonly permissionsService = inject(PermissionsService);

  readonly downloadingReceipt = signal(false);
  readonly downloadingReceiptExpenseId = signal<number | null>(null);

  canDeleteRow = (row: entity.ExpenseResponseDto) => {
    return !row.cfdi_uuid;
  };

  deleteTooltip = (row: entity.ExpenseResponseDto) => {
    if (row.cfdi_uuid) {
      return 'No puedes eliminar gastos creados desde un CFDI.';
    }
    return null;
  };

  readonly extraActions: DataTableExtraAction<entity.ExpenseResponseDto>[] = [
    {
      type: 'downloadReceipt',
      icon: 'picture_as_pdf',
      tooltip: 'Descargar comprobante',
      visible: (row) => row.can_generate_receipt === true,
      disabled: (row) =>
        this.downloadingReceipt() && this.downloadingReceiptExpenseId() === row.id,
    },
    {
      type: 'archiveExpense',
      icon: 'archive',
      tooltip: 'Archivar gasto',
      visible: (row) => row.can_generate_receipt === true && !row.is_archived,
    },
  ];

  catalogStatusExpense: Catalog[] = [];

  // ==========================
  //  ESTADO / DATA
  // ==========================
  filters: entity.FiltersExpenses = { page: 1, limit: 5 };
  expensesTableData!: PaginatedResponse<entity.ExpenseResponseDto>;

  formFilters = this.fb.group({
    dateRange: this.fb.control<DateRangeValue | null>(null),
    suppliersIds: this.fb.control<number[]>([]),
    projectIds: this.fb.control<number[]>([]),
    concept: this.fb.control<string>(''),
    status_id: this.fb.control<string | number>(1),
    paymentStatus: this.fb.control<'paid' | 'unpaid' | null>(null),
  });

  // ==========================
  //  CICLO DE VIDA
  // ==========================
  ngOnInit(): void {
    this.restoreFiltersFromStorage();
    this.loadCatalogs();
    console.log('ROLES ACTUALES DEL USUARIO PARA GASTOS', this.permissionsService.roles);
  }

  // ==========================
  //  CARGA DE CATÁLOGOS
  // ==========================
  loadCatalogs(): void {
    this.catalogsService.statusExpenseCatalog().subscribe({
      next: (response: Catalog[]) => {
        this.catalogStatusExpense = [
          ...response,
          ...STATUS_COMPLEMENTS,
        ];
      },
      error: (err) => console.error('Error al cargar estados de gasto:', err),
    });
  }

  // ==========================
  //  HELPER: UI → FILTROS BACKEND
  // ==========================
  private buildBackendFiltersFromUi(ui: entity.ExpensesUiFilters): entity.FiltersExpenses {
    return {
      page: ui.page,
      limit: ui.limit,
      startDate: ui.dateRange?.startDate ?? null,
      endDate: ui.dateRange?.endDate ?? null,
      suppliersIds: (ui.suppliersIds ?? []).map((s: any) => s.id),
      projectIds: (ui.projectIds ?? []).map((p: any) => p.id),
      status_id: ui.status_id ?? null,
      paymentStatus: ui.paymentStatus ?? null,
    };
  }

  // ==========================
  //  FILTROS + BÚSQUEDA
  // ==========================
  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();

    const uiState: entity.ExpensesUiFilters = {
      dateRange: value.dateRange ?? null,
      suppliersIds: value.suppliersIds ?? [],
      projectIds: value.projectIds ?? [],
      status_id: value.status_id ?? null,
      paymentStatus: value.paymentStatus ?? null,
      page: 1,
      limit: this.filters.limit,
    };

    this.filters = this.buildBackendFiltersFromUi(uiState);
    this.saveFiltersToStorage(uiState);
    this.loadExpenses();
  }

  loadExpenses(): void {
    this.expenseService.getExpenses(this.filters).subscribe({
      next: (response: PaginatedResponse<entity.ExpenseResponseDto>) => {
        this.expensesTableData = response;
      },
      error: (err) => console.error('Error al cargar gastos:', err),
    });
  }

  // ==========================
  //  PAGINACIÓN
  // ==========================
  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;

    this.saveFiltersToStorage();
    this.loadExpenses();
  }

  // ==========================
  //  ACCIONES HEADER
  // ==========================
  onHeaderAction(action: string): void {
    switch (action) {
      case 'new':
        this.router.navigateByUrl('/gastos/nuevo');
        break;
      case 'upload':
        this.xmlInput.nativeElement.click();
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
  onTableAction(ev: DataTableActionEvent<entity.ExpenseResponseDto>): void {
    switch (ev.type) {
      case 'edit':
        this.router.navigateByUrl(`/gastos/editar/${ev.row.id}`);
        break;

      case 'delete':
        this.onDelete(ev.row);
        break;

      case 'showItems':
        this.expenseModal(ev.row.items);
        break;

      case 'downloadReceipt':
        this.downloadReceipt(ev.row);
        break;

      case 'archiveExpense':
        this.openArchiveExpenseModal(ev.row);
        break;
    }
  }

  private openArchiveExpenseModal(expense: entity.ExpenseResponseDto): void {
    console.log('Abrir modal para archivar gasto:', expense);
  }

  private downloadReceipt(expense: entity.ExpenseResponseDto): void {
    if (this.downloadingReceipt()) return;

    this.downloadingReceipt.set(true);
    this.downloadingReceiptExpenseId.set(expense.id);

    this.expenseService
      .downloadReceiptPdf(expense.id)
      .pipe(
        finalize(() => {
          this.downloadingReceipt.set(false);
          this.downloadingReceiptExpenseId.set(null);
        }),
      )
      .subscribe({
        next: (blob) => {
          const fileUrl = window.URL.createObjectURL(blob);
          const anchor = document.createElement('a');

          anchor.href = fileUrl;
          anchor.download = `comprobante-gasto-${expense.internal_folio}.pdf`;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();

          window.URL.revokeObjectURL(fileUrl);
        },
        error: (err) => {
          console.error('Error al descargar comprobante:', err);

          this.dialogService
            .confirm({
              title: 'Error',
              message: 'No se pudo descargar el comprobante PDF.',
              confirmText: 'OK',
              cancelText: '',
            })
            .subscribe();
        },
      });
  }

  onDelete(expense: entity.ExpenseResponseDto): void {
    this.dialogService
      .confirm({
        size: 'mini',
        message: `¿Quieres eliminar el gasto:\n"${expense.internal_folio.trim()}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.expenseService.remove(expense.id).subscribe({
          next: () => this.loadExpenses(),
          error: (err) => console.error('Error al eliminar gasto:', err),
        });
      });
  }

  // ==========================
  //  ESTADO DE FILTROS (UI)
  // ==========================
  get hasActiveFilters(): boolean {
    const form = this.formFilters.getRawValue();

    const hasDates = !!(form.dateRange?.startDate || form.dateRange?.endDate);
    const hasSuppliers = (form.suppliersIds?.length ?? 0) > 0;
    const hasProjects = (form.projectIds?.length ?? 0) > 0;
    const hasStatus = form.status_id !== '';
    const hasConcept = !!(form.concept && form.concept.trim() !== '');

    return hasDates || hasSuppliers || hasProjects || hasStatus || hasConcept;
  }

  clearAllAndSearch(): void {
    this.formFilters.reset(
      {
        dateRange: null,
        suppliersIds: [],
        projectIds: [],
        status_id: '',
        paymentStatus: null,
        concept: '',
      },
      { emitEvent: false },
    );

    this.filters = {
      page: 1,
      limit: this.filters.limit,
      startDate: null,
      endDate: null,
      paymentStatus: null,
      suppliersIds: [],
      projectIds: [],
      status_id: null,
    };

    this.storage.removeItem(EXPENSES_FILTERS_KEY);
    this.loadExpenses();
  }

  // ==========================
  //  MODAL DE ITEMS
  // ==========================
  expenseModal(expense?: entity.ExpenseItem[]): void {
    this.dialogService
      .open(ExpenseModal, expense ? expense : null, 'medium')
      .afterClosed()
      .subscribe((result) => {
        if (result) this.loadExpenses();
      });
  }

  // ==========================
  //  LOCAL STORAGE (FILTROS)
  // ==========================
  private restoreFiltersFromStorage(): void {
    const saved = this.storage.getItem<entity.ExpensesUiFilters>(EXPENSES_FILTERS_KEY);

    if (!saved) {
      this.searchWithFilters();
      return;
    }

    this.formFilters.patchValue(
      {
        dateRange: saved.dateRange,
        suppliersIds: saved.suppliersIds,
        projectIds: saved.projectIds,
        status_id: saved.status_id,
      },
      { emitEvent: false },
    );

    this.filters = this.buildBackendFiltersFromUi(saved);
    this.loadExpenses();
  }

  private saveFiltersToStorage(state?: entity.ExpensesUiFilters): void {
    if (!state) {
      const value = this.formFilters.getRawValue();

      state = {
        dateRange: value.dateRange ?? null,
        suppliersIds: value.suppliersIds ?? [],
        projectIds: value.projectIds ?? [],
        status_id: value.status_id ?? null,
        paymentStatus: value.paymentStatus ?? null,
        page: this.filters.page,
        limit: this.filters.limit,
      };
    }

    this.storage.setItem(EXPENSES_FILTERS_KEY, state);
  }

  onXmlSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);

    this.expenseService
      .uploadXml(files)
      .pipe(finalize(() => (input.value = '')))
      .subscribe({
        next: (resp) => {
          const drafts = resp.drafts ?? [];
          const duplicates = resp.duplicates ?? [];
          const errors = resp.errors ?? [];

          if (errors.length > 0 && drafts.length === 0 && duplicates.length === 0) {
            const msg = errors
              .map((e) => `• ${e.sourceFileName}: ${e.reason}`)
              .join('\n');

            this.dialogService.confirm({
              title: 'Errores al leer XML',
              message: msg || 'Ocurrió un error al procesar los XML.',
              confirmText: 'OK',
              cancelText: '',
            }).subscribe();
            return;
          }

          if (!drafts.length && !duplicates.length) {
            this.dialogService
              .confirm({
                title: 'Sin resultados',
                message: 'No se encontraron CFDI válidos en los XML cargados.',
                confirmText: 'OK',
                cancelText: '',
              })
              .subscribe();
            return;
          }

          this.dialogService
            .open(
              XmlsModal,
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
                this.expenseService.setXmlQueueToImport(result.drafts);
                this.router.navigateByUrl('/gastos/nuevo');
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
}