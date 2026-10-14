import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { finalize } from 'rxjs';

import * as entity from '../../interfaces/treasury-accounts-payable.interfaces';
import { TreasuryAccountsPayableService } from '../../services/treasury-accounts-payable.service';
import { roundMoney } from '../../../../../../shared/helpers/general-helpers';

/** Una intención de conciliación, todavía no una aplicación de pago. */
export interface TreasuryPendingPurchaseOrderSelection {
  purchase_order_id: number;
  folio: string;
  item: entity.TreasuryPendingPurchaseOrderItem;
}

type SelectionMode = 'bank' | 'cash';
type SortValue =
  | 'created_at:desc'
  | 'created_at:asc'
  | 'pending_amount:desc'
  | 'pending_amount:asc'
  | 'folio:asc'
  | 'folio:desc';

interface LookupOption {
  id: number;
  name: string;
}

@Component({
  selector: 'app-treasury-pending-purchase-orders',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatPaginatorModule],
  templateUrl: './treasury-pending-purchase-orders.html',
  styleUrl: './treasury-pending-purchase-orders.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreasuryPendingPurchaseOrders implements OnInit {
  private readonly accountsPayableService = inject(TreasuryAccountsPayableService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly bankMovement = input<entity.TreasuryAvailableOutflowTableRow | null>(null);

  /** El componente padre conserva ambas selecciones entre páginas y pestañas. */
  readonly selectedSelections = input<TreasuryPendingPurchaseOrderSelection[]>([]);
  readonly cashSelections = input<TreasuryPendingPurchaseOrderSelection[]>([]);

  /** IDs en uso por la pestaña tradicional: no ofrecerlos de nuevo aquí. */
  readonly unavailableItemIds = input<number[]>([]);

  readonly selectionChange = output<TreasuryPendingPurchaseOrderSelection[]>();
  readonly cashSelectionChange = output<TreasuryPendingPurchaseOrderSelection[]>();

  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly expandedOrderId = signal<number | null>(null);
  readonly supplierOptions = signal<LookupOption[]>([]);
  readonly selectedSupplierIds = signal<number[]>([]);
  readonly projectOptions = signal<LookupOption[]>([]);

  readonly filterForm = this.fb.group({
    date_from: this.fb.nonNullable.control(''),
    date_to: this.fb.nonNullable.control(''),
    search: this.fb.nonNullable.control(''),
    amount: this.fb.nonNullable.control(''),
    project_id: this.fb.nonNullable.control(''),
    sort: this.fb.nonNullable.control<SortValue>('created_at:desc'),
  });

  readonly filters = signal<entity.TreasuryPendingPurchaseOrderFilters>({
    page: 1,
    limit: 10,
    search: '',
    amount: null,
    supplier_id: null,
    project_id: null,
    date_from: null,
    date_to: null,
    sorts: [{ key: 'created_at', direction: 'desc' }],
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
    meta: { page: 1, limit: 10, total: 0, total_pages: 0 },
  });

  private requestSequence = 0;

  readonly bankSelected = computed(() => new Map<number, TreasuryPendingPurchaseOrderSelection>(
    this.selectedSelections().map((value) => [value.item.expense_item_id, value]),
  ));
  readonly cashSelected = computed(() => new Map<number, TreasuryPendingPurchaseOrderSelection>(
    this.cashSelections().map((value) => [value.item.expense_item_id, value]),
  ));
  readonly unavailableIdsSet = computed(() => new Set(this.unavailableItemIds()));

  readonly bankItemsCount = computed(() => this.bankSelected().size);
  readonly cashItemsCount = computed(() => this.cashSelected().size);
  readonly bankPendingAmount = computed(() => this.sumPending(this.bankSelected()));
  readonly cashPendingAmount = computed(() => this.sumPending(this.cashSelected()));
  readonly cashOrdersCount = computed(() => new Set(
    this.cashSelections().map((value) => value.purchase_order_id),
  ).size);

  readonly movementAvailable = computed(() => Math.max(
    roundMoney(Number(this.bankMovement()?.available_amount ?? 0)), 0,
  ));
  readonly maximumPossibleAbono = computed(() => Math.min(
    this.movementAvailable(), this.bankPendingAmount(),
  ));
  readonly bankShortfall = computed(() => Math.max(
    roundMoney(this.bankPendingAmount() - this.movementAvailable()), 0,
  ));
  readonly bankSurplus = computed(() => Math.max(
    roundMoney(this.movementAvailable() - this.bankPendingAmount()), 0,
  ));
  readonly canFullyCoverSelection = computed(() =>
    this.bankMovement() !== null && this.bankItemsCount() > 0 && this.bankShortfall() === 0,
  );

  readonly selectedOnOtherPages = computed(() => {
    const ids = new Set(this.tableData().data.flatMap((order) =>
      order.items.map((item) => item.expense_item_id),
    ));
    return [...this.bankSelected().keys()].filter((id) => !ids.has(id)).length;
  });
  readonly cashOnOtherPages = computed(() => {
    const ids = new Set(this.tableData().data.flatMap((order) =>
      order.items.map((item) => item.expense_item_id),
    ));
    return [...this.cashSelected().keys()].filter((id) => !ids.has(id)).length;
  });

  readonly hasActiveFilters = computed(() => {
    const value = this.filters();
    return Boolean(value.search?.trim() || value.amount != null ||
      value.supplier_ids?.length || value.project_id || value.date_from || value.date_to ||
      value.sorts?.[0]?.key !== 'created_at' || value.sorts?.[0]?.direction !== 'desc');
  });

  ngOnInit(): void {
    this.loadLookupOptions();
    this.loadPendingPurchaseOrders();
  }

  /**
   * Obtiene opciones de proveedor/proyecto a partir de las primeras 100 O.C.
   * No existe un endpoint de catálogos de O.C. confirmado en los archivos.
   * El buscador libre sí consulta todas las O.C. en el backend.
   */
  private loadLookupOptions(): void {
    this.accountsPayableService.getPendingPurchaseOrders({
      page: 1, limit: 100, sorts: [{ key: 'created_at', direction: 'desc' }],
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => this.captureOptions(response),
      error: (error: unknown) => console.warn('No se pudieron cargar opciones de O.C.:', error),
    });
  }

  private captureOptions(response: entity.TreasuryPendingPurchaseOrdersResponse): void {
    const suppliers = new Map(this.supplierOptions().map((value) => [value.id, value]));
    const projects = new Map(this.projectOptions().map((value) => [value.id, value]));
    for (const order of response.data ?? []) {
      if (order.project?.id) {
        projects.set(order.project.id, {
          id: order.project.id, name: order.project.name || `Proyecto ${order.project.id}`,
        });
      }
      for (const item of order.items) {
        if (item.supplier?.id) {
          suppliers.set(item.supplier.id, {
            id: item.supplier.id,
            name: item.supplier.company_name || item.supplier.name || `Proveedor ${item.supplier.id}`,
          });
        }
        if (item.project?.id) {
          projects.set(item.project.id, {
            id: item.project.id, name: item.project.name || `Proyecto ${item.project.id}`,
          });
        }
      }
    }
    this.supplierOptions.set([...suppliers.values()].sort((a, b) => a.name.localeCompare(b.name)));
    this.projectOptions.set([...projects.values()].sort((a, b) => a.name.localeCompare(b.name)));
  }

  loadPendingPurchaseOrders(): void {
    const requestSequence = ++this.requestSequence;
    const filters = { ...this.filters(), sorts: [...(this.filters().sorts ?? [])] };
    this.loading.set(true);
    this.loadError.set(false);

    this.accountsPayableService.getPendingPurchaseOrders(filters)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => {
        if (requestSequence === this.requestSequence) this.loading.set(false);
      }))
      .subscribe({
        next: (response) => {
          if (requestSequence !== this.requestSequence) return;
          this.tableData.set(response);
          this.captureOptions(response);
          this.reconcileVisibleSelections(response);
          this.expandedOrderId.set(null);
        },
        error: (error: unknown) => {
          if (requestSequence !== this.requestSequence) return;
          this.loadError.set(true);
          console.error('Error cargando órdenes de compra pendientes:', error);
        },
      });
  }

  search(): void {
    const value = this.filterForm.getRawValue();
    const amountText = String(value.amount ?? '').trim();
    const parsedAmount = amountText === '' ? null : Number(amountText);
    if (parsedAmount !== null && (!Number.isFinite(parsedAmount) || parsedAmount < 0)) {
      this.filterForm.controls.amount.setErrors({ invalid: true });
      return;
    }
    if (value.date_from && value.date_to && value.date_from > value.date_to) {
      this.filterForm.controls.date_to.setErrors({ invalidRange: true });
      return;
    }
    const [key, direction] = value.sort.split(':') as [string, 'asc' | 'desc'];
    this.filters.update((current) => ({
      ...current,
      page: 1,
      search: value.search.trim(),
      amount: parsedAmount,
      supplier_id: null,
      supplier_ids: [...this.selectedSupplierIds()],
      project_id: value.project_id ? Number(value.project_id) : null,
      date_from: value.date_from || null,
      date_to: value.date_to || null,
      sorts: [{ key, direction }],
    }));
    this.loadPendingPurchaseOrders();
  }

  clearFilters(): void {
    this.filterForm.reset({
      date_from: '', date_to: '', search: '', amount: '',
      project_id: '', sort: 'created_at:desc',
    });
    this.selectedSupplierIds.set([]);
    this.filters.update((current) => ({
      ...current,
      page: 1,
      search: '', amount: null, supplier_id: null, supplier_ids: [],
      project_id: null, date_from: null, date_to: null,
      sorts: [{ key: 'created_at', direction: 'desc' }],
    }));
    this.loadPendingPurchaseOrders();
  }

  toggleSupplierId(supplierId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedSupplierIds.update((current) =>
      checked ? [...new Set([...current, supplierId])] : current.filter((id) => id !== supplierId),
    );
  }

  toggleOrder(orderId: number): void {
    this.expandedOrderId.update((current) => current === orderId ? null : orderId);
  }

  getSelectableItems(order: entity.TreasuryPendingPurchaseOrder): entity.TreasuryPendingPurchaseOrderItem[] {
    return order.items.filter((item) => item.is_selectable && Number(item.pending_amount) > 0);
  }

  isItemSelected(expenseItemId: number, mode: SelectionMode): boolean {
    return (mode === 'bank' ? this.bankSelected() : this.cashSelected()).has(expenseItemId);
  }

  isItemDisabled(expenseItemId: number, mode: SelectionMode): boolean {
    return this.unavailableIdsSet().has(expenseItemId) ||
      (mode === 'bank' ? this.cashSelected().has(expenseItemId) : this.bankSelected().has(expenseItemId));
  }

  getOrderSelectedCount(order: entity.TreasuryPendingPurchaseOrder, mode: SelectionMode): number {
    return this.getSelectableItems(order).filter((item) => this.isItemSelected(item.expense_item_id, mode)).length;
  }

  isOrderSelected(order: entity.TreasuryPendingPurchaseOrder, mode: SelectionMode): boolean {
    const selectable = this.getSelectableItems(order);
    return selectable.length > 0 && selectable.every((item) => this.isItemSelected(item.expense_item_id, mode));
  }

  isOrderPartial(order: entity.TreasuryPendingPurchaseOrder, mode: SelectionMode): boolean {
    return this.getOrderSelectedCount(order, mode) > 0 && !this.isOrderSelected(order, mode);
  }

  isOrderDisabled(order: entity.TreasuryPendingPurchaseOrder, mode: SelectionMode): boolean {
    return this.getSelectableItems(order).every((item) => this.isItemDisabled(item.expense_item_id, mode));
  }

  onOrderSelectionChange(order: entity.TreasuryPendingPurchaseOrder, mode: SelectionMode, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const selected = new Map(mode === 'bank' ? this.bankSelected() : this.cashSelected());
    for (const item of this.getSelectableItems(order)) {
      if (checked && !this.isItemDisabled(item.expense_item_id, mode) &&
        (mode !== 'cash' || selected.size < 200 || selected.has(item.expense_item_id))) {
        selected.set(item.expense_item_id, { purchase_order_id: order.purchase_order_id, folio: order.folio, item });
      } else if (!checked) {
        selected.delete(item.expense_item_id);
      }
    }
    this.emitSelection(mode, selected);
  }

  onItemSelectionChange(order: entity.TreasuryPendingPurchaseOrder,
    item: entity.TreasuryPendingPurchaseOrderItem, mode: SelectionMode, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (!item.is_selectable || Number(item.pending_amount) <= 0 || this.isItemDisabled(item.expense_item_id, mode)) return;
    const selected = new Map(mode === 'bank' ? this.bankSelected() : this.cashSelected());
    if (checked && (mode !== 'cash' || selected.size < 200 || selected.has(item.expense_item_id))) {
      selected.set(item.expense_item_id, { purchase_order_id: order.purchase_order_id, folio: order.folio, item });
    } else {
      selected.delete(item.expense_item_id);
    }
    this.emitSelection(mode, selected);
  }

  /** Marca para efectivo las partidas libres de la página, sin alterar la selección bancaria. */
  selectPageForCash(): void {
    const next = new Map(this.cashSelected());
    for (const order of this.tableData().data) {
      for (const item of this.getSelectableItems(order)) {
        if (next.size >= 200) break;
        if (this.isItemDisabled(item.expense_item_id, 'cash')) continue;
        if (!next.has(item.expense_item_id)) {
          next.set(item.expense_item_id, {
            purchase_order_id: order.purchase_order_id,
            folio: order.folio,
            item,
          });
        }
      }
    }
    this.emitSelection('cash', next);
  }

  clearSelection(mode: SelectionMode): void {
    if (mode === 'bank' && this.bankItemsCount() === 0) return;
    if (mode === 'cash' && this.cashItemsCount() === 0) return;
    this.emitSelection(mode, new Map<number, TreasuryPendingPurchaseOrderSelection>());
  }

  private emitSelection(mode: SelectionMode, selected: Map<number, TreasuryPendingPurchaseOrderSelection>): void {
    if (mode === 'bank') this.selectionChange.emit([...selected.values()]);
    else this.cashSelectionChange.emit([...selected.values()]);
  }

  private reconcileVisibleSelections(response: entity.TreasuryPendingPurchaseOrdersResponse): void {
    const reconciledBank = new Map(this.bankSelected());
    const reconciledCash = new Map(this.cashSelected());
    let bankChanged = false;
    let cashChanged = false;

    for (const order of response.data) {
      for (const item of order.items) {
        const id = item.expense_item_id;
        const previousBank = reconciledBank.get(id);
        const previousCash = reconciledCash.get(id);
        const notAvailable = !item.is_selectable || Number(item.pending_amount) <= 0 || this.unavailableIdsSet().has(id);
        if (previousBank) {
          if (notAvailable) { reconciledBank.delete(id); bankChanged = true; }
          else if (previousBank.item.amount !== item.amount || previousBank.item.paid_amount !== item.paid_amount || previousBank.item.pending_amount !== item.pending_amount) {
            reconciledBank.set(id, { purchase_order_id: order.purchase_order_id, folio: order.folio, item });
            bankChanged = true;
          }
        }
        if (previousCash) {
          if (notAvailable) { reconciledCash.delete(id); cashChanged = true; }
          else if (previousCash.item.amount !== item.amount || previousCash.item.paid_amount !== item.paid_amount || previousCash.item.pending_amount !== item.pending_amount) {
            reconciledCash.set(id, { purchase_order_id: order.purchase_order_id, folio: order.folio, item });
            cashChanged = true;
          }
        }
      }
    }
    if (bankChanged) this.selectionChange.emit([...reconciledBank.values()]);
    if (cashChanged) this.cashSelectionChange.emit([...reconciledCash.values()]);
  }

  private sumPending(selected: Map<number, TreasuryPendingPurchaseOrderSelection>): number {
    return roundMoney([...selected.values()].reduce((sum, value) => sum + Number(value.item.pending_amount || 0), 0));
  }

  onPageChange(event: PageEvent): void {
    this.filters.update((filters) => ({ ...filters, page: event.pageIndex + 1, limit: event.pageSize }));
    this.loadPendingPurchaseOrders();
  }

  getPaymentStatusLabel(status: entity.TreasuryPendingPurchaseOrderPaymentStatus): string {
    switch (status) {
      case 'paid': return 'Pagado';
      case 'partial': return 'Parcial';
      case 'unpaid': return 'Pendiente';
      default: return 'Sin importe';
    }
  }
}
