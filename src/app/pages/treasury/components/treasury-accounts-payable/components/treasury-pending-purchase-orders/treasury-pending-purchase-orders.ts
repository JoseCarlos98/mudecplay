import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { finalize } from 'rxjs';

import * as entity from '../../interfaces/treasury-accounts-payable.interfaces';
import { TreasuryAccountsPayableService } from '../../services/treasury-accounts-payable.service';
import { roundMoney } from '../../../../../../shared/helpers/general-helpers';

/** Concepto seleccionado para una conciliación por O.C. futura. */
export interface TreasuryPendingPurchaseOrderSelection {
  purchase_order_id: number;
  folio: string;
  item: entity.TreasuryPendingPurchaseOrderItem;
}

@Component({
  selector: 'app-treasury-pending-purchase-orders',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatPaginatorModule,
  ],
  templateUrl: './treasury-pending-purchase-orders.html',
  styleUrl: './treasury-pending-purchase-orders.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreasuryPendingPurchaseOrders implements OnInit {
  private readonly accountsPayableService = inject(TreasuryAccountsPayableService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly expandedOrderId = signal<number | null>(null);

  /**
   * Selección LOCAL por ID de concepto; no registra pagos.
   * Se reutilizará desde el padre en el siguiente paso.
   * Evita sumar dos veces un concepto si aparece en más de una O.C.
   */
  readonly selectedItems = signal<
    ReadonlyMap<number, TreasuryPendingPurchaseOrderSelection>
  >(new Map<number, TreasuryPendingPurchaseOrderSelection>());

  readonly selectionChange = output<TreasuryPendingPurchaseOrderSelection[]>();

  readonly selectedItemsCount = computed(() => this.selectedItems().size);

  readonly selectedPendingAmount = computed(() =>
    roundMoney(
      Array.from(this.selectedItems().values()).reduce(
        (sum, selection) => sum + Number(selection.item.pending_amount || 0),
        0,
      ),
    ),
  );

  readonly filters = signal<entity.TreasuryPendingPurchaseOrderFilters>({
    page: 1,
    limit: 10,
    sorts: [],
  });

  readonly tableData = signal<entity.TreasuryPendingPurchaseOrdersResponse>({
    data: [],
    summary: {
      orders_count: 0,
      items_count: 0,
      pending_items_count: 0,
      paid_items_count: 0,
      original_amount: 0,
      paid_amount: 0,
      pending_amount: 0,
    },
    meta: {
      page: 1,
      limit: 10,
      total: 0,
      total_pages: 0,
    },
  });

  // Evita que una respuesta antigua reemplace la página actual.
  private requestSequence = 0;

  ngOnInit(): void {
    this.loadPendingPurchaseOrders();
  }

  loadPendingPurchaseOrders(): void {
    // Tras una recarga, se evita conservar saldos que pudieron cambiar.
    this.clearSelection();

    const requestSequence = ++this.requestSequence;
    const filters = { ...this.filters() };

    this.loading.set(true);
    this.loadError.set(false);

    this.accountsPayableService
      .getPendingPurchaseOrders(filters)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestSequence === this.requestSequence) {
            this.loading.set(false);
          }
        }),
      )
      .subscribe({
        next: (response) => {
          if (requestSequence !== this.requestSequence) {
            return;
          }

          this.tableData.set(response);
          this.expandedOrderId.set(null);
        },
        error: (error: unknown) => {
          if (requestSequence !== this.requestSequence) {
            return;
          }

          this.loadError.set(true);
          console.error('Error cargando órdenes de compra pendientes:', error);
        },
      });
  }

  toggleOrder(orderId: number): void {
    this.expandedOrderId.update((current) =>
      current === orderId ? null : orderId,
    );
  }

  /** Solo conceptos vinculados con saldo pendiente pueden seleccionarse. */
  getSelectableItems(
    order: entity.TreasuryPendingPurchaseOrder,
  ): entity.TreasuryPendingPurchaseOrderItem[] {
    return order.items.filter(
      (item) => item.is_selectable && Number(item.pending_amount) > 0,
    );
  }

  isItemSelected(expenseItemId: number): boolean {
    return this.selectedItems().has(expenseItemId);
  }

  getSelectedOrderItemsCount(order: entity.TreasuryPendingPurchaseOrder): number {
    return this.getSelectableItems(order).filter((item) =>
      this.isItemSelected(item.expense_item_id),
    ).length;
  }

  isOrderSelected(order: entity.TreasuryPendingPurchaseOrder): boolean {
    const items = this.getSelectableItems(order);
    return items.length > 0 && items.every((item) =>
      this.isItemSelected(item.expense_item_id),
    );
  }

  isOrderPartiallySelected(order: entity.TreasuryPendingPurchaseOrder): boolean {
    const selectableCount = this.getSelectableItems(order).length;
    const selectedCount = this.getSelectedOrderItemsCount(order);
    return selectedCount > 0 && selectedCount < selectableCount;
  }

  onOrderSelectionChange(
    order: entity.TreasuryPendingPurchaseOrder,
    event: Event,
  ): void {
    const checked = (event.target as HTMLInputElement).checked;
    const selection = new Map(this.selectedItems());

    for (const item of this.getSelectableItems(order)) {
      if (checked) {
        // Una partida nunca se duplica si está vinculada a varias O.C.
        if (!selection.has(item.expense_item_id)) {
          selection.set(item.expense_item_id, {
            purchase_order_id: order.purchase_order_id,
            folio: order.folio,
            item,
          });
        }
      } else {
        selection.delete(item.expense_item_id);
      }
    }

    this.updateSelection(selection);
  }

  onItemSelectionChange(
    order: entity.TreasuryPendingPurchaseOrder,
    item: entity.TreasuryPendingPurchaseOrderItem,
    event: Event,
  ): void {
    // El backend es la fuente del saldo; el UI nunca habilita pagados.
    if (!item.is_selectable || Number(item.pending_amount) <= 0) {
      return;
    }

    const checked = (event.target as HTMLInputElement).checked;
    const selection = new Map(this.selectedItems());

    if (checked) {
      if (!selection.has(item.expense_item_id)) {
        selection.set(item.expense_item_id, {
          purchase_order_id: order.purchase_order_id,
          folio: order.folio,
          item,
        });
      }
    } else {
      selection.delete(item.expense_item_id);
    }

    this.updateSelection(selection);
  }

  clearSelection(): void {
    if (this.selectedItems().size === 0) {
      return;
    }

    this.updateSelection(new Map<number, TreasuryPendingPurchaseOrderSelection>());
  }

  private updateSelection(
    selection: Map<number, TreasuryPendingPurchaseOrderSelection>,
  ): void {
    this.selectedItems.set(selection);
    this.selectionChange.emit(Array.from(selection.values()));
  }

  onPageChange(event: PageEvent): void {
    this.filters.update((filters) => ({
      ...filters,
      page: event.pageIndex + 1,
      limit: event.pageSize,
    }));

    this.loadPendingPurchaseOrders();
  }

  getPaymentStatusLabel(
    status: entity.TreasuryPendingPurchaseOrderPaymentStatus,
  ): string {
    switch (status) {
      case 'paid':
        return 'Pagado';
      case 'partial':
        return 'Parcial';
      case 'unpaid':
        return 'Pendiente';
      default:
        return 'Sin importe';
    }
  }
}
