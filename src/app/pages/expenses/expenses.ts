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
import {
  ColumnVariant,
  ColumnsConfig,
  DataTableActionEvent,
  DataTableActionPopover,
  DataTableExtraAction,
} from '../../shared/ui/data-table/interfaces/table-interfaces';
import { SearchMultiSelect } from '../../shared/ui/autocomplete-multiple/autocomplete-multiple';
import { DateRangeValue, InputDate } from '../../shared/ui/input-date/input-date';
import { InputField } from '../../shared/ui/input-field/input-field';
import { BtnsSection } from '../../shared/ui/btns-section/btns-section';
import { InputSelect } from '../../shared/ui/input-select/input-select';
import { LoadingOverlay } from '../../shared/ui/loading-overlay/loading-overlay';

// Servicios
import { ExpenseService } from './services/expense.service';
import { DialogService } from '../../shared/services/dialog.service';
import { CatalogsService } from '../../shared/services/catalogs.service';
import { LocalStorageService } from '../../shared/services/local-storage.service';
import { PermissionsService } from '../../auth/services/permissions.service';

// Interfaces
import { Catalog, PaginatedResponse } from '../../shared/interfaces/general-interfaces';
import * as entity from '../expenses/interfaces/expense-interfaces';

// Componentes propios
import { ExpenseModal } from './components/expense-modal/expense-modal';
import { XmlsModal } from './components/xmls-modal/xmls-modal';
import { ModalArchive } from './components/modal-archive/modal-archive';
import { ModalWarehouseCancel } from '../warehouse-lots/components/modal-warehouse-cancel/modal-warehouse-cancel';

import { finalize } from 'rxjs';
import { HasRoleDirective } from '../../auth/directives/has-role.directive';

// ==========================
//  CONSTANTES DEL MÓDULO
// ==========================

const EXPENSES_FILTERS_KEY = 'mp_expenses_filters_v1';

const STATUS_COMPLEMENTS: Catalog[] = [
  { id: 'missing_supplier', name: 'Sin proveedor' },
  { id: 'missing_project', name: 'Sin proyecto' },
];

const PAYMENTSTATUSOPTIONS: Catalog[] = [
  { id: 'paid', name: 'Pagado' },
  { id: 'unpaid', name: 'Con saldo' },
];

const WAREHOUSE_ASSIGNMENT_STATUS_OPTIONS: Catalog[] = [
  { id: 'all', name: 'Todos' },
  { id: 'with_pending', name: 'Pendientes y parciales' },
  { id: 'pending', name: 'Pendiente' },
  { id: 'partial', name: 'Parcial' },
  { id: 'completed', name: 'Completo' },
  { id: 'not_applicable', name: 'No aplica' },
];

const HEADER_CONFIG: ModuleHeaderConfig = {
  showNew: true,
  showUploadXml: true,
  newRoles: ['GASTOS_EDITOR'],
  uploadXmlRoles: ['GASTOS_XML_IMPORTADOR'],
};

type ExpenseTableExtraAction =
  DataTableExtraAction<entity.ExpenseResponseDto> & {
    popoverContent?: (row: entity.ExpenseResponseDto) => DataTableActionPopover | null;
  };

function getWarehouseAssignmentColumnVariant(
  row: entity.ExpenseResponseDto,
): ColumnVariant {
  switch (row.warehouse_assignment_status) {
    case 'completed':
      return 'chip-success';

    case 'partial':
      return 'chip-warning';

    case 'pending':
      return 'chip-danger';

    case 'not_applicable':
    default:
      return 'chip-neutral';
  }
}

function getWarehouseAssignmentPopoverKind(
  row: entity.ExpenseResponseDto,
): 'warning' | 'info' | 'success' | 'error' {
  switch (row.warehouse_assignment_status) {
    case 'completed':
      return 'success';

    case 'partial':
      return 'warning';

    case 'pending':
      return 'error';

    case 'not_applicable':
    default:
      return 'info';
  }
}

function getWarehouseAssignmentColumnPopover(
  row: entity.ExpenseResponseDto,
): DataTableActionPopover | null {
  const label = row.warehouse_assignment_status_label ?? 'No aplica';
  const lines = row.warehouse_assignment_control?.tooltip_lines ?? [];

  return {
    title: `Asignación almacén: ${label}`,
    message: null,
    items: lines,
    kind: getWarehouseAssignmentPopoverKind(row),
  };
}

