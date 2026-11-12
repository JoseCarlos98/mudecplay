
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

/*
 * Se conservan las 5 columnas ORIGINALES.
 * No agregamos columnas permanentes a la tabla.
 */
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

  /*
   * Mapper original de la tabla.
   * Sin alterar los XML recibidos desde el backend.
   */
  readonly tableDrafts = this.drafts.map((d) => ({
    ...d,
    itemsCount: d.items.length,
  }));

  // Paginación local ORIGINAL
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

  // =====================================================
  // NUEVO: DESGLOSE DE IMPUESTOS LOCALES
  // =====================================================

  /*
   * Solo un XML puede tener su desglose abierto
   * en cada momento.
   */
  expandedLocalTaxUuid: string | null = null;

  toggleLocalTaxDetails(uuid: string): void {
    this.expandedLocalTaxUuid =
      this.expandedLocalTaxUuid === uuid
        ? null
        : uuid;
  }

  /*
   * Determina si corresponde mostrar el apartado.
   *
   * Para CFDI normales, sin impuestos locales,
   * el modal conserva su presentación original.
   */
  hasLocalTaxes(draft: entity.XmlExpenseDraftDto): boolean {
    return (
      (draft.localTaxes?.length ?? 0) > 0 ||
      this.getLocalTaxTransfersTotal(draft) !== 0 ||
      this.getLocalTaxWithholdingsTotal(draft) !== 0
    );
  }

  /*
   * Prioriza el total declarado por el backend.
   * Si no está disponible, usa los importes
   * distribuidos entre conceptos.
   */
  getLocalTaxTransfersTotal(
    draft: entity.XmlExpenseDraftDto,
  ): number {
    if (
      draft.localTaxTransfersTotal !== null &&
      draft.localTaxTransfersTotal !== undefined
    ) {
      return this.roundMoney(draft.localTaxTransfersTotal);
    }

    return this.roundMoney(
      draft.items.reduce(
        (sum, item) =>
          sum + Number(item.local_tax_amount ?? 0),
        0,
      ),
    );
  }

  getLocalTaxWithholdingsTotal(
    draft: entity.XmlExpenseDraftDto,
  ): number {
    if (
      draft.localTaxWithholdingsTotal !== null &&
      draft.localTaxWithholdingsTotal !== undefined
    ) {
      return this.roundMoney(draft.localTaxWithholdingsTotal);
    }

    return this.roundMoney(
      draft.items.reduce(
        (sum, item) =>
          sum + Number(item.local_withheld_amount ?? 0),
        0,
      ),
    );
  }

  /*
   * Totales de desglose federal obtenidos de
   * los conceptos de la vista previa.
   *
   * Son solo para mostrar: no alteran el CFDI.
   */
  getFederalTaxTotal(
    draft: entity.XmlExpenseDraftDto,
  ): number {
    return this.sumItemField(draft, 'tax_amount');
  }

  getDiscountTotal(
    draft: entity.XmlExpenseDraftDto,
  ): number {
    return this.sumItemField(draft, 'discount_amount');
  }

  getFederalWithholdingTotal(
    draft: entity.XmlExpenseDraftDto,
  ): number {
    return this.sumItemField(draft, 'withheld_amount');
  }

  private sumItemField(
    draft: entity.XmlExpenseDraftDto,
    field: 'tax_amount' | 'discount_amount' | 'withheld_amount',
  ): number {
    return this.roundMoney(
      draft.items.reduce(
        (sum, item) => sum + Number(item[field] ?? 0),
        0,
      ),
    );
  }

  private roundMoney(value: unknown): number {
    const amount = Number(value ?? 0);

    return Number.isFinite(amount)
      ? Number(amount.toFixed(2))
      : 0;
  }

  // =====================================================
  // FOOTER ORIGINAL
  // =====================================================

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

  /*
   * Comportamiento ORIGINAL:
   * mandamos TODOS los drafts válidos para la cola.
   *
   * No hacemos ningún recálculo fiscal aquí.
   */
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
    const urlTree = this.router.createUrlTree([
      '/gastos/editar',
      expenseId,
    ]);

    const url = this.router.serializeUrl(urlTree);

    window.open(url, '_blank');
  }

  closeModal(): void {
    this.dialogRef.close();
  }
}
