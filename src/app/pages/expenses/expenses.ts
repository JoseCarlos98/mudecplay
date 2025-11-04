import { Component, inject, OnInit } from '@angular/core';
import { ModuleHeader, ModuleHeaderConfig } from "../../shared/ui/module-header/module-header";
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { DataTable } from '../../shared/ui/data-table/data-table';
import { MatSelectModule } from '@angular/material/select';
import { ExpenseService } from './services/expense.service';
import { ColumnsConfig, PaginatedResponse } from '../../shared/interfaces/general-interfaces';
import { ExpenseResponseDtoMapper, FiltersExpenses } from './interfaces/expense-interfaces';
import { CommonModule } from '@angular/common';
import { ExpenseModal } from './expense-modal/expense-modal';
import { DialogService } from '../../shared/services/dialog.service';

// 👇 Definimos las columnas fuera de la clase, como constantes inmutables
const COLUMNS_CONFIG: ColumnsConfig[] = [
  { key: 'concept', label: 'Concepto' },
  { key: 'date', label: 'Fecha' },
  { key: 'amount', label: 'Monto' },
  { key: 'supplier', label: 'Proveedor' },
  { key: 'project', label: 'Proyecto' },
];

const DISPLAYED_COLUMNS: string[] = [
  ...COLUMNS_CONFIG.map(c => c.key),
  'actions',
];

const HEADER_CONFIG: ModuleHeaderConfig = {
  showNew: true,
  showUploadXml: true
};

@Component({
  selector: 'app-expenses',
  imports: [CommonModule, DataTable, MatPaginatorModule, ModuleHeader, FormsModule, MatFormFieldModule, MatSelectModule, MatInputModule, ReactiveFormsModule, MatIconModule, MatTableModule, MatButtonModule],
  templateUrl: './expenses.html',
  styleUrl: './expenses.scss',
})
export class Expenses implements OnInit {
  private readonly expenseService = inject(ExpenseService);
  private readonly dialogService = inject(DialogService);

  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;
  readonly headerConfig = HEADER_CONFIG;

  filters: FiltersExpenses = { page: 1, limit: 10 };
  expensesTableData!: PaginatedResponse<ExpenseResponseDtoMapper>;

  ngOnInit(): void {
    this.getExpensesForTable();
  }

  getExpensesForTable(): void {
    this.expenseService.getExpenses(this.filters).subscribe({
      next: (response) => (this.expensesTableData = response),
      error: (err) => console.error('Error al cargar gastos:', err)
    });
  }

  onHeaderAction(action: string) {
    switch (action) {
      case 'new':
        this.expenseModal();
        break;
      case 'upload':
        console.log('upload');
        break;
    }
  }

  onEdit(user: any) {
    console.log('Editar', user);
    this.expenseModal(user);
  }

  onDelete(user: any) {
    console.log('Eliminar', user);
  }

  expenseModal(expense?: ExpenseResponseDtoMapper) {
    this.dialogService.open(ExpenseModal, expense ? { expense } : null, 'medium')
      .afterClosed().subscribe((result) => {
        if (result) this.getExpensesForTable();
      });;
  }
}