const COLUMNS_CONFIG: ColumnsConfig[] = [
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
  {
    key: 'warehouse_assignment_status_display',
    label: 'Asignación almacén',
    type: 'chip',
    typeVariant: 'chip-neutral',
    variantResolver: getWarehouseAssignmentColumnVariant,
    popoverContent: getWarehouseAssignmentColumnPopover,
  },
  { key: 'total_amount', label: 'Monto', type: 'money', align: 'right' },
  { key: 'remaining_amount', label: 'Saldo', type: 'money', align: 'right' },
  { key: 'is_archived', label: '¿Archivado?', type: 'booleanConfirm', align: 'center' },
];

const DISPLAYED_COLUMNS: string[] = [
  ...COLUMNS_CONFIG.map((c) => c.key),
  'actions',
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
    FormsModule,
    ReactiveFormsModule,
    HasRoleDirective,
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
  readonly warehouseAssignmentStatusOptions = WAREHOUSE_ASSIGNMENT_STATUS_OPTIONS;

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

  // ==========================
  //  LOADINGS
  // ==========================
  readonly loadingTable = signal(false);
  readonly downloadingReceipt = signal(false);
  readonly downloadingReceiptExpenseId = signal<number | null>(null);

  // ==========================
  //  ACCIONES BASE
  // ==========================
  canDeleteRow = (row: entity.ExpenseResponseDto) => {
    if (this.isPurchaseOrderLinkedExpense(row)) return false;
    if (this.isWarehouseExpense(row)) return false;
    return !row.cfdi_uuid;
  };

  deleteTooltip = (row: entity.ExpenseResponseDto) => {
    if (this.isPurchaseOrderLinkedExpense(row)) {
      return this.getPurchaseOrderLockedMessage(row, 'eliminar');
    }

    if (this.isWarehouseExpense(row)) {
      return 'Los gastos de almacén se cancelan con la acción "Cancelar gasto de almacén".';
    }

    if (row.cfdi_uuid) {
      return 'No puedes eliminar gastos creados desde un CFDI.';
    }

    return null;
  };

  private isDownloadingThisReceipt(row: entity.ExpenseResponseDto): boolean {
    return this.downloadingReceipt() && this.downloadingReceiptExpenseId() === row.id;
  }

  private isWarehouseExpense(row: entity.ExpenseResponseDto): boolean {
    return (row.items ?? []).some(
      (item) => (item.item_type ?? 'direct') === 'warehouse',
    );
  }

  private isPurchaseOrderLinkedExpense(row: entity.ExpenseResponseDto): boolean {
    return !!row.is_purchase_order_linked || !!row.purchase_order_link;
  }

  private getPurchaseOrderFolio(row: entity.ExpenseResponseDto): string {
    return row.purchase_order_link?.folio ?? 'una O.C.';
  }

  private getPurchaseOrderLockedMessage(
    row: entity.ExpenseResponseDto,
    actionLabel: 'cancelar' | 'eliminar',
  ): string {
    return (
      `Este gasto ya está relacionado con la O.C. ${this.getPurchaseOrderFolio(row)}. ` +
      `Para ${actionLabel}lo o corregirlo, entra al detalle de la Orden de Compra.`
    );
  }

  private showPurchaseOrderLockedDialog(
    row: entity.ExpenseResponseDto,
    actionLabel: 'cancelar' | 'eliminar',
  ): void {
    this.dialogService
      .confirm({
        title: 'Acción no disponible',
        message: this.getPurchaseOrderLockedMessage(row, actionLabel),
        confirmText: 'OK',
        cancelText: '',
      })
      .subscribe();
  }

  getReceiptTooltip = (row: entity.ExpenseResponseDto): string => {
    return row.can_generate_receipt ? 'Descargar comprobante' : '';
  };

  getArchiveTooltip = (row: entity.ExpenseResponseDto): string => {
    return row.can_generate_receipt && !row.is_archived ? 'Archivar gasto' : '';
  };

  getCancelWarehouseExpenseTooltip = (
    row: entity.ExpenseResponseDto,
  ): string => {
    if (!this.isWarehouseExpense(row)) return '';

    if (this.isPurchaseOrderLinkedExpense(row)) {
      return this.getPurchaseOrderLockedMessage(row, 'cancelar');
    }

    return row.cfdi_uuid
      ? 'Cancelar gasto XML de almacén'
      : 'Cancelar gasto de almacén';
  };

  getReceiptPopover = (
    row: entity.ExpenseResponseDto,
  ): DataTableActionPopover | null => {
    if (row.can_generate_receipt) return null;

    return {
      title: 'No disponible',
      message: null,
      items: row.receipt_block_reasons ?? [],
      kind: 'warning',
    };
  };

  getArchivePopover = (
    row: entity.ExpenseResponseDto,
  ): DataTableActionPopover | null => {
    if (row.can_generate_receipt) return null;

    return {
      title: 'No disponible',
      message: null,
      items: row.receipt_block_reasons ?? [],
      kind: 'warning',
    };
  };

  getCancelWarehouseExpensePopover = (
    row: entity.ExpenseResponseDto,
  ): DataTableActionPopover | null => {
    if (!this.isWarehouseExpense(row)) return null;

    if (this.isPurchaseOrderLinkedExpense(row)) {
      return {
        title: 'No se puede cancelar desde Gastos',
        message: null,
        items: [
          this.getPurchaseOrderLockedMessage(row, 'cancelar'),
        ],
        kind: 'warning',
      };
    }

    return {
      title: 'Cancelar gasto completo de almacén',
      message: null,
      items: [
        'Esta acción cancelará el gasto completo de almacén.',
        'El material dejará de estar disponible en existencias.',
        'Si el gasto ya tuvo salidas a proyecto, esas salidas se regresarán automáticamente.',
        'Después de cancelar, el gasto dejará de aparecer en el listado principal.',
      ],
      kind: 'warning',
    };
  };

  readonly extraActions: ExpenseTableExtraAction[] = [
    {
      type: 'downloadReceipt',
      icon: 'picture_as_pdf',
      tooltip: this.getReceiptTooltip,
      popoverContent: this.getReceiptPopover,
      visible: () => true,
      disabled: (row) =>
        !row.can_generate_receipt || this.isDownloadingThisReceipt(row),
    },
    {
      type: 'archiveExpense',
      icon: 'archive',
      tooltip: this.getArchiveTooltip,
      popoverContent: this.getArchivePopover,
      visible: () => true,
      disabled: (row) => !row.can_generate_receipt || row.is_archived,
    },
    {
      type: 'cancelWarehouseExpense',
      icon: 'delete_forever',
      tooltip: this.getCancelWarehouseExpenseTooltip,
      popoverContent: this.getCancelWarehouseExpensePopover,
      visible: (row) => this.isWarehouseExpense(row),
      disabled: (row) => this.isPurchaseOrderLinkedExpense(row),
    },
  ];

  catalogStatusExpense: Catalog[] = [];

  // ==========================
  //  ESTADO / DATA
  // ==========================
  filters: entity.FiltersExpenses = {
    page: 1,
    limit: 5,
    warehouseAssignmentStatus: 'all',
  };

  expensesTableData!: PaginatedResponse<entity.ExpenseResponseDto>;

  formFilters = this.fb.group({
    dateRange: this.fb.control<DateRangeValue | null>(null),
    suppliersIds: this.fb.control<any[]>([]),
    projectIds: this.fb.control<any[]>([]),
    concept: this.fb.control<string>(''),
    status_id: this.fb.control<string | number>(1),
    paymentStatus: this.fb.control<'paid' | 'unpaid' | null>(null),
    warehouseAssignmentStatus:
      this.fb.control<entity.WarehouseAssignmentStatusFilter>('all'),
  });

  // ==========================
  //  CICLO DE VIDA
  // ==========================
  ngOnInit(): void {
    this.restoreFiltersFromStorage();
    this.loadCatalogs();
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
      warehouseAssignmentStatus: ui.warehouseAssignmentStatus ?? 'all',
    };
  }

  private mapExpenseRow(row: entity.ExpenseResponseDto): entity.ExpenseResponseDto {
    const mapped: entity.ExpenseResponseDto = {
      ...row,
      warehouse_assignment_status_display:
        row.warehouse_assignment_status_label ?? 'No aplica',
    };

    if (
      mapped.origin_type === 'labor_auto' &&
      !mapped.supplier &&
      mapped.provider_display_name?.trim()
    ) {
      return {
        ...mapped,
        supplier: {
          id: 0,
          company_name: mapped.provider_display_name.trim(),
        },
      };
    }

    return mapped;
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
      warehouseAssignmentStatus: value.warehouseAssignmentStatus ?? 'all',
      page: 1,
      limit: this.filters.limit,
    };

    this.filters = this.buildBackendFiltersFromUi(uiState);
    this.saveFiltersToStorage(uiState);
    this.loadExpenses();
  }

  loadExpenses(): void {
    if (this.loadingTable()) return;

    this.loadingTable.set(true);

    this.expenseService
      .getExpenses(this.filters)
      .pipe(finalize(() => this.loadingTable.set(false)))
      .subscribe({
        next: (response: PaginatedResponse<entity.ExpenseResponseDto>) => {
          const data = (response.data ?? []).map((row) => this.mapExpenseRow(row));

          this.expensesTableData = {
            ...response,
            data,
          };
        },
        error: (err) => {
          console.error('Error al cargar gastos:', err);
        },
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
        this.router.navigate(['/gastos/editar', ev.row.id], {
          queryParams: {
            returnUrl: '/gastos',
          },
        });
        break;

      case 'delete':
        this.onDelete(ev.row);
        break;

      case 'showItems':
        this.expenseModal(ev.row);
        break;

      case 'downloadReceipt':
        this.downloadReceipt(ev.row);
        break;

      case 'archiveExpense':
        this.openArchiveExpenseModal(ev.row);
        break;

      case 'cancelWarehouseExpense':
        this.openCancelWarehouseExpenseModal(ev.row);
        break;
    }
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
    if (this.isPurchaseOrderLinkedExpense(expense)) {
      this.showPurchaseOrderLockedDialog(expense, 'eliminar');
      return;
    }

    if (this.isWarehouseExpense(expense)) {
      this.openCancelWarehouseExpenseModal(expense);
      return;
    }

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

  private openCancelWarehouseExpenseModal(expense: entity.ExpenseResponseDto): void {
    if (!this.isWarehouseExpense(expense)) return;

    if (this.isPurchaseOrderLinkedExpense(expense)) {
      this.showPurchaseOrderLockedDialog(expense, 'cancelar');
      return;
    }

    this.dialogService
      .open(
        ModalWarehouseCancel,
        {
          expenseId: expense.id,
        },
        'medium',
      )
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.loadExpenses();
        }
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
    const hasPaymentStatus = !!form.paymentStatus;
    const hasWarehouseAssignment =
      !!form.warehouseAssignmentStatus &&
      form.warehouseAssignmentStatus !== 'all';

    return (
      hasDates ||
      hasSuppliers ||
      hasProjects ||
      hasStatus ||
      hasConcept ||
      hasPaymentStatus ||
      hasWarehouseAssignment
    );
  }

  clearAllAndSearch(): void {
    this.formFilters.reset(
      {
        dateRange: null,
        suppliersIds: [],
        projectIds: [],
        status_id: '',
        paymentStatus: null,
        warehouseAssignmentStatus: 'all',
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
      warehouseAssignmentStatus: 'all',
    };

    this.storage.removeItem(EXPENSES_FILTERS_KEY);
    this.loadExpenses();
  }

  // ==========================
  //  MODAL DE ITEMS
  // ==========================
  expenseModal(expense?: entity.ExpenseResponseDto | entity.ExpenseItem[]): void {
    this.dialogService
      .open(ExpenseModal, expense ? expense : null, 'large')
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
        dateRange: saved.dateRange ?? null,
        suppliersIds: saved.suppliersIds ?? [],
        projectIds: saved.projectIds ?? [],
        status_id: saved.status_id ?? 1,
        paymentStatus: saved.paymentStatus ?? null,
        warehouseAssignmentStatus: saved.warehouseAssignmentStatus ?? 'all',
      },
      { emitEvent: false },
    );

    this.filters = this.buildBackendFiltersFromUi({
      ...saved,
      warehouseAssignmentStatus: saved.warehouseAssignmentStatus ?? 'all',
    });

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
        warehouseAssignmentStatus: value.warehouseAssignmentStatus ?? 'all',
        page: this.filters.page,
        limit: this.filters.limit,
      };
    }

    this.storage.setItem(EXPENSES_FILTERS_KEY, state);
  }

  private openArchiveExpenseModal(expense: entity.ExpenseResponseDto): void {
    this.dialogService
      .open(ModalArchive, expense, 'mini')
      .afterClosed()
      .subscribe((result) => {
        if (result) this.loadExpenses();
      });
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