import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';

import {
  BtnsSection,
  ModuleFooterAction,
} from '../../../../../../shared/ui/btns-section/btns-section';
import { ModuleHeader } from '../../../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../../../shared/ui/module-header/interfaces/module-header-interface';
import { LoadingOverlay } from '../../../../../../shared/ui/loading-overlay/loading-overlay';
import {
  DateRangeValue,
  InputDate,
} from '../../../../../../shared/ui/input-date/input-date';
import { InputField } from '../../../../../../shared/ui/input-field/input-field';

import { PurchaseOrdersService } from '../../../../services/purchase-orders.service';
import {
  AvailableWarehouseXmlExpenseDto,
  AvailableWarehouseXmlExpenseItemDto,
  FiltersAvailableWarehouseXmlExpenses,
  LinkExistingWarehouseXmlExpenseDto,
  PendingTicketPhotoRow,
  PurchaseOrderFlowDetailResponse,
  PurchaseOrderTicketPhotoDto,
} from '../../../../interfaces/purchase-orders.interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  formFull: true,
};

@Component({
  selector: 'app-record-oc-warehouse-xml-expense',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    ModuleHeader,
    LoadingOverlay,
    InputDate,
    InputField,
    BtnsSection,

    MatIconModule,
  ],
  templateUrl: './record-oc-warehouse-xml-expense.html',
  styleUrl: './record-oc-warehouse-xml-expense.scss',
})
export class RecordOcWarehouseXmlExpense implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly purchaseOrdersService = inject(PurchaseOrdersService);

  readonly pageTitle = 'Relacionar XML almacén';
  readonly headerConfig = HEADER_CONFIG;

  readonly loadingPage = signal(false);
  readonly loadingPhoto = signal(false);
  readonly loadingXmlExpenses = signal(false);
  readonly saving = signal(false);

  photoId: number | null = null;

  photo: PendingTicketPhotoRow | null = null;
  photoUrl: string | null = null;
  imageError = false;

  order: PurchaseOrderFlowDetailResponse | null = null;

  availableWarehouseXmlExpenses: AvailableWarehouseXmlExpenseDto[] = [];
  selectedWarehouseXmlExpense: AvailableWarehouseXmlExpenseDto | null = null;
  selectedItemIds: number[] = [];

  totalAvailableWarehouseXmlExpenses = 0;
  availablePage = 1;
  availableLimit = 20;
  availableTotalPages = 0;

  errorMessage: string | null = null;

  form = this.fb.group({
    dateRange: this.fb.control<DateRangeValue | null>(null),
    search: this.fb.control<string | null>(null),
    amount: this.fb.control<number | string | null>(null),
    notes: this.fb.control<string | null>(null),
  });

  ngOnInit(): void {
    this.photoId = this.getPhotoIdFromRoute();

    if (!this.photoId) {
      this.errorMessage = 'No se encontró el identificador de la foto.';
      return;
    }

    this.loadInitialData();
  }

  get projectName(): string {
    return this.order?.project?.name ?? this.photo?.project_name ?? 'Sin proyecto';
  }

  get requesterName(): string {
    return (
      this.order?.requested_by_employee?.name ??
      this.order?.requested_by_name ??
      'Sin solicitante'
    );
  }

  get requestedAmount(): number {
    return Number(this.order?.requested_amount ?? 0);
  }

  get destinationLabel(): string {
    return this.order?.destination_type_label ?? 'Sin destino';
  }

  get invoiceLabel(): string {
    return this.order?.will_have_invoice_label ?? 'Sin dato';
  }

  get flowTypeLabel(): string {
    if (!this.order) return 'Sin flujo';

    return `${this.destinationLabel} · ${this.invoiceLabel}`;
  }

  get ticketFileName(): string {
    return this.photo?.file_name ?? 'Foto del ticket';
  }

  get uploadedByName(): string {
    return this.photo?.uploaded_by_name ?? 'Sin dato';
  }

  get uploadedAt(): string {
    return this.photo?.created_at_date ?? 'Sin fecha';
  }

  get orderConcept(): string {
    return this.order?.concept ?? 'Sin concepto';
  }

  get orderNotes(): string {
    return this.order?.notes || 'Sin notas registradas.';
  }

  get isWarehouseWithInvoice(): boolean {
    return (
      this.order?.destination_type === 'warehouse' &&
      this.order?.will_have_invoice === true
    );
  }

  get isBlockedByFlow(): boolean {
    return !!this.order && !this.isWarehouseWithInvoice;
  }

  get hasExistingPhotoLink(): boolean {
    if (!this.photoId || !this.order?.expense_links?.length) return false;

    return this.order.expense_links.some((link) => {
      const ticketPhotoId = Number(
        (link as any).ticket_photo?.id ??
        (link as any).ticketPhoto?.id ??
        link.ticket_photo_id ??
        0,
      );

      return ticketPhotoId === this.photoId;
    });
  }

  get hasActiveXmlFilters(): boolean {
    const raw = this.form.getRawValue();

    const hasDates = !!(
      raw.dateRange?.startDate ||
      raw.dateRange?.endDate
    );

    return !!(
      hasDates ||
      raw.search?.trim() ||
      this.toNumberOrNull(raw.amount) !== null
    );
  }

  get selectedItems(): AvailableWarehouseXmlExpenseItemDto[] {
    if (!this.selectedWarehouseXmlExpense) return [];

    return (this.selectedWarehouseXmlExpense.available_items ?? []).filter(
      (item) => this.selectedItemIds.includes(Number(item.id)),
    );
  }

  get selectedItemsCount(): number {
    return this.selectedItems.length;
  }

  get hasSelectedWarehouseQuantity(): boolean {
    return this.selectedItems.some((item) => {
      const quantity = Number(item.quantity ?? 0);
      const productId = Number(item.product?.id ?? 0);

      return (
        item.item_type === 'warehouse' &&
        productId > 0 &&
        quantity > 0
      );
    });
  }

  get selectedAmount(): number {
    return this.round2(
      this.selectedItems.reduce(
        (sum, item) => sum + Number(item.amount ?? 0),
        0,
      ),
    );
  }

  get isZeroAmountWarehouseXmlSpecialCase(): boolean {
    const selectedAmount = this.round2(this.selectedAmount);

    return (
      this.isWarehouseWithInvoice &&
      Boolean(this.order?.is_zero_amount_invoice) &&
      !!this.selectedWarehouseXmlExpense?.can_select &&
      this.selectedItemIds.length > 0 &&
      this.hasSelectedWarehouseQuantity &&
      selectedAmount === 0
    );
  }

  get shouldShowAmountDifferenceWarning(): boolean {
    return (
      !!this.selectedWarehouseXmlExpense &&
      this.amountDifference !== 0 &&
      !this.isZeroAmountWarehouseXmlSpecialCase
    );
  }

  get shouldShowZeroAmountXmlInfo(): boolean {
    return this.isZeroAmountWarehouseXmlSpecialCase;
  }



  get amountDifference(): number {
    return this.round2(this.selectedAmount - this.requestedAmount);
  }

  abs(value: number): number {
    return Math.abs(Number(value ?? 0));
  }

  get canSave(): boolean {
    const hasValidAmount =
      this.selectedAmount > 0 || this.isZeroAmountWarehouseXmlSpecialCase;

    return (
      !!this.photoId &&
      !!this.selectedWarehouseXmlExpense &&
      !!this.selectedWarehouseXmlExpense.can_select &&
      this.selectedItemIds.length > 0 &&
      this.hasSelectedWarehouseQuantity &&
      hasValidAmount &&
      this.isWarehouseWithInvoice &&
      !this.hasExistingPhotoLink &&
      !this.saving()
    );
  }

  onHeaderAction(action: string): void {
    switch (action) {
      case 'back':
      case 'close':
      case 'cancel':
        this.goBack();
        break;

      default:
        break;
    }
  }

  onFilterAction(action: ModuleFooterAction): void {
    switch (action) {
      case 'search':
        this.applyFilters();
        break;

      case 'clean':
        this.clearFilters();
        break;

      default:
        break;
    }
  }

  onFooterAction(action: ModuleFooterAction): void {
    switch (action) {
      case 'save':
        this.saveRelation();
        break;

      case 'cancel':
        this.goBack();
        break;

      default:
        break;
    }
  }

  applyFilters(): void {
    this.loadAvailableWarehouseXmlExpenses(true);
  }

  clearFilters(): void {
    this.form.patchValue(
      {
        dateRange: null,
        search: null,
        amount: null,
      },
      { emitEvent: false },
    );

    this.loadAvailableWarehouseXmlExpenses(true);
  }

  nextPage(): void {
    if (this.availablePage >= this.availableTotalPages) return;

    this.availablePage += 1;
    this.clearSelectedWarehouseXmlExpense();
    this.loadAvailableWarehouseXmlExpenses(false);
  }

  previousPage(): void {
    if (this.availablePage <= 1) return;

    this.availablePage -= 1;
    this.clearSelectedWarehouseXmlExpense();
    this.loadAvailableWarehouseXmlExpenses(false);
  }

  selectXmlExpense(expense: AvailableWarehouseXmlExpenseDto): void {
    if (!expense?.can_select || this.hasExistingPhotoLink) return;

    this.selectedWarehouseXmlExpense = expense;
    this.selectedItemIds = (expense.available_item_ids ?? [])
      .map(Number)
      .filter((id) => Number.isFinite(id) && id > 0);

    this.errorMessage = null;
  }

  clearSelectedWarehouseXmlExpense(): void {
    this.selectedWarehouseXmlExpense = null;
    this.selectedItemIds = [];
  }

  isXmlExpenseSelected(expense: AvailableWarehouseXmlExpenseDto): boolean {
    return Number(this.selectedWarehouseXmlExpense?.id ?? 0) === Number(expense.id);
  }

  toggleXmlItem(item: AvailableWarehouseXmlExpenseItemDto): void {
    const itemId = Number(item.id);

    if (!itemId || this.hasExistingPhotoLink) return;

    if (this.selectedItemIds.includes(itemId)) {
      this.selectedItemIds = this.selectedItemIds.filter((id) => id !== itemId);
      return;
    }

    this.selectedItemIds = [...this.selectedItemIds, itemId];
  }

  isXmlItemSelected(item: AvailableWarehouseXmlExpenseItemDto): boolean {
    return this.selectedItemIds.includes(Number(item.id));
  }

  selectAllItems(): void {
    if (!this.selectedWarehouseXmlExpense || this.hasExistingPhotoLink) return;

    this.selectedItemIds = (
      this.selectedWarehouseXmlExpense.available_item_ids ?? []
    )
      .map(Number)
      .filter((id) => Number.isFinite(id) && id > 0);
  }

  clearSelectedItems(): void {
    if (this.hasExistingPhotoLink) return;

    this.selectedItemIds = [];
  }

  saveRelation(): void {
    if (this.saving()) return;

    if (!this.canSave || !this.photoId || !this.selectedWarehouseXmlExpense) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    const payload: LinkExistingWarehouseXmlExpenseDto = {
      expense_id: Number(this.selectedWarehouseXmlExpense.id),
      expense_item_ids: this.selectedItemIds.map(Number),
      notes: raw.notes?.trim() || null,
    };

    this.errorMessage = null;
    this.saving.set(true);

    this.purchaseOrdersService
      .linkExistingWarehouseXmlExpenseToTicketPhoto(this.photoId, payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          const purchaseOrderId = response?.data?.purchase_order_id ?? this.order?.id;

          if (purchaseOrderId) {
            this.router.navigateByUrl(`/ordenes-compra/detalle/${purchaseOrderId}`);
            return;
          }

          this.goBack();
        },
        error: (err) => {
          console.error('Error relacionando XML de almacén con O.C.:', err);

          this.errorMessage =
            err?.error?.message ||
            'No se pudo relacionar el XML de almacén con la orden de compra.';
        },
      });
  }

  openPhotoInNewTab(): void {
    if (!this.photoUrl) return;

    window.open(this.photoUrl, '_blank', 'noopener,noreferrer');
  }

  onImageError(): void {
    this.imageError = true;
    this.errorMessage = 'No se pudo mostrar la imagen.';
  }

  goBack(): void {
    if (this.order?.id) {
      this.router.navigateByUrl(`/ordenes-compra/detalle/${this.order.id}`);
      return;
    }

    this.router.navigateByUrl('/ordenes-compra');
  }

  getAvailableItemName(item: AvailableWarehouseXmlExpenseItemDto): string {
    return item.product?.name ?? item.concept ?? 'Partida sin nombre';
  }

  getItemUnitText(item: AvailableWarehouseXmlExpenseItemDto): string {
    const quantity = item.quantity ?? '—';
    const unit = item.unit || item.unit_name || '';

    return `${quantity} ${unit}`.trim();
  }

  getItemUnitPrice(item: AvailableWarehouseXmlExpenseItemDto): number {
    return Number(item.unit_price ?? 0);
  }

  private loadInitialData(): void {
    if (!this.photoId) return;

    this.loadingPage.set(true);

    this.purchaseOrdersService
      .getTicketPhotoById(this.photoId)
      .pipe(finalize(() => this.loadingPage.set(false)))
      .subscribe({
        next: (photo) => {
          this.photo = this.mapTicketPhotoToRow(photo);
          this.loadPhotoUrl();

          const purchaseOrderId =
            photo.purchase_order?.id ?? photo.purchaseOrder?.id ?? null;

          if (purchaseOrderId) {
            this.loadOrderDetail(purchaseOrderId);
            return;
          }

          this.errorMessage = 'La foto no tiene una orden de compra conciliada.';
        },
        error: (err) => {
          console.error('Error cargando detalle de foto:', err);

          this.errorMessage =
            err?.error?.message || 'No se pudo cargar la información de la foto.';
        },
      });
  }

  private loadOrderDetail(orderId: number): void {
    this.loadingPage.set(true);

    this.purchaseOrdersService
      .getFlowDetail(orderId)
      .pipe(finalize(() => this.loadingPage.set(false)))
      .subscribe({
        next: (response) => {
          this.order = (response?.data ?? response) as PurchaseOrderFlowDetailResponse;

          if (this.hasExistingPhotoLink) {
            this.errorMessage = 'Esta foto ya tiene un XML relacionado.';
            return;
          }

          if (this.isWarehouseWithInvoice) {
            this.loadAvailableWarehouseXmlExpenses(true);
          }
        },
        error: (err) => {
          console.error('Error cargando detalle de O.C.:', err);

          this.errorMessage =
            err?.error?.message || 'No se pudo cargar la información de la O.C.';
        },
      });
  }

  private loadAvailableWarehouseXmlExpenses(resetPage = false): void {
    if (!this.order?.id) return;

    if (resetPage) {
      this.availablePage = 1;
    }

    const raw = this.form.getRawValue();
    const amount = this.toNumberOrNull(raw.amount);

    const filters: FiltersAvailableWarehouseXmlExpenses = {
      page: this.availablePage,
      limit: this.availableLimit,
      search: raw.search?.trim() || null,
      amount,
      date_from: raw.dateRange?.startDate ?? null,
      date_to: raw.dateRange?.endDate ?? null,
    };

    this.loadingXmlExpenses.set(true);

    this.purchaseOrdersService
      .getAvailableWarehouseXmlExpensesForPurchaseOrder(this.order.id, filters)
      .pipe(finalize(() => this.loadingXmlExpenses.set(false)))
      .subscribe({
        next: (response) => {
          this.availableWarehouseXmlExpenses = response.data ?? [];
          this.totalAvailableWarehouseXmlExpenses = Number(response.total ?? 0);
          this.availablePage = Number(response.page ?? 1);
          this.availableLimit = Number(response.limit ?? 20);
          this.availableTotalPages = Number(response.totalPages ?? 0);

          if (
            this.selectedWarehouseXmlExpense &&
            !this.availableWarehouseXmlExpenses.some(
              (expense) =>
                Number(expense.id) === Number(this.selectedWarehouseXmlExpense?.id),
            )
          ) {
            this.clearSelectedWarehouseXmlExpense();
          }
        },
        error: (err) => {
          console.error('Error cargando XML de almacén disponibles:', err);

          this.errorMessage =
            err?.error?.message ||
            'No se pudieron cargar los XML de almacén disponibles.';
        },
      });
  }

  private loadPhotoUrl(): void {
    if (!this.photoId) return;

    this.loadingPhoto.set(true);
    this.photoUrl = null;
    this.imageError = false;

    this.purchaseOrdersService
      .getTicketPhotoViewUrl(this.photoId)
      .pipe(finalize(() => this.loadingPhoto.set(false)))
      .subscribe({
        next: (response) => {
          this.photoUrl = response.url;
        },
        error: (err) => {
          console.error('Error cargando URL temporal de foto:', err);
          this.errorMessage = 'No se pudo cargar la foto del ticket.';
        },
      });
  }

  private mapTicketPhotoToRow(
    photo: PurchaseOrderTicketPhotoDto,
  ): PendingTicketPhotoRow {
    const createdAt = photo.created_at ?? photo.createdAt ?? '';
    const status = photo.status ?? 'pending';

    const publicUrl =
      photo.public_url ??
      photo.publicUrl ??
      photo.preview_url ??
      photo.previewUrl ??
      photo.url ??
      null;

    return {
      id: Number(photo.id ?? 0),
      project_id: photo.project?.id ?? null,
      preview_url: publicUrl,
      file_name:
        photo.file_name ??
        photo.fileName ??
        photo.filename ??
        'Foto del ticket',
      project_name: photo.project?.name ?? 'Sin proyecto',
      uploaded_by_name:
        photo.uploaded_by_user?.name ??
        photo.uploadedByUser?.name ??
        photo.user?.name ??
        'Sin dato',
      status,
      status_label: this.getPhotoStatusLabel(status),
      created_at: createdAt,
      created_at_date: this.formatDateTime(createdAt),
      public_url: publicUrl,
      purchase_order: photo.purchase_order ?? photo.purchaseOrder ?? null,
    };
  }

  private getPhotoStatusLabel(status: string): string {
    switch (status) {
      case 'reconciled':
        return 'Foto conciliada';

      case 'discarded':
        return 'Descartada';

      case 'pending':
      default:
        return 'Pendiente';
    }
  }

  private getPhotoIdFromRoute(): number | null {
    const rawPhotoId =
      this.route.snapshot.paramMap.get('photoId') ??
      this.route.snapshot.paramMap.get('id');

    const photoId = Number(rawPhotoId);

    return Number.isFinite(photoId) && photoId > 0 ? photoId : null;
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;

    const cleanValue =
      typeof value === 'string' ? value.replace(/[$,\s]/g, '') : value;

    const parsed = Number(cleanValue);

    return Number.isFinite(parsed) ? parsed : null;
  }

  private round2(value: number): number {
    return Number(Number(value ?? 0).toFixed(2));
  }

  private formatDateTime(value: string | Date | null | undefined): string {
    if (!value) return 'Sin fecha';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return 'Sin fecha';

    return date
      .toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      .replace(',', '');
  }

  formatMoney(value: number | string | null | undefined): string {
    const amount = Number(value ?? 0);

    return amount.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
    });
  }
}
