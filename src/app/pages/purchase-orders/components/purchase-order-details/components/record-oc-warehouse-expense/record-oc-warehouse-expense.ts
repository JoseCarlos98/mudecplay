import { Component, OnInit, inject, signal } from '@angular/core';
import {
  CommonModule,
  Location,
} from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';

import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  BtnsSection,
  ModuleFooterAction,
} from '../../../../../../shared/ui/btns-section/btns-section';

import { ModuleHeader } from '../../../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../../../shared/ui/module-header/interfaces/module-header-interface';
import { Autocomplete } from '../../../../../../shared/ui/autocomplete/autocomplete';
import { InputDate } from '../../../../../../shared/ui/input-date/input-date';
import { InputField } from '../../../../../../shared/ui/input-field/input-field';
import { InputSelect } from '../../../../../../shared/ui/input-select/input-select';
import { LoadingOverlay } from '../../../../../../shared/ui/loading-overlay/loading-overlay';

import { Catalog } from '../../../../../../shared/interfaces/general-interfaces';
import { toIdForm } from '../../../../../../shared/helpers/general-helpers';
import { CatalogsService } from '../../../../../../shared/services/catalogs.service';

import { PurchaseOrdersService } from '../../../../services/purchase-orders.service';
import {
  CreateWarehouseExpenseFromTicketDto,
  PendingTicketPhotoRow,
  PurchaseOrderFlowDetailResponse,
  PurchaseOrderTicketPhotoDto,
} from '../../../../interfaces/purchase-orders.interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  formFull: true,
};

