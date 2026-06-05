import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';

import { ModuleHeader } from '../../../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../../../shared/ui/module-header/interfaces/module-header-interface';
import { InputDate } from '../../../../../../shared/ui/input-date/input-date';
import { InputField } from '../../../../../../shared/ui/input-field/input-field';
import { Autocomplete } from '../../../../../../shared/ui/autocomplete/autocomplete';
import { LoadingOverlay } from '../../../../../../shared/ui/loading-overlay/loading-overlay';

import { Catalog } from '../../../../../../shared/interfaces/general-interfaces';

import { PurchaseOrdersService } from '../../../../services/purchase-orders.service';

import {
  CreateDirectExpenseFromTicketDto,
  PendingTicketPhotoRow,
  PurchaseOrderFlowDetailResponse,
  PurchaseOrderTicketPhotoDto,
} from '../../../../interfaces/purchase-orders.interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  formFull: true,
};

type RecordExpenseItemForm = {
  product: FormControl<Catalog | number | string | null>;
  concept: FormControl<string>;
  amount: FormControl<number | null>;
  payment_amount: FormControl<number | null>;
  payment_date: FormControl<string | null>;
};

type RecordExpenseForm = {
  date: FormControl<string | null>;
  supplier: FormControl<Catalog | number | string | null>;
  project: FormControl<string>;
  notes: FormControl<string | null>;
  items: FormArray<FormGroup<RecordExpenseItemForm>>;
};

