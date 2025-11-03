import { Component, inject, OnInit } from '@angular/core';
import { ModuleHeader } from "../../shared/module-header/module-header";
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { DataTable } from '../../shared/data-table/data-table';
import { MatSelectModule } from '@angular/material/select';
import { ExpenseService } from './services/expense.service';
import { PaginatedResponse } from '../../shared/general-interfaces/general-interfaces';
import { ExpenseResponseDtoMapper, FiltersExpenses } from './interfaces/expense-interfaces';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ExpenseModal } from './expense-modal/expense-modal';

@Component({
  selector: 'app-expenses',
  imports: [CommonModule, DataTable, MatPaginatorModule, ModuleHeader, FormsModule, MatFormFieldModule, MatSelectModule, MatInputModule, ReactiveFormsModule, MatIconModule, MatTableModule, MatButtonModule],
  templateUrl: './expenses.html',
  styleUrl: './expenses.scss',
})
export class Expenses implements OnInit {
  private readonly dialog = inject(MatDialog);


  columnsConfig = [
    { key: 'concept', label: 'Concepto' },
    { key: 'date', label: 'Fecha' },
    { key: 'amount', label: 'Monto' },
    { key: 'supplier', label: 'Proveedor' },
    { key: 'project', label: 'Proyecto' }
  ];

  displayedColumns = ['concept', 'date', 'amount', 'supplier', 'project', 'actions'];

  filters: FiltersExpenses = { page: 1, limit: 10 };
  expensesTableData: PaginatedResponse<ExpenseResponseDtoMapper> | any = null;

  constructor(
    private readonly expenseService: ExpenseService,
    // private readonly dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.getExpensesForTable();
  }

  getExpensesForTable() {
    this.expenseService.getExpenses(this.filters).subscribe((response: PaginatedResponse<ExpenseResponseDtoMapper>) => {
      console.log('getExpensesForTable', response);
      this.expensesTableData = response;
    });
  }


  onHeaderAction(action: string) {
    switch (action) {
      case 'new':
        this.expenseModal(null);
        console.log('new');
        break;
      case 'upload':
        console.log('upload');
        // subir XML
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

  expenseModal(data: any) {
    this.dialog.open(ExpenseModal, {
      data: {
        data
      },
      width: '80vw',
      maxWidth: '700px',
      minHeight: '50vh'
    });
  }
}
