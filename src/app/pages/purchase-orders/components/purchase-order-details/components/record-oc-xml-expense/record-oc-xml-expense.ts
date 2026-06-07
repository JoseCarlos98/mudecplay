import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
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
import { LoadingOverlay } from '../../../../../../shared/ui/loading-overlay/loading-overlay';

import { PurchaseOrdersService } from '../../../../services/purchase-orders.service';
import {
  CreateDirectXmlExpenseFromTicketDto,
  PendingTicketPhotoRow,
  PurchaseOrderFlowDetailResponse,
  PurchaseOrderTicketPhotoDto,
} from '../../../../interfaces/purchase-orders.interfaces';

import { ExpenseService } from '../../../../../expenses/services/expense.service';
import * as expenseEntity from '../../../../../expenses/interfaces/expense-interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  formFull: true,
};

@Component({
  selector: 'app-record-oc-xml-expense',
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
  templateUrl: './record-oc-xml-expense.html',
  styleUrl: './record-oc-xml-expense.scss',
})
export class RecordOcXmlExpense implements OnInit {
  @ViewChild('xmlInput') xmlInput!: ElementRef<HTMLInputElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly purchaseOrdersService = inject(PurchaseOrdersService);
  private readonly expenseService = inject(ExpenseService);

  readonly pageTitle = 'Registrar gasto con XML';
  readonly headerConfig = HEADER_CONFIG;

  readonly loadingPage = signal(false);
  readonly loadingPhoto = signal(false);
  readonly loadingXml = signal(false);
  readonly saving = signal(false);

  photoId: number | null = null;

  photo: PendingTicketPhotoRow | null = null;
  photoUrl: string | null = null;
  imageError = false;

  order: PurchaseOrderFlowDetailResponse | null = null;

  xmlDraft: expenseEntity.XmlExpenseDraftDto | null = null;
  xmlDuplicates: expenseEntity.XmlDuplicateDto[] = [];
  xmlErrors: any[] = [];
  xmlFileName: string | null = null;

  errorMessage: string | null = null;

  form: FormGroup = this.fb.group({
    notes: this.fb.control<string | null>(null),
    items: this.fb.array([]),
  });

  ngOnInit(): void {
    this.photoId = this.getPhotoIdFromRoute();

    if (!this.photoId) {
      this.errorMessage = 'No se encontró el identificador de la foto.';
      return;
    }

    this.loadInitialData();
  }

  get itemsFA(): FormArray {
    return this.form.get('items') as FormArray;
  }

  get xmlItems(): any[] {
    return (this.xmlDraft?.items ?? []) as any[];
  }

