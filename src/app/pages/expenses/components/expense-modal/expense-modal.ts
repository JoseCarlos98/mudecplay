import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { DataTable } from '../../../../shared/ui/data-table/data-table';
import { ColumnsConfig } from '../../../../shared/ui/data-table/interfaces/table-interfaces';
import { ExpenseItem } from '../../interfaces/expense-interfaces';

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
    fallback: 'Sin asignar',
  },
];

const DISPLAYED_COLUMNS: string[] = COLUMNS_CONFIG.map(c => c.key);

@Component({
  selector: 'app-expense-modal',
  standalone: true,
  imports: [
    CommonModule,
    ModuleHeader,
    MatIconModule,
    DataTable,
    MatPaginatorModule,
  ],
  templateUrl: './expense-modal.html',
})
export class ExpenseModal implements OnInit {
  readonly items = inject<ExpenseItem[]>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ExpenseModal>);

  readonly headerConfig = HEADER_CONFIG;
  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;

  // Estado de paginación local
  pageIndex = 0;
  pageSize = 5;
  readonly pageSizeOptions = [5, 10, 25, 50];

  ngOnInit(): void {
    console.log('Items recibidos en modal:', this.items);
  }

  // Slice local de los datos según la página actual
  get paginatedItems(): ExpenseItem[] {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    return this.items.slice(start, end);
  }

  // Maneja cambios del paginador
  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  closeModal(saved?: boolean) {
    this.dialogRef.close(!!saved);
  }
}
