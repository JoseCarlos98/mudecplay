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

import * as entity from '../../interfaces/accounts-receivable-interfaces';

interface ReceivableXmlsModalData {
  drafts: entity.XmlAccountReceivableDraftDto[];
  duplicates: entity.XmlAccountReceivableDuplicateDto[];
}

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

const COLUMNS_CONFIG: ColumnsConfig[] = [
  { key: 'sourceFileName', label: 'XML' },
  { key: 'companyLabel', label: 'Empresa', type: 'chip', typeVariant: 'chip-neutral' },
  { key: 'receiverName', label: 'Cliente' },
  { key: 'invoiceDisplay', label: 'Factura' },
  { key: 'issueDate', label: 'Fecha', type: 'date' },
  { key: 'total', label: 'Total', type: 'money', align: 'right' },
];

const DISPLAYED_COLUMNS: string[] = COLUMNS_CONFIG.map((c) => c.key);

@Component({
  selector: 'app-modal-receivable-xml',
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
  templateUrl: './modal-receivable-xml.html',
  styleUrl: './modal-receivable-xml.scss',
})
export class ModalReceivableXml {
  private readonly dialogRef = inject(MatDialogRef<ModalReceivableXml>);
  private readonly data = inject<ReceivableXmlsModalData>(MAT_DIALOG_DATA);
  private readonly router = inject(Router);

  readonly headerConfig = HEADER_CONFIG;
  readonly columnsConfig = COLUMNS_CONFIG;
  readonly displayedColumns = DISPLAYED_COLUMNS;

  readonly drafts: entity.XmlAccountReceivableDraftDto[] = this.data?.drafts ?? [];
  readonly duplicates: entity.XmlAccountReceivableDuplicateDto[] = this.data?.duplicates ?? [];

  readonly tableDrafts = this.drafts.map((d) => ({
    ...d,
    companyLabel: this.resolveCompanyLabel(d.companyCode),
    receiverName: d.receiverName,
    invoiceDisplay: d.series ? `${d.series}-${d.folio}` : d.folio,
  }));

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

  onBtnsSectionAction(action: string): void {
    switch (action) {
      case 'cancel':
        this.closeModal();
        break;
      case 'continue':
        this.onContinue();
        break;
    }
  }

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

  onOpenDuplicate(accountReceivableId: number): void {
    // Ajusta esta ruta cuando tengas la vista detalle/edición del módulo.
    const urlTree = this.router.createUrlTree(['/cuentas-por-cobrar']);
    const url = this.router.serializeUrl(urlTree);
    window.open(url, '_blank');
  }

  closeModal(): void {
    this.dialogRef.close();
  }

  private resolveCompanyLabel(code: string): string {
    switch (code) {
      case 'MUDECPLAY':
        return 'MUDECPLAY';
      case 'CONSTRUCTORA_PELEN':
        return 'CONSTRUCTORA PELEN';
      default:
        return code || 'OTRA';
    }
  }
}