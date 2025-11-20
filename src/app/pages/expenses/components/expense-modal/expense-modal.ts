import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { toApiDate, toIdForm } from '../../../../shared/helpers/general-helpers';
import { ExpenseService } from '../../services/expense.service';
import { ExpenseItem, PatchExpense } from '../../interfaces/expense-interfaces';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { DataTable } from '../../../../shared/ui/data-table/data-table';
import { ColumnsConfig } from '../../../../shared/ui/data-table/interfaces/table-interfaces';
import { MatPaginatorModule } from '@angular/material/paginator';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true
};

const COLUMNS_CONFIG: ColumnsConfig[] = [
  { key: 'concept', label: 'Concepto' },
  { key: 'amount', label: 'Monto', type: 'money', align: 'right' },
  {
    key: 'project',
    label: 'Proyecto',
    type: 'relation',
    path: 'name',
    fallback: 'Sin asignar'
  },
];

const DISPLAYED_COLUMNS: string[] = [
  ...COLUMNS_CONFIG.map((c) => c.key),
];

@Component({
  selector: 'app-expense-modal',
  imports: [CommonModule, MatDatepickerModule, ModuleHeader, MatIconModule,
    MatFormFieldModule, MatInputModule, ReactiveFormsModule, DataTable,
    MatPaginatorModule
  ],
  templateUrl: './expense-modal.html',
})
export class ExpenseModal implements OnInit {
  private readonly expenseService = inject(ExpenseService);
  readonly data: any = inject<ExpenseItem>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ExpenseModal>);
  private readonly fb = inject(FormBuilder);
  readonly headerConfig = HEADER_CONFIG;

  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;


  ngOnInit(): void {
    console.log(this.data);
  }


  closeModal(saved?: boolean) {
    this.dialogRef.close(!!saved);
  }
}
