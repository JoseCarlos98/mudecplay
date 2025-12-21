// src/app/modules/expenses/components/xmls-modal/xmls-modal.ts
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { DataTable } from '../../../../shared/ui/data-table/data-table';
import { ColumnsConfig } from '../../../../shared/ui/data-table/interfaces/table-interfaces';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';

import * as entity from '../../interfaces/expense-interfaces';

interface XmlsModalData {
  drafts: entity.XmlExpenseDraftDto[];
  duplicates: entity.XmlDuplicateDto[];
}

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

const COLUMNS_CONFIG: ColumnsConfig[] = [
  { key: 'sourceFileName', label: 'XML' },
  {
    key: 'supplier',
    label: 'Proveedor',
    type: 'relation',
    path: 'name',
  },
  { key: 'date', label: 'Fecha', type: 'date' },
  { key: 'total', label: 'Total', type: 'money', align: 'right' },
  { key: 'itemsCount', label: 'Productos', align: 'center' },
];

const DISPLAYED_COLUMNS: string[] = COLUMNS_CONFIG.map((c) => c.key);

@Component({
  selector: 'app-xmls-modal',
  standalone: true,
  imports: [
    CommonModule,
    ModuleHeader,
    DataTable,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    BtnsSection,
  ],
  templateUrl: './xmls-modal.html',
  styleUrl: './xmls-modal.scss',
})
export class XmlsModal {
  private readonly dialogRef = inject(MatDialogRef<XmlsModal>);
  private readonly data = inject<XmlsModalData>(MAT_DIALOG_DATA);
  private readonly router = inject(Router);

  readonly headerConfig = HEADER_CONFIG;
  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;

  readonly drafts: entity.XmlExpenseDraftDto[] = this.data?.drafts ?? [];
  readonly duplicates: entity.XmlDuplicateDto[] = this.data?.duplicates ?? [];

  readonly tableDrafts = this.drafts.map((d) => ({
    ...d,
    itemsCount: d.items.length,
  }));

  // paginación local
  pageIndex = 0;
  pageSize = 5;
  pageSizeOptions = [5, 10, 25];

  get paginatedDrafts() {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    return this.tableDrafts.slice(start, end);
  }

  onPageChange(ev: PageEvent): void {
    this.pageIndex = ev.pageIndex;
    this.pageSize = ev.pageSize;
  }

  // Footer
  onBtnsSectionAction(action: string) {
    switch (action) {
      case 'cancel':
        this.closeModal();
        break;
      case 'continue':
        this.onContinue();
        break;
    }
  }

  // Continuar: mandamos TODOS los drafts válidos para la cola
  onContinue(): void {
    if (!this.drafts.length) {
      this.closeModal();
      return;
    }

    this.dialogRef.close({
      action: 'import',
      drafts: this.drafts,
    });
  }

  onOpenDuplicate(expenseId: number): void {
    // Construimos la URL usando el router, por si la app no está en '/'
    const urlTree = this.router.createUrlTree(['/gastos/editar', expenseId]);
    const url = this.router.serializeUrl(urlTree);

    window.open(url, '_blank'); 
  }

  closeModal(): void {
    this.dialogRef.close();
  }
}
