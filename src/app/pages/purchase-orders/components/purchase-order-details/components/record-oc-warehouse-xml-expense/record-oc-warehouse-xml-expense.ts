import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';

import { ModuleHeader } from '../../../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../../../shared/ui/module-header/interfaces/module-header-interface';
import { InputDate } from '../../../../../../shared/ui/input-date/input-date';
import { InputField } from '../../../../../../shared/ui/input-field/input-field';
import { LoadingOverlay } from '../../../../../../shared/ui/loading-overlay/loading-overlay';

import { PurchaseOrdersService } from '../../../../services/purchase-orders.service';
import {
  AvailableWarehouseXmlExpenseDto,
  AvailableWarehouseXmlExpenseItemDto,
  FiltersAvailableWarehouseXmlExpenses,
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

    // UI
    ModuleHeader,
    InputDate,
    InputField,
    LoadingOverlay,

    // Material
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

  readonly pageTitle = 'Relacionar XML de almacén';
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
  errorMessage: string | null = null;

  xmlExpenses: AvailableWarehouseXmlExpenseDto[] = [];
  selectedExpense: AvailableWarehouseXmlExpenseDto | null = null;
  selectedItemIds = new Set<number>();

  page = 1;
  limit = 20;
  total = 0;
  totalPages = 0;

  filtersForm = this.fb.group({
    search: this.fb.control<string | null>(null),
    date_from: this.fb.control<string | null>(null),
    date_to: this.fb.control<string | null>(null),
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

  get hasXmlExpenses(): boolean {
    return this.xmlExpenses.length > 0;
  }

  get availableItemsForSelected(): AvailableWarehouseXmlExpenseItemDto[] {
    return this.selectedExpense?.available_items ?? [];
  }

  get selectedItems(): AvailableWarehouseXmlExpenseItemDto[] {
    return this.availableItemsForSelected.filter((item) =>
      this.selectedItemIds.has(Number(item.id)),
    );
  }

  get selectedItemsCount(): number {
    return this.selectedItemIds.size;
  }

  get selectedAmount(): number {
    return this.selectedItems.reduce((sum, item) => {
      return sum + Number(item.amount ?? 0);
    }, 0);
  }

  get selectedPaidAmount(): number {
    return this.selectedItems.reduce((sum, item) => {
      return sum + Number(item.payment_amount ?? 0);
    }, 0);
  }

  get selectedBalance(): number {
    return Math.max(this.selectedAmount - this.selectedPaidAmount, 0);
  }

  get canSave(): boolean {
    return (
      !!this.photoId &&
      !!this.order &&
      this.isWarehouseWithInvoice &&
      !!this.selectedExpense &&
      this.selectedItemIds.size > 0 &&
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

  applyFilters(): void {
    this.page = 1;
    this.clearSelectedExpense();
    this.loadAvailableWarehouseXmlExpenses();
  }

  clearFilters(): void {
    this.filtersForm.patchValue({
      search: null,
      date_from: null,
      date_to: null,
      amount: null,
    });

    this.page = 1;
    this.clearSelectedExpense();
    this.loadAvailableWarehouseXmlExpenses();
  }

  nextPage(): void {
    if (this.page >= this.totalPages) return;

    this.page += 1;
    this.clearSelectedExpense();
    this.loadAvailableWarehouseXmlExpenses();
  }

  previousPage(): void {
    if (this.page <= 1) return;

    this.page -= 1;
    this.clearSelectedExpense();
    this.loadAvailableWarehouseXmlExpenses();
  }

  selectExpense(expense: AvailableWarehouseXmlExpenseDto): void {
    if (!expense.can_select) return;

    this.selectedExpense = expense;
    this.selectedItemIds = new Set(
      (expense.available_item_ids ?? [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0),
    );
  }

  clearSelectedExpense(): void {
    this.selectedExpense = null;
    this.selectedItemIds.clear();
  }

  toggleItem(item: AvailableWarehouseXmlExpenseItemDto): void {
    const itemId = Number(item.id);

    if (!itemId) return;

    if (this.selectedItemIds.has(itemId)) {
      this.selectedItemIds.delete(itemId);
      return;
    }

    this.selectedItemIds.add(itemId);
  }

  selectAllItems(): void {
    if (!this.selectedExpense) return;

    this.selectedItemIds = new Set(
      this.selectedExpense.available_items
        .map((item) => Number(item.id))
        .filter((id) => Number.isFinite(id) && id > 0),
    );
  }

  clearSelectedItems(): void {
    this.selectedItemIds.clear();
  }

  isItemSelected(itemId: number | string | null | undefined): boolean {
    return this.selectedItemIds.has(Number(itemId));
  }

  saveRelation(): void {
    if (!this.canSave || !this.photoId || !this.selectedExpense) return;

    const raw = this.filtersForm.getRawValue();

    const payload = {
      expense_id: this.selectedExpense.id,
      expense_item_ids: Array.from(this.selectedItemIds),
      notes: raw.notes?.trim() || null,
    };

    this.saving.set(true);
    this.errorMessage = null;

    this.purchaseOrdersService
      .linkExistingWarehouseXmlExpenseToTicketPhoto(this.photoId, payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          const purchaseOrderId =
            response?.data?.purchase_order_id ?? this.order?.id;

          if (purchaseOrderId) {
            this.router.navigateByUrl(`/ordenes-compra/detalle/${purchaseOrderId}`);
            return;
          }

          this.goBack();
        },
        error: (err) => {
          console.error('Error relacionando XML de almacén:', err);

          this.errorMessage =
            err?.error?.message ||
            'No se pudo relacionar el XML de almacén con la O.C.';
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

  getItemName(item: AvailableWarehouseXmlExpenseItemDto): string {
    return item.product?.name || item.concept || 'Concepto sin nombre';
  }

  getItemUnitText(item: AvailableWarehouseXmlExpenseItemDto): string {
    const quantity = Number(item.quantity ?? 0);
    const unit = item.unit_name || item.unit || 'Sin unidad';

    if (!quantity) return unit;

    return `${quantity.toLocaleString('es-MX')} ${unit}`;
  }

  getItemUnitPrice(item: AvailableWarehouseXmlExpenseItemDto): number {
    return Number(item.unit_price ?? 0);
  }

  getExpenseSupplierName(expense: AvailableWarehouseXmlExpenseDto): string {
    return expense.supplier?.company_name ?? 'Sin proveedor';
  }

  getExpenseStatusName(expense: AvailableWarehouseXmlExpenseDto): string {
    return expense.status?.name ?? 'Sin estatus';
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
            photo.purchase_order?.id ??
            photo.purchaseOrder?.id ??
            null;

          if (purchaseOrderId) {
            this.loadOrderDetail(purchaseOrderId);
            return;
          }

          this.errorMessage = 'La foto no tiene una orden de compra conciliada.';
        },
        error: (err) => {
          console.error('Error cargando detalle de foto:', err);

          this.errorMessage =
            err?.error?.message ||
            'No se pudo cargar la información de la foto.';
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

          if (this.isWarehouseWithInvoice) {
            this.loadAvailableWarehouseXmlExpenses();
          }
        },
        error: (err) => {
          console.error('Error cargando detalle de O.C.:', err);

          this.errorMessage =
            err?.error?.message ||
            'No se pudo cargar la información de la O.C.';
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

  private loadAvailableWarehouseXmlExpenses(): void {
    if (!this.order?.id) return;

    const filters = this.buildFilters();

    this.loadingXmlExpenses.set(true);

    this.purchaseOrdersService
      .getAvailableWarehouseXmlExpensesForPurchaseOrder(this.order.id, filters)
      .pipe(finalize(() => this.loadingXmlExpenses.set(false)))
      .subscribe({
        next: (response) => {
          this.xmlExpenses = response.data ?? [];
          this.total = Number(response.total ?? 0);
          this.page = Number(response.page ?? this.page);
          this.limit = Number(response.limit ?? this.limit);
          this.totalPages = Number(response.totalPages ?? 0);

          if (this.xmlExpenses.length === 1) {
            this.selectExpense(this.xmlExpenses[0]);
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

  private buildFilters(): FiltersAvailableWarehouseXmlExpenses {
    const raw = this.filtersForm.getRawValue();

    return {
      page: this.page,
      limit: this.limit,
      search: raw.search?.trim() || null,
      date_from: raw.date_from || null,
      date_to: raw.date_to || null,
      amount: raw.amount ?? null,
    };
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

  formatDate(value: string | Date | null | undefined): string {
    if (!value) return 'Sin fecha';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return 'Sin fecha';

    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  formatMoney(value: number | string | null | undefined): string {
    const amount = Number(value ?? 0);

    return amount.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
    });
  }
}