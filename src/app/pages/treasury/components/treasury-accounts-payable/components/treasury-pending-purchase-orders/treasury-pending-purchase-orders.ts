import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  output,
  input,
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

  /** Recibe el movimiento seleccionado del panel izquierdo. */
  readonly bankMovement = input<entity.TreasuryAvailableOutflowTableRow | null>(null);

  /**
   * El padre conserva la selección entre páginas y cambios de modalidad.
   * Una partida figura una sola vez, aunque esté vinculada a varias O.C.
   */
  readonly selectedSelections = input<TreasuryPendingPurchaseOrderSelection[]>([]);
  readonly selectedItems = computed(() =>
    new Map<number, TreasuryPendingPurchaseOrderSelection>(
      this.selectedSelections().map(
        (selection): [number, TreasuryPendingPurchaseOrderSelection] => [
          selection.item.expense_item_id,
          selection,
        ],
      ),
    ),
  );

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

  /** Comparación informativa; NO representa aún un pago aplicado. */
  readonly movementAvailable = computed(() =>
    Math.max(roundMoney(Number(this.bankMovement()?.available_amount ?? 0)), 0),
  );
  readonly bankCoverageDifference = computed(() =>
    roundMoney(this.movementAvailable() - this.selectedPendingAmount()),
  );
  readonly bankShortfall = computed(() =>
    Math.max(-this.bankCoverageDifference(), 0),
  );
  readonly bankSurplus = computed(() =>
    Math.max(this.bankCoverageDifference(), 0),
  );
  readonly maximumPossibleAbono = computed(() =>
    Math.min(this.movementAvailable(), this.selectedPendingAmount()),
  );
  readonly canFullyCoverSelection = computed(() =>
    this.bankMovement() !== null &&
    this.selectedItemsCount() > 0 &&
    this.bankShortfall() === 0,
  );

  /** Número de conceptos seleccionados que no están visibles en la página actual. */
  readonly selectionsOnOtherPages = computed(() => {
    const currentIds = new Set(
      this.tableData().data.flatMap((order) =>
        order.items.map((item) => item.expense_item_id),
      ),
    );
    return Array.from(this.selectedItems().keys()).filter(
      (id) => !currentIds.has(id),
    ).length;
  });

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
    // La selección se conserva entre páginas. Al volver a una página,
    // se sincronizan o quitan conceptos cuyo saldo cambió.
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
          this.reconcileVisibleSelections(response);
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
    this.selectionChange.emit(Array.from(selection.values()));
  }

  /**
   * Revalida SOLO los conceptos de las O.C. devueltas en la página actual.
   * Los de otras páginas permanecen seleccionados hasta volver a consultarlos.
   * Antes de aplicar pagos, el backend debe comprobar otra vez los saldos.
   */
  private reconcileVisibleSelections(
    response: entity.TreasuryPendingPurchaseOrdersResponse,
  ): void {
    if (this.selectedItems().size === 0) return;

    const next = new Map(this.selectedItems());
    let changed = false;

    for (const order of response.data) {
      for (const item of order.items) {
        const current = next.get(item.expense_item_id);
        if (!current) continue;

        if (!item.is_selectable || Number(item.pending_amount) <= 0) {
          next.delete(item.expense_item_id);
          changed = true;
          continue;
        }

        if (
          current.item.pending_amount !== item.pending_amount ||
          current.item.paid_amount !== item.paid_amount ||
          current.item.amount !== item.amount
        ) {
          next.set(item.expense_item_id, {
            purchase_order_id: order.purchase_order_id,
            folio: order.folio,
            item,
          });
          changed = true;
        }
      }
    }

    if (changed) this.updateSelection(next);
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