@Component({
  selector: 'app-record-oc-warehouse-expense',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    ModuleHeader,
    Autocomplete,
    InputDate,
    InputField,
    InputSelect,
    LoadingOverlay,
    BtnsSection,

    MatIconModule,
  ],
  templateUrl: './record-oc-warehouse-expense.html',
  styleUrl: './record-oc-warehouse-expense.scss',
})
export class RecordOcWarehouseExpense implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly fb = inject(FormBuilder);
  private readonly catalogsService = inject(CatalogsService);
  private readonly purchaseOrdersService = inject(PurchaseOrdersService);
  readonly pageTitle = 'Registrar entrada de almacén';
  readonly headerConfig = HEADER_CONFIG;

  readonly loadingPage = signal(false);
  readonly loadingPhoto = signal(false);

  measurementUnitsCatalog: Catalog[] = [];

  photoId: number | null = null;
  photo: PendingTicketPhotoRow | null = null;
  photoUrl: string | null = null;
  imageError = false;

  order: PurchaseOrderFlowDetailResponse | null = null;
  errorMessage: string | null = null;

  form: FormGroup = this.fb.group({
    date: this.fb.control<string>(this.getToday(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    supplier_id: this.fb.control<Catalog | null>(null),
    notes: this.fb.control<string | null>(null),
    items: this.fb.array([]),
  });

  ngOnInit(): void {
    this.photoId = this.getPhotoIdFromRoute();

    if (!this.photoId) {
      this.errorMessage = 'No se encontró el identificador de la foto.';
      return;
    }

    this.loadCatalogs();
    this.addItem();
    this.loadInitialData();
  }

  get itemsFA(): FormArray {
    return this.form.get('items') as FormArray;
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

  get isWarehouseWithoutInvoice(): boolean {
    return (
      this.order?.destination_type === 'warehouse' &&
      this.order?.will_have_invoice === false
    );
  }

  get isBlockedByFlow(): boolean {
    return !!this.order && !this.isWarehouseWithoutInvoice;
  }

  get totalItems(): number {
    return this.itemsFA.length;
  }

  get totalAmount(): number {
    return this.itemsFA.controls.reduce((sum, group) => {
      return sum + this.getItemAmount(group as FormGroup);
    }, 0);
  }

  get totalPaid(): number {
    return this.itemsFA.controls.reduce((sum, group) => {
      return sum + this.getItemPayment(group as FormGroup);
    }, 0);
  }

  get totalBalance(): number {
    return Math.max(this.totalAmount - this.totalPaid, 0);
  }

  get canSave(): boolean {
    return (
      !!this.photoId &&
      !!this.order &&
      this.isWarehouseWithoutInvoice &&
      this.form.valid &&
      this.itemsFA.length > 0 &&
      this.totalAmount > 0 &&
      this.hasValidPayload()
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

  addItem(): void {
    this.itemsFA.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    if (this.itemsFA.length <= 1) return;

    this.itemsFA.removeAt(index);
  }

  onQuantityOrPriceChange(index: number): void {
    const group = this.itemsFA.at(index) as FormGroup;

    if (!group) return;

    this.recalculateWarehouseAmount(group);
    this.onPaymentBlur(index);
  }

  onPaymentBlur(index: number): void {
    const group = this.itemsFA.at(index) as FormGroup;

    if (!group) return;

    const amount = this.getItemAmount(group);
    const paymentCtrl = group.get('payment_amount');
    const paymentDateCtrl = group.get('payment_date');

    if (!paymentCtrl || !paymentDateCtrl) return;

    let payment = this.toNumberOrZero(paymentCtrl.value);

    if (payment < 0) {
      payment = 0;
      paymentCtrl.setValue(0, { emitEvent: false });
    }

    if (payment > amount) {
      payment = amount;
      paymentCtrl.setValue(amount, { emitEvent: false });
    }

    // Si existe cualquier abono, parcial o completo, se debe capturar fecha.
    if (amount > 0 && payment > 0) {
      paymentDateCtrl.enable({ emitEvent: false });

      if (!paymentDateCtrl.value) {
        paymentDateCtrl.setValue(
          this.form.get('date')?.value || this.getToday(),
          { emitEvent: false },
        );
      }

      return;
    }

    paymentDateCtrl.setValue(null, { emitEvent: false });
    paymentDateCtrl.disable({ emitEvent: false });
  }

  saveWarehouseExpense(): void {
    if (!this.canSave || !this.photoId) {
      this.form.markAllAsTouched();
      this.itemsFA.controls.forEach(
        (control) => control.markAllAsTouched(),
      );
      return;
    }

    const payload = this.buildPayload();

    this.errorMessage = null;

    this.purchaseOrdersService
      .createWarehouseExpenseFromTicketPhoto(
        this.photoId,
        payload,
      )
      .subscribe({
        next: () => {
          this.goBack();
        },
        error: (err) => {
          console.error(
            'Error registrando entrada de almacén desde O.C.:',
            err,
          );

          this.errorMessage =
            err?.error?.message ||
            'No se pudo registrar la entrada de almacén.';
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
    this.location.back();
  }

  getItemAmount(control: AbstractControl): number {
    return this.round2(this.toNumberOrZero(control.get('amount')?.value));
  }

  getItemPayment(control: AbstractControl): number {
    return this.round2(this.toNumberOrZero(control.get('payment_amount')?.value));
  }

  getItemBalance(control: AbstractControl): number {
    return Math.max(
      this.getItemAmount(control) - this.getItemPayment(control),
      0,
    );
  }

  isFullPaid(control: AbstractControl): boolean {
    const amount = this.getItemAmount(control);
    const payment = this.getItemPayment(control);

    return amount > 0 && this.isSameMoney(amount, payment);
  }

  hasPayment(control: AbstractControl): boolean {
    return this.getItemPayment(control) > 0;
  }

  getWarehouseInitialText(control: AbstractControl): string {
    const quantity = this.toNumberOrZero(control.get('quantity')?.value);
    const unitId = toIdForm(control.get('unit_id')?.value);

    const unitName =
      this.measurementUnitsCatalog.find((unit) => Number(unit.id) === Number(unitId))?.name ??
      '';

    if (!quantity || quantity <= 0) return '0';

    return `${quantity.toLocaleString('es-MX')} ${unitName}`.trim();
  }


  private createItemGroup(): FormGroup {
    const group = this.fb.group({
      product_id: this.fb.control<Catalog | null>(null, {
        validators: [Validators.required],
      }),
      concept: this.fb.control<string | null>(null),

      quantity: this.fb.control<number | null>(null, [
        Validators.required,
        Validators.min(0.0001),
      ]),
      unit_id: this.fb.control<Catalog | null>(null, {
        validators: [Validators.required],
      }),
      unit_price: this.fb.control<number | null>(null, [
        Validators.required,
        Validators.min(0.000001),
      ]),

      amount: this.fb.control<number | null>(
        { value: null, disabled: true },
        [Validators.required, Validators.min(0)],
      ),

      payment_amount: this.fb.control<number | null>(null, [Validators.min(0)]),
      payment_date: this.fb.control<string | null>({
        value: null,
        disabled: true,
      }),
    });

    return group;
  }

  private loadCatalogs(): void {
    this.catalogsService.measurementUnitsCatalog().subscribe({
      next: (response) => {
        this.measurementUnitsCatalog = response;
      },
      error: (err) => console.error('Error al cargar unidades de medida:', err),
    });
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

  private recalculateWarehouseAmount(group: FormGroup): void {
    const quantity = this.toNumberOrZero(group.get('quantity')?.value);
    const unitPrice = this.toNumberOrZero(group.get('unit_price')?.value);

    const amount =
      quantity > 0 && unitPrice > 0
        ? this.round2(quantity * unitPrice)
        : 0;

    group.get('amount')?.setValue(amount, { emitEvent: false });
    group.get('amount')?.updateValueAndValidity({ emitEvent: false });

    const paymentAmount = this.toNumberOrZero(group.get('payment_amount')?.value);

    if (paymentAmount > amount) {
      group.get('payment_amount')?.setValue(amount, { emitEvent: false });
    }
  }

  private buildPayload(): CreateWarehouseExpenseFromTicketDto {
    const raw = this.form.getRawValue();

    return {
      date: raw.date || this.getToday(),
      supplier_id: toIdForm(raw.supplier_id),
      notes: raw.notes?.trim() || null,
      items: (raw.items ?? []).map((item: any) => {
        const quantity = this.round4(this.toNumberOrZero(item.quantity));
        const unitPrice = this.round6(this.toNumberOrZero(item.unit_price));
        const amount = this.round2(quantity * unitPrice);
        const paymentAmount = this.toNumberOrNull(item.payment_amount);

        return {
          product_id: Number(toIdForm(item.product_id)),
          concept: item.concept?.trim() || this.orderConcept,

          quantity,
          unit_id: toIdForm(item.unit_id),
          unit_price: unitPrice,

          payment_amount: paymentAmount,
          payment_date:
            paymentAmount !== null && paymentAmount > 0
              ? item.payment_date || raw.date || this.getToday()
              : null,
        };
      }),
    };
  }

  private hasValidPayload(): boolean {
    const raw = this.form.getRawValue();

    if (!raw.date) return false;
    if (!Array.isArray(raw.items) || raw.items.length === 0) return false;

    return raw.items.every((item: any) => {
      const productId = toIdForm(item.product_id);
      const unitId = toIdForm(item.unit_id);
      const quantity = this.toNumberOrZero(item.quantity);
      const unitPrice = this.toNumberOrZero(item.unit_price);
      const amount = this.round2(quantity * unitPrice);
      const payment = this.toNumberOrZero(item.payment_amount);
      const paymentDate = item.payment_date ?? null;

      return (
        Number(productId) > 0 &&
        Number(unitId) > 0 &&
        quantity > 0 &&
        unitPrice > 0 &&
        amount > 0 &&
        payment >= 0 &&
        payment <= amount &&
        (payment <= 0 || !!paymentDate)
      );
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

  onFooterAction(action: ModuleFooterAction): void {
    switch (action) {
      case 'save':
        this.saveWarehouseExpense();
        break;

      case 'cancel':
        this.goBack();
        break;

      default:
        break;
    }
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

  private getToday(): string {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  private toNumberOrZero(value: unknown): number {
    const parsed = Number(value ?? 0);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  private round2(value: number): number {
    return Number(Number(value ?? 0).toFixed(2));
  }

  private round4(value: number): number {
    return Number(Number(value ?? 0).toFixed(4));
  }

  private round6(value: number): number {
    return Number(Number(value ?? 0).toFixed(6));
  }

  private isSameMoney(a: any, b: any): boolean {
    const n1 = this.round2(Number(a ?? 0));
    const n2 = this.round2(Number(b ?? 0));

    return Math.abs(n1 - n2) <= 0.01;
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