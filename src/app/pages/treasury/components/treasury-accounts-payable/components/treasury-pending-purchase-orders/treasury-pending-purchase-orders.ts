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
import { DateRangeValue, InputDate } from '../../../../../../shared/ui/input-date/input-date';
import { InputField } from '../../../../../../shared/ui/input-field/input-field';
import { SearchMultiSelect } from '../../../../../../shared/ui/autocomplete-multiple/autocomplete-multiple';
import { BtnsSection } from '../../../../../../shared/ui/btns-section/btns-section';
import { Catalog } from '../../../../../../shared/interfaces/general-interfaces';
import { LocalStorageService } from '../../../../../../shared/services/local-storage.service';
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
const PURCHASE_ORDER_FILTERS_KEY = 'mp_treasury_accounts_payable_purchase_orders_v1';

interface StoredPurchaseOrderUiFilters {
  dateRange: DateRangeValue | null;
  search: string;
  amount: number | string | null;
  suppliersIds: Catalog[];
  projectIds?: Catalog[];
  /** Compatibilidad con filtros guardados por la versión anterior. */
  project_id?: Catalog | number | string | null;
  page: number;
  limit: number;
}

@Component({
  selector: 'app-treasury-pending-purchase-orders',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatPaginatorModule,
    InputDate,
    InputField,
    SearchMultiSelect,
    BtnsSection,
  ],
  templateUrl: './treasury-pending-purchase-orders.html',
  styleUrl: './treasury-pending-purchase-orders.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreasuryPendingPurchaseOrders implements OnInit {
  private readonly accountsPayableService = inject(TreasuryAccountsPayableService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly storage = inject(LocalStorageService);

  readonly bankMovement = input<entity.TreasuryAvailableOutflowTableRow | null>(null);

  /** El componente padre conserva ambas selecciones entre páginas y pestañas. */
  readonly selectedSelections = input<TreasuryPendingPurchaseOrderSelection[]>([]);
  readonly cashSelections = input<TreasuryPendingPurchaseOrderSelection[]>([]);

  /** IDs en uso por la pestaña tradicional: no ofrecerlos de nuevo aquí. */
  readonly unavailableItemIds = input<number[]>([]);

  readonly selectionChange = output<TreasuryPendingPurchaseOrderSelection[]>();
  readonly cashSelectionChange = output<TreasuryPendingPurchaseOrderSelection[]>();

  /** Solo solicita abrir el modal. El pago se confirma en el componente padre. */
  readonly applyPaymentRequested = output<void>();
  readonly cashPaymentRequested = output<void>();

  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly expandedOrderId = signal<number | null>(null);
  readonly filterError = signal<string | null>(null);

  // Mismo contrato de filtros UI compartidos que la modalidad tradicional.
  readonly filterForm = this.fb.group({
    dateRange: this.fb.control<DateRangeValue | null>(null),
    search: this.fb.control<string>(''),
    amount: this.fb.control<number | string | null>(null),
    suppliersIds: this.fb.control<Catalog[]>([]),
    projectIds: this.fb.control<Catalog[]>([]),
  });

  readonly filters = signal<entity.TreasuryPendingPurchaseOrderFilters>({
    page: 1,
    limit: 10,
    search: '',
    amount: null,
    supplier_id: null,
    project_id: null,
    project_ids: [],
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

  /** Permite abrir el modal también si el movimiento solo alcanza para un abono parcial. */
  readonly canPrepareBankPayment = computed(() => {
    const movement = this.bankMovement();
    return Boolean(
      movement &&
      movement.is_payable &&
      !movement.requires_classification_review &&
      this.movementAvailable() > 0 &&
      this.bankItemsCount() > 0 &&
      !this.loading() &&
      !this.loadError()
    );
  });

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

  get hasActiveFilters(): boolean {
    const value = this.filterForm.getRawValue();
    const amount = this.normalizeAmountFilter(value.amount);
    return Boolean(
      value.dateRange?.startDate ||
      value.dateRange?.endDate ||
      value.search?.trim() ||
      amount !== null ||
      (value.suppliersIds?.length ?? 0) > 0 ||
      (value.projectIds?.length ?? 0) > 0,
    );
  }

  ngOnInit(): void {
    this.restoreFilters();
    this.loadPendingPurchaseOrders();
  }

  private normalizeAmountFilter(value: unknown): number | null {
    if (value === '' || value === null || value === undefined) return null;
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? roundMoney(amount) : null;
  }

  private buildFiltersFromUi(
    page = 1,
    limit = this.filters().limit,
  ): entity.TreasuryPendingPurchaseOrderFilters {
    const ui = this.filterForm.getRawValue();
    const supplierIds = (ui.suppliersIds ?? [])
      .map((supplier) => Number(supplier.id))
      .filter((id) => Number.isInteger(id) && id > 0);
    const projectIds = (ui.projectIds ?? [])
      .map((project) => Number(project.id))
      .filter((id) => Number.isInteger(id) && id > 0);

    return {
      page,
      limit,
      search: ui.search?.trim() || '',
      amount: this.normalizeAmountFilter(ui.amount),
      supplier_id: null,
      supplier_ids: [...new Set(supplierIds)],
      project_id: null, // Se conserva el filtro individual para otros clientes existentes.
      project_ids: [...new Set(projectIds)],
      date_from: ui.dateRange?.startDate ?? null,
      date_to: ui.dateRange?.endDate ?? null,
      sorts: [{ key: 'created_at', direction: 'desc' }],
    };
  }

  private saveFilters(): void {
    const ui = this.filterForm.getRawValue();
    const saved: StoredPurchaseOrderUiFilters = {
      dateRange: ui.dateRange ?? null,
      search: ui.search?.trim() || '',
      amount: ui.amount ?? null,
      suppliersIds: ui.suppliersIds ?? [],
      projectIds: ui.projectIds ?? [],
      page: this.filters().page,
      limit: this.filters().limit,
    };
    this.storage.setItem(PURCHASE_ORDER_FILTERS_KEY, saved);
  }

  private restoreFilters(): void {
    const saved = this.storage.getItem<StoredPurchaseOrderUiFilters>(PURCHASE_ORDER_FILTERS_KEY);
    if (!saved) return;

    const dateRange: DateRangeValue | null = saved.dateRange
      ? {
          startDate: saved.dateRange.startDate ?? null,
          endDate: saved.dateRange.endDate ?? null,
        }
      : null;
    // Migración de un proyecto seleccionado con el control antiguo.
    const legacyProject = saved.project_id;
    const restoredProjects = Array.isArray(saved.projectIds)
      ? saved.projectIds
      : legacyProject && typeof legacyProject === 'object'
        ? [legacyProject]
        : [];

    this.filterForm.patchValue({
      dateRange,
      search: saved.search ?? '',
      amount: saved.amount ?? null,
      suppliersIds: Array.isArray(saved.suppliersIds) ? saved.suppliersIds : [],
      projectIds: restoredProjects,
    }, { emitEvent: false });

    const page = Number(saved.page);
    const limit = Number(saved.limit);
    this.filters.set(this.buildFiltersFromUi(
      Number.isInteger(page) && page > 0 ? page : 1,
      [2, 5, 10, 25, 50].includes(limit) ? limit : 10,
    ));
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

  onFilterBtnsSectionAction(action: string): void {
    switch (action) {
      case 'search':
        this.search();
        break;
      case 'clean':
        this.clearFilters();
        break;
      default:
        break;
    }
  }

  search(): void {
    this.filterError.set(null);
    const ui = this.filterForm.getRawValue();
    const amountText = ui.amount === null || ui.amount === undefined
      ? ''
      : String(ui.amount).trim();
    if (amountText !== '' && this.normalizeAmountFilter(ui.amount) === null) {
      this.filterError.set('Ingresa un importe mayor que cero.');
      return;
    }
    if (ui.dateRange?.startDate && ui.dateRange?.endDate &&
        ui.dateRange.startDate > ui.dateRange.endDate) {
      this.filterError.set('La fecha final debe ser igual o posterior a la inicial.');
      return;
    }
    this.filters.set(this.buildFiltersFromUi());
    this.saveFilters();
    this.loadPendingPurchaseOrders();
  }

  clearFilters(): void {
    this.filterError.set(null);
    this.filterForm.reset({
      dateRange: null,
      search: '',
      amount: null,
      suppliersIds: [],
      projectIds: [],
    }, { emitEvent: false });
    this.filters.set(this.buildFiltersFromUi());
    this.storage.removeItem(PURCHASE_ORDER_FILTERS_KEY);
    this.loadPendingPurchaseOrders();
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
    this.saveFilters();
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
