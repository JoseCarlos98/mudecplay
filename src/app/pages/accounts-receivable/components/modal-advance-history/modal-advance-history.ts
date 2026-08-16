import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { DataTable } from '../../../../shared/ui/data-table/data-table';
import { ColumnsConfig } from '../../../../shared/ui/data-table/interfaces/table-interfaces';

import { AccountsReceivableService } from '../../services/accounts-receivable.service';
import {
  AccountReceivableAdvance,
  AccountReceivableDetail,
  AccountReceivableRow,
} from '../../interfaces/accounts-receivable-interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

const COLUMNS_CONFIG: ColumnsConfig[] = [
  { key: 'amount', label: 'Anticipo', type: 'money', align: 'right' },
  { key: 'advance_date', label: 'Fecha de anticipo', type: 'date' },
];

const DISPLAYED_COLUMNS: string[] = COLUMNS_CONFIG.map((c) => c.key);

@Component({
  selector: 'app-modal-advance-history',
  standalone: true,
  imports: [
    CommonModule,
    ModuleHeader,
    DataTable,
    MatPaginatorModule,
  ],
  templateUrl: './modal-advance-history.html',
  styleUrl: './modal-advance-history.scss',
})
export class ModalAdvanceHistory implements OnInit {
  readonly data = inject<AccountReceivableRow>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ModalAdvanceHistory>);
  private readonly accountsReceivableService = inject(AccountsReceivableService);

  readonly headerConfig = HEADER_CONFIG;
  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;

  detail: AccountReceivableDetail | null = null;
  advances: AccountReceivableAdvance[] = [];
  loading = false;

  pageIndex = 0;
  pageSize = 5;
  readonly pageSizeOptions = [5, 10, 25, 50];

  ngOnInit(): void {
    this.loadHistory();
  }

  get paginatedItems(): AccountReceivableAdvance[] {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    return this.advances.slice(start, end);
  }

  get totalAmount(): number {
    return this.advances.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  }

  get invoiceDisplay(): string {
    const series = this.detail?.series ?? this.data?.series ?? null;
    const folio = this.detail?.folio ?? this.data?.folio ?? '';
    return series ? `${series}-${folio}` : `${folio}`;
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  loadHistory(): void {
    this.loading = true;

    this.accountsReceivableService.getById(this.data.id).subscribe({
      next: (response) => {
        this.detail = response;
        this.advances = [...(response.advances ?? [])];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar historial de anticipos:', err);
        this.loading = false;
      },
    });
  }

  closeModal(saved?: boolean): void {
    this.dialogRef.close(!!saved);
  }
}