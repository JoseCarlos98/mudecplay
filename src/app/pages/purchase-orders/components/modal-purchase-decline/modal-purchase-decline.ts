import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
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

import { DialogService } from '../../../../shared/services/dialog.service';
import { PurchaseOrdersService } from '../../services/purchase-orders.service';

import * as entity from '../../interfaces/purchase-orders.interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

@Component({
  selector: 'app-modal-purchase-decline',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModuleHeader,
    BtnsSection,
    InputField,
  ],
  templateUrl: './modal-purchase-decline.html',
  styleUrl: './modal-purchase-decline.scss',
})
export class ModalPurchaseDecline {
  readonly data = inject<entity.PurchaseOrderResponseDto>(MAT_DIALOG_DATA);

  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ModalPurchaseDecline>);
  private readonly purchaseOrdersService = inject(PurchaseOrdersService);
  private readonly dialogService = inject(DialogService);

  readonly headerConfig = HEADER_CONFIG;

  saving = false;

  form = this.fb.group({
    reason: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(500)],
    }),
  });

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
        this.declinePurchaseOrder();
        break;

      case 'cancel':
        this.closeModal();
        break;
    }
  }

  declinePurchaseOrder(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    const payload: entity.RejectPurchaseOrderDto = {
      reason: raw.reason.trim(),
    };

    this.saving = true;

    this.purchaseOrdersService
      .rejectPurchaseOrder(this.data.id, payload)
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
          console.error('Error al rechazar orden de compra:', err);

          this.dialogService
            .confirm({
              title: 'Error',
              message: 'No se pudo marcar la orden de compra como no autorizada.',
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
}