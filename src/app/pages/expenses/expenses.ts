import { Component, OnInit } from '@angular/core';
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
import { ExpenseResponseDtoMapper } from './interfaces/expense-interfaces';
interface UserData {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
}
@Component({
  selector: 'app-expenses',
  imports: [DataTable, MatPaginatorModule, ModuleHeader, FormsModule, MatFormFieldModule, MatSelectModule, MatInputModule, ReactiveFormsModule, MatIconModule, MatTableModule, MatButtonModule],
  templateUrl: './expenses.html',
  styleUrl: './expenses.scss',
})
export class Expenses implements OnInit {
  columnsConfig = [
    { key: 'concept', label: 'Concepto' },
    { key: 'date', label: 'Fecha' },
    { key: 'amount', label: 'Monto' },
    { key: 'supplier', label: 'Proveedor' },
    { key: 'project', label: 'Proyecto' }
  ];

  displayedColumns = ['concept', 'date', 'amount', 'supplier', 'project', 'actions'];

  expensesTableData: ExpenseResponseDtoMapper[] = [];

  constructor(
    private readonly expenseService: ExpenseService
  ) { }

  ngOnInit(): void {
    this.getExpensesForTable();
  }

  getExpensesForTable() {
    this.expenseService.getExpenses().subscribe((response: PaginatedResponse<ExpenseResponseDtoMapper>) => {
      console.log('getExpensesForTable', response);
      this.expensesTableData = response.data;
    });
  }

  onEdit(user: any) {
    console.log('Editar', user);
  }

  onDelete(user: any) {
    console.log('Eliminar', user);
  }
}
