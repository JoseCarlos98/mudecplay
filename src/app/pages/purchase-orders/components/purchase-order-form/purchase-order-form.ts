import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin, of } from 'rxjs';

import { MatIconModule } from '@angular/material/icon';

import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import {
  ModuleHeaderAction,
  ModuleHeaderConfig,
} from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import {
  BtnsSection,
  ModuleFooterAction,
} from '../../../../shared/ui/btns-section/btns-section';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { InputSelect } from '../../../../shared/ui/input-select/input-select';
import { Autocomplete } from '../../../../shared/ui/autocomplete/autocomplete';

import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import { toIdForm } from '../../../../shared/helpers/general-helpers';

import { AuthService } from '../../../../auth/services/auth.service';
import { PurchaseOrdersService } from '../../services/purchase-orders.service';
import * as entity from '../../interfaces/purchase-orders.interfaces';
import { PermissionsService } from '../../../../auth/services/permissions.service';
import { WorkstationPrinterService } from '../../../../shared/services/workstation-printer.service';

const HEADER_CONFIG: ModuleHeaderConfig = {
  formFull: true,
};

@Component({
  selector: 'app-purchase-order-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,

    // UI
    ModuleHeader,
    BtnsSection,
    InputField,
    InputSelect,
    Autocomplete,

    // Material
    MatIconModule,
  ],
  templateUrl: './purchase-order-form.html',
  styleUrl: './purchase-order-form.scss',
})
export class PurchaseOrderForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly purchaseOrdersService = inject(PurchaseOrdersService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly workstationPrinterService =
    inject(WorkstationPrinterService);

  readonly headerConfig = HEADER_CONFIG;

  isEditMode = false;
  isSaving = false;
  isLoading = false;
  isLocked = false;

  purchaseOrderId = 0;
  currentOrderStatus: string | null = null;
  currentExpenseLinksCount = 0;

  requesterOptions: Catalog[] = [];

  readonly destinationTypeOptions: Catalog[] = [
    { id: 'direct', name: 'Directo' },
    { id: 'warehouse', name: 'Almacén' },
  ];

  readonly invoiceOptions: Catalog[] = [
    { id: 'true', name: 'Sí' },
    { id: 'false', name: 'No' },
  ];

  form = this.fb.group({
    project_id: this.fb.control<Catalog | number | string | null>(null, {
      validators: [Validators.required],
    }),
    destination_type: this.fb.control<entity.PurchaseOrderDestinationType | null>(
      'direct',
      {
        validators: [Validators.required],
      },
    ),
    will_have_invoice: this.fb.control<string | null>('false', {
      validators: [Validators.required],
    }),
    requested_amount: this.fb.control<string | number | null>(null, {
      validators: [Validators.required],
    }),
    is_zero_amount_invoice: this.fb.control<boolean>(false, {
      nonNullable: true,
    }),
    zero_amount_reason: this.fb.control<string | null>(null, {
      validators: [Validators.maxLength(255)],
    }),
    concept: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(500)],
    }),
    requested_by_employee_id: this.fb.control<number | string | null>(null, {
      validators: [Validators.required],
    }),
    captured_by: this.fb.control(
      { value: '', disabled: true },
      {
        nonNullable: true,
      },
    ),
    notes: this.fb.control<string | null>(null),
  });

  ngOnInit(): void {
    this.setCapturedByUser();
    this.watchDestinationType();
    this.watchZeroAmountInvoice();
    this.watchWillHaveInvoice();

    // Como el destino inicia en "direct", el proyecto debe ser requerido desde el inicio.
    this.applyProjectValidator(this.destinationType);

    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      this.purchaseOrderId = Number(idParam);
      this.isEditMode = true;
    }

    this.loadInitialData();
  }

  get isZeroAmountInvoice(): boolean {
    return Boolean(this.form.get('is_zero_amount_invoice')?.value);
  }

  get zeroAmountInvoiceHelpText(): string {
    return 'Usar solo cuando el proveedor emite un XML/factura en $0.00. Se requiere motivo obligatorio.';
  }

  get pageTitle(): string {
    return this.isEditMode ? 'Editar orden de compra' : 'Nueva orden de compra';
  }

  get saveDisabled(): boolean {
    return (
      this.form.invalid ||
      this.isSaving ||
      this.isLoading ||
      this.isLocked ||
      (!this.isAuthorizedCorrectionMode && this.requesterOptions.length === 0)
    );
  }

  get destinationType(): entity.PurchaseOrderDestinationType | null {
    return this.form.get('destination_type')?.value ?? null;
  }

  get projectHelpText(): string {
    return this.destinationType === 'warehouse'
      ? 'En almacén, el proyecto funciona como referencia de la solicitud.'
      : 'En directo, el proyecto es obligatorio porque el gasto irá al proyecto.';
  }

  get isAuthorizedCorrectionMode(): boolean {
    return (
      this.isEditMode &&
      this.currentOrderStatus === 'authorized' &&
      this.currentExpenseLinksCount === 0 &&
      this.isAdminGeneral() &&
      !this.isLocked
    );
  }

  get showFormStatusAlert(): boolean {
    return this.isEditMode && (this.isLocked || this.isAuthorizedCorrectionMode);
  }

  get formStatusAlertClass(): string {
    return this.isLocked ? 'c-form-alert--danger' : 'c-form-alert--info';
  }

  get formStatusAlertIcon(): string {
    return this.isLocked ? 'lock' : 'info';
  }

  get formStatusAlertMessage(): string {
    if (this.currentOrderStatus === 'cancelled') {
      return 'Esta orden de compra está cancelada y ya no se puede editar.';
    }

    if (this.currentOrderStatus === 'authorized' && !this.isAdminGeneral()) {
      return 'Esta O.C. ya está autorizada. Solo un administrador puede editarla como corrección.';
    }

    if (this.currentOrderStatus === 'authorized' && this.currentExpenseLinksCount > 0) {
      return 'Esta O.C. ya tiene gasto relacionado. Para cambiar destino o factura, primero elimina o quita el gasto relacionado desde el detalle.';
    }

    if (this.isAuthorizedCorrectionMode) {
      return 'Esta O.C. está autorizada, pero no tiene gasto relacionado. Como administrador puedes corregir destino, factura, monto, concepto y notas. El proyecto y solicitante se conservan bloqueados.';
    }

    return '';
  }

  onHeaderAction(action: ModuleHeaderAction | string): void {
    switch (action) {
      case 'back':
        this.navigateToList();
        break;
    }
  }

  onFooterAction(action: ModuleFooterAction | string): void {
    switch (action) {
      case 'cancel':
        this.navigateToList();
        break;

      case 'save':
        this.saveData();
        break;
    }
  }

  saveData(): void {
    if (this.saveDisabled) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();

    if (!payload) return;

    this.isSaving = true;

    const request$ = this.isEditMode
      ? this.purchaseOrdersService.updatePurchaseOrder(
        this.purchaseOrderId,
        payload as entity.UpdatePurchaseOrderDto,
      )
      : this.purchaseOrdersService.createPurchaseOrder(
        payload as entity.CreatePurchaseOrderDto,
      );

    request$
      .pipe(
        finalize(() => {
          this.isSaving = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (response?.success) {
            this.navigateToList();
          }
        },
        error: (err) => {
          console.error('Error guardando orden de compra:', err);
        },
      });
  }

  private loadInitialData(): void {
    this.isLoading = true;

    const order$ =
      this.isEditMode && this.purchaseOrderId
        ? this.purchaseOrdersService.getPurchaseOrderById(this.purchaseOrderId)
        : of(null);

    forkJoin({
      requesters: this.purchaseOrdersService.getPurchaseOrderRequesters(),
      order: order$,
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ requesters, order }) => {
          this.requesterOptions = this.mapRequestersToCatalog(requesters ?? []);

          if (order) {
            this.patchOrder(order);
          }

          this.applyProjectValidator(this.form.get('destination_type')?.value);
        },
        error: (err) => {
          console.error('Error cargando formulario de O.C.:', err);
        },
      });
  }

  private patchOrder(order: entity.PurchaseOrderResponseDto): void {
    this.currentOrderStatus = order.status ?? null;
    this.currentExpenseLinksCount = Number(order.expense_links_count ?? 0);

    this.isLocked = this.shouldLockOrderForm(order);

    this.ensureRequesterOption(order);

    this.form.patchValue({
      project_id: order.project
        ? {
          id: order.project.id,
          name: order.project.name,
        }
        : null,
      destination_type: order.destination_type,
      will_have_invoice: String(Boolean(order.will_have_invoice)),
      requested_amount: Number(order.requested_amount ?? 0),
      is_zero_amount_invoice: Boolean(order.is_zero_amount_invoice),
      zero_amount_reason: order.zero_amount_reason ?? null,
      concept: order.concept ?? '',
      requested_by_employee_id: order.requested_by_employee?.id ?? null,
      captured_by: order.created_by_user?.name ?? this.getCurrentUserName(),
      notes: order.notes ?? null,
    });

    this.applyFormControlState();
  }

  private shouldLockOrderForm(order: entity.PurchaseOrderResponseDto): boolean {
    if (order.status === 'cancelled') return true;

    if (order.status === 'authorized' && !this.isAdminGeneral()) {
      return true;
    }

    if (
      order.status === 'authorized' &&
      Number(order.expense_links_count ?? 0) > 0
    ) {
      return true;
    }

    return false;
  }

  private isAdminGeneral(): boolean {
    return this.permissionsService.hasAnyRole(['ADMIN_GENERAL']);
  }

  private applyFormControlState(): void {
    if (this.isLocked) {
      this.form.disable({ emitEvent: false });
      return;
    }

    this.form.enable({ emitEvent: false });

    this.form.get('captured_by')?.disable({ emitEvent: false });

    if (this.isAuthorizedCorrectionMode) {
      this.form.get('project_id')?.disable({ emitEvent: false });
      this.form.get('requested_by_employee_id')?.disable({ emitEvent: false });
    }

    this.applyProjectValidator(this.form.get('destination_type')?.value);
  }

  private buildPayload():
    | entity.CreatePurchaseOrderDto
    | entity.UpdatePurchaseOrderDto
    | null {
    const raw = this.form.getRawValue();

    const destinationType = raw.destination_type;
    const projectId = this.getNumberId(raw.project_id);
    const requesterId = this.getNumberId(raw.requested_by_employee_id);
    const concept = String(raw.concept ?? '').trim();
    const requestedAmount = this.parseMoney(raw.requested_amount);
    const willHaveInvoice = String(raw.will_have_invoice) === 'true';
    const isZeroAmountInvoice = Boolean(raw.is_zero_amount_invoice);
    const zeroAmountReason = String(raw.zero_amount_reason ?? '').trim();

    if (!destinationType) {
      this.form.get('destination_type')?.setErrors({ required: true });
      this.form.get('destination_type')?.markAsTouched();
      return null;
    }

    if (!concept) {
      this.form.get('concept')?.setErrors({ required: true });
      this.form.get('concept')?.markAsTouched();
      return null;
    }

    if (isZeroAmountInvoice) {
      if (!willHaveInvoice) {
        this.form.get('will_have_invoice')?.setErrors({ required: true });
        this.form.get('will_have_invoice')?.markAsTouched();
        return null;
      }

      if (requestedAmount !== 0) {
        this.form.get('requested_amount')?.setErrors({ zeroAmountRequired: true });
        this.form.get('requested_amount')?.markAsTouched();
        return null;
      }

      if (!zeroAmountReason) {
        this.form.get('zero_amount_reason')?.setErrors({ required: true });
        this.form.get('zero_amount_reason')?.markAsTouched();
        return null;
      }
    } else {
      if (!requestedAmount || requestedAmount <= 0) {
        this.form.get('requested_amount')?.setErrors({ required: true });
        this.form.get('requested_amount')?.markAsTouched();
        return null;
      }
    }

    if (this.isAuthorizedCorrectionMode) {
      return {
        destination_type: destinationType,
        will_have_invoice: willHaveInvoice,
        concept,
        requested_amount: requestedAmount,
        is_zero_amount_invoice: isZeroAmountInvoice,
        zero_amount_reason: isZeroAmountInvoice ? zeroAmountReason : null,
        notes: raw.notes?.trim() || null,
      };
    }

    if (destinationType === 'direct' && !projectId) {
      this.form.get('project_id')?.setErrors({ required: true });
      this.form.get('project_id')?.markAsTouched();
      return null;
    }

    if (!requesterId) {
      this.form.get('requested_by_employee_id')?.setErrors({ required: true });
      this.form.get('requested_by_employee_id')?.markAsTouched();
      return null;
    }

    const payload = {
      project_id: projectId,
      destination_type: destinationType,
      will_have_invoice: willHaveInvoice,
      concept,
      requested_amount: requestedAmount,
      is_zero_amount_invoice: isZeroAmountInvoice,
      zero_amount_reason:
        isZeroAmountInvoice
          ? zeroAmountReason
          : null,
      requested_by_employee_id:
        requesterId,
      notes:
        raw.notes?.trim() || null,
    };

    if (this.isEditMode) {
      return payload;
    }

    return {
      ...payload,

      printer_code:
        this.workstationPrinterService
          .getPrinterCode(),
    };
  }

  private watchDestinationType(): void {
    this.form
      .get('destination_type')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.applyProjectValidator(value);
      });
  }

  private watchZeroAmountInvoice(): void {
    this.form
      .get('is_zero_amount_invoice')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.applyZeroAmountInvoiceState(Boolean(value));
      });
  }

  private watchWillHaveInvoice(): void {
    this.form
      .get('will_have_invoice')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const willHaveInvoice = String(value) === 'true';

        if (!willHaveInvoice && this.isZeroAmountInvoice) {
          this.form.get('is_zero_amount_invoice')?.setValue(false, {
            emitEvent: true,
          });
        }
      });
  }

  private applyZeroAmountInvoiceState(isZeroAmountInvoice: boolean): void {
    const amountControl = this.form.get('requested_amount');
    const invoiceControl = this.form.get('will_have_invoice');
    const reasonControl = this.form.get('zero_amount_reason');

    if (isZeroAmountInvoice) {
      invoiceControl?.setValue('true', { emitEvent: false });
      amountControl?.setValue(0, { emitEvent: false });

      reasonControl?.setValidators([
        Validators.required,
        Validators.maxLength(255),
      ]);
    } else {
      reasonControl?.setValue(null, { emitEvent: false });
      reasonControl?.setValidators([Validators.maxLength(255)]);
    }

    reasonControl?.updateValueAndValidity({ emitEvent: false });
    amountControl?.updateValueAndValidity({ emitEvent: false });
  }

  private applyProjectValidator(
    value: entity.PurchaseOrderDestinationType | null | undefined,
  ): void {
    const projectControl = this.form.get('project_id');

    if (!projectControl) return;

    if (value === 'direct') {
      projectControl.setValidators([Validators.required]);
    } else {
      projectControl.clearValidators();
    }

    projectControl.updateValueAndValidity({ emitEvent: false });
  }

  private setCapturedByUser(): void {
    this.form.get('captured_by')?.setValue(this.getCurrentUserName(), {
      emitEvent: false,
    });
  }

  private getCurrentUserName(): string {
    const user = this.authService.currentUser?.() as any;

    const fullName =
      user?.fullName ??
      user?.full_name ??
      [user?.name, user?.lastName].filter(Boolean).join(' ') ??
      user?.username ??
      user?.email;

    return fullName || 'Usuario actual';
  }

  private mapRequestersToCatalog(
    requesters: entity.PurchaseOrderRequesterDto[],
  ): Catalog[] {
    return requesters
      .filter((item) => !!item.employee_id)
      .map((item) => ({
        id: item.employee_id!,
        name:
          item.employee?.name ??
          item.employee_name ??
          'Solicitante sin nombre',
      }));
  }

  private ensureRequesterOption(order: entity.PurchaseOrderResponseDto): void {
    const requester = order.requested_by_employee;

    if (!requester?.id) return;

    const exists = this.requesterOptions.some(
      (option) => Number(option.id) === Number(requester.id),
    );

    if (exists) return;

    this.requesterOptions = [
      ...this.requesterOptions,
      {
        id: requester.id,
        name: requester.name,
      },
    ];
  }

  private getNumberId(value: unknown): number | null {
    const rawId = toIdForm(value as any);
    const id = Number(rawId);

    if (!id || Number.isNaN(id)) return null;

    return id;
  }

  private parseMoney(value: string | number | null | undefined): number {
    if (typeof value === 'number') {
      return Number(value.toFixed(2));
    }

    const normalized = String(value ?? '')
      .replace(/,/g, '')
      .replace(/\$/g, '')
      .trim();

    const parsed = Number(normalized);

    if (!Number.isFinite(parsed)) return 0;

    return Number(parsed.toFixed(2));
  }

  private navigateToList(): void {
    this.router.navigateByUrl('/ordenes-compra');
  }
}