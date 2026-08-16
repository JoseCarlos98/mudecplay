import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs';

import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { Autocomplete } from '../../../../shared/ui/autocomplete/autocomplete';

import { DialogService } from '../../../../shared/services/dialog.service';
import { Catalog } from '../../../../shared/interfaces/general-interfaces';

import { PurchaseOrdersService } from '../../services/purchase-orders.service';
import * as entity from '../../interfaces/purchase-orders.interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

@Component({
  selector: 'app-modal-authorize-purchase-order',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModuleHeader,
    BtnsSection,
    InputField,
    Autocomplete,
  ],
  templateUrl: './modal-authorize-purchase-order.html',
  styleUrl: './modal-authorize-purchase-order.scss',
})
export class ModalAuthorizePurchaseOrder implements OnInit {
  readonly data = inject<entity.PurchaseOrderResponseDto>(MAT_DIALOG_DATA);

  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ModalAuthorizePurchaseOrder>);
  private readonly purchaseOrdersService = inject(PurchaseOrdersService);
  private readonly dialogService = inject(DialogService);

  readonly headerConfig = HEADER_CONFIG;

  saving = false;
  loadingAuthorizers = false;

  authorizerOptions: Catalog[] = [];

  form = this.fb.group({
    authorized_by_employee_id: this.fb.control<Catalog | number | string | null>(
      null,
      {
        validators: [Validators.required],
      },
    ),
    notes: this.fb.control<string | null>(null),
  });

  ngOnInit(): void {
    this.loadAuthorizers();
  }

  get projectName(): string {
    return this.data?.project?.name || 'Sin proyecto';
  }

  get requesterName(): string {
    return (
      this.data?.requested_by_employee?.name ||
      this.data?.requested_by_name ||
      'Sin solicitante'
    );
  }

  get capturedByName(): string {
    return this.data?.created_by_user?.name || 'Sin usuario';
  }

  get destinationLabel(): string {
    return this.data?.destination_type_label || 'Sin destino';
  }

  get invoiceLabel(): string {
    return this.data?.will_have_invoice_label || 'Sin dato';
  }

  get statusLabel(): string {
    return this.data?.status_label || 'Sin estatus';
  }

  onBtnsSectionAction(action: string): void {
    switch (action) {
      case 'save':
        this.authorizePurchaseOrder();
        break;

      case 'cancel':
        this.closeModal();
        break;
    }
  }

  authorizePurchaseOrder(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    const authorizedByEmployeeId = this.getCatalogId(
      raw.authorized_by_employee_id,
    );

    if (!authorizedByEmployeeId) {
      this.form.controls.authorized_by_employee_id.setErrors({
        required: true,
      });
      this.form.markAllAsTouched();
      return;
    }

    const payload: entity.AuthorizePurchaseOrderDto = {
      authorized_by_employee_id: authorizedByEmployeeId,
      notes: raw.notes?.trim() || null,
    };

    this.saving = true;

    this.purchaseOrdersService
      .authorizePurchaseOrder(this.data.id, payload)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.closeModal(true);
          }
        },
        error: (err) => {
          console.error('Error al autorizar orden de compra:', err);

          this.dialogService
            .confirm({
              title: 'Error',
              message: 'No se pudo autorizar la orden de compra.',
              confirmText: 'OK',
              cancelText: '',
            })
            .subscribe();
        },
      });
  }

  closeModal(saved?: boolean): void {
    this.dialogRef.close(!!saved);
  }

  private loadAuthorizers(): void {
    if (this.loadingAuthorizers) return;

    this.loadingAuthorizers = true;

    this.purchaseOrdersService
      .getPurchaseOrderAuthorizers()
      .pipe(
        finalize(() => {
          this.loadingAuthorizers = false;
        }),
      )
      .subscribe({
        next: (rows) => {
          this.authorizerOptions = (rows ?? [])
            .map((row) => {
              const id = row.employee_id ?? row.employee?.id;

              if (!id) return null;

              return {
                id,
                name:
                  row.employee_name ??
                  row.employee?.name ??
                  'Empleado sin nombre',
              } as Catalog;
            })
            .filter((item): item is Catalog => item !== null);
        },
        error: (err) => {
          console.error('Error al cargar autorizadores:', err);
          this.authorizerOptions = [];
        },
      });
  }

  private getCatalogId(value: Catalog | number | string | null): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    const parsed = Number(value.id);
    return Number.isFinite(parsed) ? parsed : null;
  }
}