@Component({
  selector: 'app-record-oc-expense',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    // UI
    ModuleHeader,
    InputDate,
    InputField,
    Autocomplete,
    LoadingOverlay,

    // Material
    MatIconModule,
  ],
  templateUrl: './record-oc-expense.html',
  styleUrl: './record-oc-expense.scss',
})
export class RecordOcExpense implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly purchaseOrdersService = inject(PurchaseOrdersService);

  readonly pageTitle = 'Registrar gasto de O.C. conciliada';
  readonly headerConfig = HEADER_CONFIG;

  readonly loadingPage = signal(false);
  readonly loadingPhoto = signal(false);
  readonly saving = signal(false);

  photoId: number | null = null;

  photo: PendingTicketPhotoRow | null = null;
  photoUrl: string | null = null;
  imageError = false;
  errorMessage: string | null = null;

  order: PurchaseOrderFlowDetailResponse | null = null;

  form = this.fb.group<RecordExpenseForm>({
    date: this.fb.control<string | null>(this.getToday(), {
      validators: [Validators.required],
    }),
    supplier: this.fb.control<Catalog | number | string | null>(null),
    project: this.fb.control(
      { value: '', disabled: true },
      {
        nonNullable: true,
      },
    ),
    notes: this.fb.control<string | null>(null),
    items: this.fb.array<FormGroup<RecordExpenseItemForm>>([]),
  });

  ngOnInit(): void {
    this.photoId = this.getPhotoIdFromRoute();

    if (!this.photoId) {
      this.errorMessage = 'No se encontró el identificador de la foto.';
      return;
    }

    this.addItem();
    this.loadInitialData();
  }

  get itemsArray(): FormArray<FormGroup<RecordExpenseItemForm>> {
    return this.form.controls.items;
  }

  get orderFolio(): string {
    return this.order?.folio ?? this.photo?.status_label ?? 'Sin folio';
  }

  get projectName(): string {
    return this.order?.project?.name ?? this.photo?.project_name ?? 'Sin proyecto';
  }

  get destinationLabel(): string {
    return this.order?.destination_type_label ?? 'Sin destino';
  }

  get invoiceLabel(): string {
    return this.order?.will_have_invoice_label ?? 'Sin dato';
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

  get totalAmount(): number {
    return this.itemsArray.controls.reduce((total, group) => {
      return total + Number(group.controls.amount.value ?? 0);
    }, 0);
  }

  get totalPaid(): number {
    return this.itemsArray.controls.reduce((total, group) => {
      return total + Number(group.controls.payment_amount.value ?? 0);
    }, 0);
  }

  get balance(): number {
    return Math.max(this.totalAmount - this.totalPaid, 0);
  }

  get itemsCount(): number {
    return this.itemsArray.length;
  }

  get canSave(): boolean {
    return (
      this.form.valid &&
      this.isDirectWithoutInvoice &&
      this.itemsArray.length > 0 &&
      this.totalAmount > 0 &&
      this.arePaymentsValid() &&
      !this.saving()
    );
  }

  get isDirectWithoutInvoice(): boolean {
    return (
      this.order?.destination_type === 'direct' &&
      this.order?.will_have_invoice === false
    );
  }

  get flowTypeLabel(): string {
    if (!this.order) return 'Sin flujo';

    return `${this.destinationLabel} · ${this.invoiceLabel}`;
  }

  get isBlockedByFlow(): boolean {
    return !!this.order && !this.isDirectWithoutInvoice;
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

  addItem(): void {
    const defaultDate = this.form.controls.date.value ?? this.getToday();

    this.itemsArray.push(
      this.fb.group<RecordExpenseItemForm>({
        product: this.fb.control<Catalog | number | string | null>(null, {
          validators: [Validators.required],
        }),
        concept: this.fb.control<string>('', {
          nonNullable: true,
          validators: [Validators.required, Validators.maxLength(500)],
        }),
        amount: this.fb.control<number | null>(null, {
          validators: [Validators.required, Validators.min(0.01)],
        }),
        payment_amount: this.fb.control<number | null>(null, {
          validators: [Validators.min(0)],
        }),
        payment_date: this.fb.control<string | null>(defaultDate),
      }),
    );

    this.syncDefaultConcepts();
  }

  removeItem(index: number): void {
    if (this.itemsArray.length <= 1) return;

    this.itemsArray.removeAt(index);
  }

  onAmountBlur(index: number): void {
    const group = this.itemsArray.at(index);
    const amount = Number(group.controls.amount.value ?? 0);
    const payment = group.controls.payment_amount.value;

    if (payment === null || payment === undefined) {
      group.controls.payment_amount.setValue(amount > 0 ? amount : null);
      group.controls.payment_date.setValue(this.form.controls.date.value ?? this.getToday());
      return;
    }

    const paymentAmount = Number(payment ?? 0);

    if (paymentAmount > amount) {
      group.controls.payment_amount.setValue(amount);
    }

    if (Number(group.controls.payment_amount.value ?? 0) > 0 && !group.controls.payment_date.value) {
      group.controls.payment_date.setValue(this.form.controls.date.value ?? this.getToday());
    }
  }

  onPaymentBlur(index: number): void {
    const group = this.itemsArray.at(index);

    const amount = Number(group.controls.amount.value ?? 0);
    const payment = Number(group.controls.payment_amount.value ?? 0);

    if (payment > amount) {
      group.controls.payment_amount.setValue(amount);
    }

    if (payment > 0 && !group.controls.payment_date.value) {
      group.controls.payment_date.setValue(this.form.controls.date.value ?? this.getToday());
    }

    if (payment <= 0) {
      group.controls.payment_date.setValue(null);
    }
  }

  saveExpense(): void {
    if (!this.canSave || !this.photoId) return;

    const payload = this.buildPayload();

    this.saving.set(true);

    this.purchaseOrdersService
      .createDirectExpenseFromTicketPhoto(this.photoId, payload)
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
          console.error('Error registrando gasto desde O.C.:', err);
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

  private loadInitialData(): void {
    if (!this.photoId) return;

    this.loadingPage.set(true);

    this.purchaseOrdersService
      .getTicketPhotoById(this.photoId)
      .pipe(finalize(() => this.loadingPage.set(false)))
      .subscribe({
        next: (photo) => {
          this.photo = this.mapTicketPhotoToRow(photo);

          this.syncProjectControl();
          this.syncDefaultConcepts();
          this.loadPhotoUrl();

          const purchaseOrderId =
            photo.purchase_order?.id ??
            photo.purchaseOrder?.id ??
            null;

          if (purchaseOrderId) {
            this.loadOrderDetail(purchaseOrderId);
          } else {
            this.errorMessage =
              'La foto no tiene una orden de compra conciliada.';
          }
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
          const detail = (response?.data ?? response) as PurchaseOrderFlowDetailResponse;

          this.order = detail;
          this.syncProjectControl();
          this.syncDefaultConcepts();
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

  private buildPayload(): CreateDirectExpenseFromTicketDto {
    const value = this.form.getRawValue();

    return {
      date: value.date || this.getToday(),
      supplier_id: this.getCatalogId(value.supplier),
      notes: value.notes?.trim() || null,
      items: (value.items ?? []).map((item) => {
        const amount = this.toNumberOrZero(item.amount);
        const paymentAmount = this.toNumberOrNull(item.payment_amount);

        return {
          product_id: this.getCatalogId(item.product) ?? 0,
          concept: item.concept?.trim() || this.orderConcept,
          amount,
          payment_amount: paymentAmount,
          payment_date:
            Number(paymentAmount ?? 0) > 0
              ? item.payment_date || value.date || this.getToday()
              : null,
        };
      }),
    };
  }

  private arePaymentsValid(): boolean {
    return this.itemsArray.controls.every((group) => {
      const amount = Number(group.controls.amount.value ?? 0);
      const payment = Number(group.controls.payment_amount.value ?? 0);

      return payment <= amount;
    });
  }

  private syncProjectControl(): void {
    this.form.controls.project.setValue(this.projectName, {
      emitEvent: false,
    });
  }

  private syncDefaultConcepts(): void {
    const concept = this.orderConcept;

    this.itemsArray.controls.forEach((group) => {
      if (!group.controls.concept.value?.trim()) {
        group.controls.concept.setValue(concept);
      }
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

  private getCatalogId(value: Catalog | number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') return null;

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    const parsed = Number(value.id);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  private toNumberOrZero(value: unknown): number {
    const parsed = Number(value ?? 0);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  private getPhotoIdFromRoute(): number | null {
    const rawPhotoId =
      this.route.snapshot.paramMap.get('photoId') ??
      this.route.snapshot.paramMap.get('id');

    const photoId = Number(rawPhotoId);

    return Number.isFinite(photoId) && photoId > 0 ? photoId : null;
  }

  private getToday(): string {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
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