  get orderFolio(): string {
    return this.order?.folio ?? this.photo?.status_label ?? 'Sin folio';
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

  get xmlSupplierName(): string {
    return this.xmlDraft?.supplier?.name ?? 'Sin proveedor';
  }

  get xmlUuid(): string {
    return this.xmlDraft?.uuid ?? 'Sin UUID';
  }

  get xmlDate(): string {
    return this.xmlDraft?.date ?? 'Sin fecha';
  }

  get xmlTotal(): number {
    if (!this.xmlDraft) return 0;

    return this.xmlItems.reduce((total, item) => {
      return total + this.resolveItemAmount(item);
    }, 0);
  }

  get xmlTotalPaid(): number {
    return this.itemsFA.controls.reduce((total, group) => {
      return total + Number(group.get('payment_amount')?.value ?? 0);
    }, 0);
  }

  get xmlBalance(): number {
    return Math.max(this.xmlTotal - this.xmlTotalPaid, 0);
  }

  get amountDifference(): number {
    return Number((this.xmlTotal - this.requestedAmount).toFixed(2));
  }

  get isDirectWithInvoice(): boolean {
    return (
      this.order?.destination_type === 'direct' &&
      this.order?.will_have_invoice === true
    );
  }

  get isBlockedByFlow(): boolean {
    return !!this.order && !this.isDirectWithInvoice;
  }

  get canSave(): boolean {
    return (
      !!this.photoId &&
      !!this.xmlDraft &&
      this.form.valid &&
      this.isDirectWithInvoice &&
      this.xmlItems.length > 0 &&
      this.xmlTotal > 0 &&
      this.hasValidXmlPayload() &&
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

  openXmlInput(): void {
    this.xmlInput?.nativeElement?.click();
  }

  onXmlSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    this.xmlFileName = file.name;
    this.xmlDraft = null;
    this.xmlDuplicates = [];
    this.xmlErrors = [];
    this.errorMessage = null;
    this.itemsFA.clear();

    this.loadingXml.set(true);

    this.expenseService
      .uploadXml([file])
      .pipe(
        finalize(() => {
          this.loadingXml.set(false);
          input.value = '';
        }),
      )
      .subscribe({
        next: (rawResponse: any) => {
          const response = rawResponse?.body ?? rawResponse;

          if (
            !response ||
            (!('drafts' in response) &&
              !('duplicates' in response) &&
              !('errors' in response))
          ) {
            return;
          }

          const drafts = response.drafts ?? [];
          const duplicates = response.duplicates ?? [];
          const errors = response.errors ?? [];

          this.xmlDuplicates = duplicates;
          this.xmlErrors = errors;

          if (!drafts.length) {
            this.errorMessage =
              errors?.[0]?.reason ||
              (duplicates.length > 0
                ? `El XML "${duplicates[0].sourceFileName ?? 'seleccionado'}" ya está registrado con el UUID ${duplicates[0].uuid}.`
                : null) ||
              'No se encontró un XML válido para registrar.';

            return;
          }

          this.setXmlDraft(drafts[0]);
        },
        error: (err) => {
          console.error('Error al leer XML:', err);

          this.errorMessage =
            err?.error?.message ||
            'Ocurrió un error al procesar el XML.';
        },
      });
  }

  clearXml(): void {
    this.xmlDraft = null;
    this.xmlDuplicates = [];
    this.xmlErrors = [];
    this.xmlFileName = null;
    this.itemsFA.clear();
  }

  saveExpense(): void {
    if (!this.canSave || !this.photoId) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();

    this.saving.set(true);

    this.purchaseOrdersService
      .createDirectXmlExpenseFromTicketPhoto(this.photoId, payload)
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
          console.error('Error registrando gasto XML desde O.C.:', err);

          this.errorMessage =
            err?.error?.message ||
            'No se pudo registrar el gasto con XML.';
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

  onPaymentBlur(index: number): void {
    const group = this.itemsFA.at(index) as FormGroup;
    const item = this.xmlItems[index];

    if (!group || !item) return;

    const paymentCtrl = group.get('payment_amount');
    const paymentDateCtrl = group.get('payment_date');

    if (!paymentCtrl || !paymentDateCtrl) return;

    if (this.isZeroCostDiscountItem(item)) {
      paymentCtrl.setValue(0, { emitEvent: false });
      paymentDateCtrl.setValue(null, { emitEvent: false });

      paymentCtrl.disable({ emitEvent: false });
      paymentDateCtrl.disable({ emitEvent: false });

      return;
    }

    const amount = this.resolveItemAmount(item);
    let payment = Number(paymentCtrl.value ?? 0);

    if (!Number.isFinite(payment) || payment < 0) {
      payment = 0;
      paymentCtrl.setValue(0, { emitEvent: false });
    }

    if (payment > amount) {
      payment = amount;
      paymentCtrl.setValue(amount, { emitEvent: false });
    }

    if (payment > 0) {
      paymentDateCtrl.enable({ emitEvent: false });

      if (!paymentDateCtrl.value) {
        paymentDateCtrl.setValue(this.getToday(), { emitEvent: false });
      }

      return;
    }

    paymentDateCtrl.setValue(null, { emitEvent: false });
    paymentDateCtrl.disable({ emitEvent: false });
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

  private setXmlDraft(draft: expenseEntity.XmlExpenseDraftDto): void {
    this.errorMessage = null;
    this.xmlErrors = [];

    this.xmlDraft = draft;
    this.itemsFA.clear();

    this.xmlItems.forEach((item) => {
      this.itemsFA.push(this.createPaymentGroupForXmlItem(item, draft));
    });
  }

  private buildPayload(): CreateDirectXmlExpenseFromTicketDto {
    const raw = this.form.getRawValue();

    return {
      date: this.xmlDraft?.date || this.getToday(),
      supplier_id: Number(this.xmlDraft?.supplier?.id),
      cfdi_uuid: String(this.xmlDraft?.uuid ?? ''),
      notes: raw.notes?.trim() || null,
      items: this.xmlItems.map((item, index) => {
        const paymentGroup = this.itemsFA.at(index) as FormGroup;


        const isZeroCostDiscount = this.isZeroCostDiscountItem(item);

        const paymentAmount = isZeroCostDiscount
          ? 0
          : this.toNumberOrNull(paymentGroup?.get('payment_amount')?.value);

        return {
          product_id: Number(item.product?.id ?? item.product_id ?? 0),
          concept:
            item.concept ??
            item.description ??
            item.product?.name ??
            this.orderConcept,

          quantity: this.toNumberOrNull(item.quantity),
          unit: item.unit ?? null,
          unit_price: this.toNumberOrNull(item.unit_price),

          base_amount: this.toNumberOrZero(item.base_amount),
          discount_amount: this.toNumberOrZero(item.discount_amount),
          tax_amount: this.toNumberOrZero(item.tax_amount),
          withheld_amount: this.toNumberOrZero(item.withheld_amount),

          amount: this.resolveItemAmount(item),

          payment_amount: paymentAmount,
          payment_date:
            !isZeroCostDiscount && paymentAmount && paymentAmount > 0
              ? paymentGroup?.get('payment_date')?.value || this.getToday()
              : null,
        };
      }),
    };
  }

  private hasValidXmlPayload(): boolean {
    if (!this.xmlDraft?.uuid) return false;
    if (!this.xmlDraft?.supplier?.id) return false;

    return this.xmlItems.every((item, index) => {
      const productId = Number(item.product?.id ?? item.product_id ?? 0);
      const amount = this.resolveItemAmount(item);
      const group = this.itemsFA.at(index) as FormGroup;
      const payment = Number(group?.get('payment_amount')?.value ?? 0);
      const paymentDate = group?.get('payment_date')?.value ?? null;

      if (this.isZeroCostDiscountItem(item)) {
        return productId > 0 && amount === 0 && payment === 0;
      }

      return (
        productId > 0 &&
        amount >= 0 &&
        payment >= 0 &&
        payment <= amount &&
        (payment <= 0 || !!paymentDate)
      );
    });
  }

  private resolvePaymentAmount(item: any): number | null {
    const payment = this.toNumberOrNull(item.payment_amount);

    if (payment === null) return null;

    return payment;
  }

  resolveItemAmount(item: any): number {
    const amount = this.toNumberOrNull(item.amount);

    if (amount !== null) {
      return this.round2(amount);
    }

    const base = this.toNumberOrZero(item.base_amount);
    const discount = this.toNumberOrZero(item.discount_amount);
    const tax = this.toNumberOrZero(item.tax_amount);
    const withheld = this.toNumberOrZero(item.withheld_amount);

    return this.round2(Math.max(0, base - discount) + tax - withheld);
  }

  isZeroCostDiscountItem(item: any): boolean {
    if (!item) return false;

    const amount = this.round2(Number(item.amount ?? 0));
    const baseAmount = this.round2(Number(item.base_amount ?? 0));
    const discountAmount = this.round2(Number(item.discount_amount ?? 0));
    const taxAmount = this.round2(Number(item.tax_amount ?? 0));
    const withheldAmount = this.round2(Number(item.withheld_amount ?? 0));

    const fiscalAmount = this.round2(
      Math.max(0, baseAmount - discountAmount) + taxAmount - withheldAmount,
    );

    return (
      amount === 0 &&
      fiscalAmount === 0 &&
      baseAmount > 0 &&
      discountAmount >= baseAmount &&
      taxAmount === 0 &&
      withheldAmount === 0
    );
  }

  private createPaymentGroupForXmlItem(
    item: any,
    draft: expenseEntity.XmlExpenseDraftDto,
  ): FormGroup {
    const amount = this.resolveItemAmount(item);
    const isZeroCostDiscount = this.isZeroCostDiscountItem(item);

    const defaultPayment = isZeroCostDiscount
      ? 0
      : this.resolvePaymentAmount(item) ?? 0;

    const group = this.fb.group({
      payment_amount: this.fb.control<number | null>(defaultPayment, [
        Validators.min(0),
        Validators.max(amount),
      ]),
      payment_date: this.fb.control<string | null>(
        defaultPayment > 0 ? this.getToday() : null,
      ),
    });

    if (isZeroCostDiscount) {
      group.get('payment_amount')?.disable({ emitEvent: false });
      group.get('payment_date')?.disable({ emitEvent: false });
      return group;
    }

    if (defaultPayment <= 0) {
      group.get('payment_date')?.disable({ emitEvent: false });
    }

    return group;
  }

  resolveFiscalFormula(item: any): string {
    const base = this.toNumberOrZero(item.base_amount);
    const discount = this.toNumberOrZero(item.discount_amount);
    const tax = this.toNumberOrZero(item.tax_amount);
    const withheld = this.toNumberOrZero(item.withheld_amount);

    return `${this.formatMoney(base)} - ${this.formatMoney(discount)} + ${this.formatMoney(tax)} - ${this.formatMoney(withheld)}`;
  }

  getProductName(item: any): string {
    return (
      item.product?.name ??
      item.product_name ??
      item.concept ??
      item.description ??
      'Producto sin nombre'
    );
  }

  getItemConcept(item: any): string {
    return (
      item.concept ??
      item.description ??
      item.product?.name ??
      this.orderConcept
    );
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