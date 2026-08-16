import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { Autocomplete } from '../../../../shared/ui/autocomplete/autocomplete';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';

import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import { toIdForm } from '../../../../shared/helpers/general-helpers';

import { PurchaseOrdersService } from '../../services/purchase-orders.service';
import * as entity from '../../interfaces/purchase-orders.interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

@Component({
  selector: 'app-modal-purchase-order-requester',
  imports: [
    CommonModule,
    ReactiveFormsModule,

    // UI
    ModuleHeader,
    Autocomplete,
    BtnsSection,

    // Material
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './modal-purchase-order-requester.html',
  styleUrl: './modal-purchase-order-requester.scss',
})
export class ModalPurchaseOrderRequester implements OnInit {
  readonly data = inject<any>(MAT_DIALOG_DATA);

  private readonly purchaseOrdersService = inject(PurchaseOrdersService);
  private readonly dialogRef = inject(MatDialogRef<ModalPurchaseOrderRequester>);
  private readonly fb = inject(FormBuilder);

  readonly headerConfig = HEADER_CONFIG;

  requesters: entity.PurchaseOrderRequesterDto[] = [];

  isLoading = false;
  isSaving = false;
  hasChanges = false;

  form = this.fb.group({
    employee_id: this.fb.control<Catalog | number | string | null>(null, {
      validators: Validators.required,
    }),
  });

  ngOnInit(): void {
    this.loadRequesters();
  }

  get hasRequesters(): boolean {
    return this.requesters.length > 0;
  }

  saveData(): void {
    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const employeeId = Number(toIdForm(raw.employee_id));

    if (!employeeId || Number.isNaN(employeeId)) {
      this.form.get('employee_id')?.setErrors({ required: true });
      this.form.get('employee_id')?.markAsTouched();
      return;
    }

    this.isSaving = true;

    this.purchaseOrdersService
      .createPurchaseOrderRequester({
        employee_id: employeeId,
      })
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: (response) => {
          if (!response?.success) return;

          this.hasChanges = true;
          this.form.reset({ employee_id: null });
          this.loadRequesters();
        },
        error: (err) => {
          console.error('Error agregando solicitante autorizado:', err);
        },
      });
  }

  deactivateRequester(row: entity.PurchaseOrderRequesterDto): void {
    if (!row?.id || this.isSaving) return;

    this.isSaving = true;

    this.purchaseOrdersService
      .deactivatePurchaseOrderRequester(row.id)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: (response) => {
          if (!response?.success) return;

          this.hasChanges = true;
          this.loadRequesters();
        },
        error: (err) => {
          console.error('Error desactivando solicitante autorizado:', err);
        },
      });
  }

  onBtnsSectionAction(action: string): void {
    switch (action) {
      case 'save':
        this.saveData();
        break;

      case 'cancel':
        this.closeModal();
        break;
    }
  }

  closeModal(saved?: boolean): void {
    this.dialogRef.close(saved ?? this.hasChanges);
  }

  private loadRequesters(): void {
    if (this.isLoading) return;

    this.isLoading = true;

    this.purchaseOrdersService
      .getPurchaseOrderRequesters()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          this.requesters = response ?? [];
        },
        error: (err) => {
          console.error('Error cargando solicitantes autorizados:', err);
        },
      });
  }
}