import { Component, inject, OnInit } from '@angular/core';
import { ModuleHeader, ModuleHeaderConfig } from "../../shared/ui/module-header/module-header";
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { DataTable } from '../../shared/ui/data-table/data-table';
import { MatSelectModule } from '@angular/material/select';
import { ExpenseService } from './services/expense.service';
import { Catalog, ColumnsConfig, PaginatedResponse } from '../../shared/interfaces/general-interfaces';
import { ExpenseResponseDto, FiltersExpenses } from './interfaces/expense-interfaces';
import { CommonModule } from '@angular/common';
import { ExpenseModal } from './components/expense-modal/expense-modal';
import { DialogService } from '../../shared/services/dialog.service';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CatalogsService } from '../../shared/services/catalogs.service';
import { SearchMultiSelect } from '../../shared/ui/autocomplete-multiple/autocomplete-multiple';
import { DateRangeValue, InputDate } from '../../shared/ui/input-date/input-date';
import { InputField } from '../../shared/ui/input-field/input-field';
import { BtnsSection } from '../../shared/ui/btns-section/btns-section';
import { InputSelect } from '../../shared/ui/input-select/input-select';
import { Router } from '@angular/router';

const COLUMNS_CONFIG: ColumnsConfig[] = [
  { key: 'concept', label: 'Concepto' },
  { key: 'date', label: 'Fecha', type: 'date' },
  { key: 'amount', label: 'Monto', type: 'money', align: 'right' },
  { key: 'supplier', label: 'Proveedor', type: 'relation', path: 'company_name', fallback: 'No asignado' },
  { key: 'project', label: 'Proyecto', type: 'relation', path: 'name', fallback: 'No asignado' },
];

const DISPLAYED_COLUMNS: string[] = [
  ...COLUMNS_CONFIG.map((c) => c.key),
  'actions',
];

const HEADER_CONFIG: ModuleHeaderConfig = {
  showNew: true,
  showUploadXml: true
};

const STATUS_COMPLEMENTS: Catalog[] = [
  { id: 'missing_supplier', name: 'Sin proveedor' },
  { id: 'missing_project', name: 'Sin proyecto' },
]

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [
    CommonModule,
    DataTable,
    MatPaginatorModule,
    ModuleHeader,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    ReactiveFormsModule,
    MatIconModule,
    MatTableModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    SearchMultiSelect,
    InputDate,
    InputField,
    BtnsSection,
    InputSelect
  ],
  templateUrl: './expenses.html',
  styleUrl: './expenses.scss',
})
export class Expenses implements OnInit {
  private readonly expenseService = inject(ExpenseService);
  private readonly dialogService = inject(DialogService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;
  readonly headerConfig = HEADER_CONFIG;

  catalogStatusExpense: Catalog[] = [];

  filters: FiltersExpenses = { page: 1, limit: 5 };

  expensesTableData!: PaginatedResponse<ExpenseResponseDto>;

  formFilters = this.fb.group({
    dateRange: this.fb.control<DateRangeValue | null>(null),
    suppliersIds: this.fb.control<number[]>([]),
    projectIds: this.fb.control<number[]>([]),
    concept: this.fb.control<string>(''),
    status_id: this.fb.control<string | number>(1),
  });

  ngOnInit(): void {
    this.searchWithFilters();
    this.loadCatalogs();
  }

  loadCatalogs() {
    this.catalogsService.statusExpenseCatalog().subscribe({
      next: (response: Catalog[]) => {
        console.log(response);
        this.catalogStatusExpense = [
          ...response,
          ...STATUS_COMPLEMENTS
        ]
      },
      error: (err) => console.error('Error al cargar gastos:', err),
    });
  }

  searchWithFilters() {
    const values = this.formFilters.value;

    this.filters = {
      ...this.filters,
      page: 1,
      startDate: values.dateRange?.startDate,
      endDate: values.dateRange?.endDate,
      suppliersIds: values.suppliersIds,
      projectIds: values.projectIds,
      status_id: values.status_id,
      concept: values.concept?.trim() || ''
    };

    this.loadExpenses();
  }

  loadExpenses(): void {
    this.expenseService.getExpenses(this.filters).subscribe({
      next: (response: PaginatedResponse<ExpenseResponseDto>) => {
        this.expensesTableData = response;
      },
      error: (err) => console.error('Error al cargar gastos:', err),
    });
  }

  onPageChange(event: PageEvent) {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;
    this.loadExpenses();
  }

  onHeaderAction(action: string) {
    switch (action) {
      case 'new':
        this.router.navigateByUrl('/gastos/nuevo');
        break;
      case 'upload':
        console.log('upload');
        break;
    }
  }

  onTableAction(action: string, data?: ExpenseResponseDto) {
    switch (action) {
      case 'edit':
        this.router.navigateByUrl('/gastos/editar/1');
        break;
      case 'delete':
        this.onDelete(data!)
        break;
    }
  }

  onDelete(expense: ExpenseResponseDto) {
    this.dialogService
      .confirm({
        message: `¿Quieres eliminar el gasto:\n"${expense.concept.trim()}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.expenseService.remove(expense.id).subscribe({
          next: () => this.loadExpenses(),
          error: (err) => console.error('Error al guardar gastos:', err),
        });
      });
  }

  get hasActiveFilters(): boolean {
    const f = this.formFilters.getRawValue();

    const hasDates = !!(f.dateRange?.startDate || f.dateRange?.endDate);
    const hasSuppliers = (f.suppliersIds?.length ?? 0) > 0;
    const hasProjects = (f.projectIds?.length ?? 0) > 0;
    const hasStatus = f.status_id !== '';
    const hasConcept = !!(f.concept && f.concept.trim() !== '');

    return hasDates || hasSuppliers || hasProjects || hasStatus || hasConcept;
  }

  clearAllAndSearch(): void {
    this.formFilters.reset({
      dateRange: null,
      suppliersIds: [],
      projectIds: [],
      status_id: '',
      concept: '',
    }, { emitEvent: false });

    this.filters = this.defaultFilters();
    this.loadExpenses();
  }

  private defaultFilters = (): FiltersExpenses => ({
    page: 1,
    limit: this.filters.limit,
    startDate: null,
    endDate: null,
    suppliersIds: [],
    projectIds: [],
    status_id: null,
    concept: '',
  });

  // ______________ SIN USO ______________

  expenseModal(expense?: ExpenseResponseDto) {
    this.dialogService
      .open(ExpenseModal, expense ? expense : null, 'medium')
      .afterClosed()
      .subscribe((result) => {
        if (result) this.loadExpenses();
      });
  }
}