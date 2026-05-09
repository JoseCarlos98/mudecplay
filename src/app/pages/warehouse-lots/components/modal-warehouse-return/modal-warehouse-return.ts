import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';

import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';
import { LoadingOverlay } from '../../../../shared/ui/loading-overlay/loading-overlay';
import { DialogService } from '../../../../shared/services/dialog.service';

import { WarehouseService } from '../../services/warehouse.service';
import * as entity from '../../interfaces/warehouse-interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

export interface WarehouseReturnModalData {
  lot: entity.WarehouseLotResponseDto;
  movement: entity.WarehouseMovementResponseDto;
}

@Component({
  selector: 'app-modal-warehouse-return',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,

    ModuleHeader,
    InputField,
    BtnsSection,
    LoadingOverlay,
  ],
  templateUrl: './modal-warehouse-return.html',
  styleUrl: './modal-warehouse-return.scss',
})
export class ModalWarehouseReturn {
  readonly data = inject<WarehouseReturnModalData>(MAT_DIALOG_DATA);

  private readonly warehouseService = inject(WarehouseService);
  private readonly dialogService = inject(DialogService);
  private readonly dialogRef = inject(MatDialogRef<ModalWarehouseReturn>);
  private readonly fb = inject(FormBuilder);

  readonly headerConfig = HEADER_CONFIG;
  readonly saving = signal(false);

  readonly modalTitle = 'Regresar material';

  form = this.fb.group({
    notes: this.fb.control<string | null>(null, {
      validators: [Validators.required, Validators.minLength(3)],
    }),
  });

  get lot(): entity.WarehouseLotResponseDto {
    return this.data.lot;
  }

  get movement(): entity.WarehouseMovementResponseDto {
    return this.data.movement;
  }

  get productName(): string {
    return this.lot.product_name_snapshot || 'Producto sin nombre';
  }

  get projectName(): string {
    return this.movement.project_name || 'Sin proyecto';
  }

  get quantityText(): string {
    return this.formatQuantity(this.movement.quantity, this.movement.unit);
  }

  get currentAvailableText(): string {
    return this.formatQuantity(this.lot.available_quantity, this.lot.unit);
  }

  get availableAfterReturnText(): string {
    const current = Number(this.lot.available_quantity ?? 0);
    const returned = Number(this.movement.quantity ?? 0);

    return this.formatQuantity(current + returned, this.lot.unit);
  }

  get amountText(): number {
    return Number(this.movement.amount ?? 0);
  }

  saveData(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const notes = this.form.getRawValue().notes?.trim();

    if (!notes) {
      this.form.get('notes')?.setErrors({ required: true });
      this.form.get('notes')?.markAsTouched();
      return;
    }

    this.saving.set(true);

    this.warehouseService
      .returnWarehouseMovement(this.movement.id, { notes })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.closeModal(true);
          }
        },
        error: (err) => {
          console.error('Error al regresar material:', err);

          this.dialogService
            .confirm({
              title: 'Error',
              message: 'No se pudo regresar el material al almacén.',
              confirmText: 'OK',
              cancelText: '',
              size: 'mini',
            })
            .subscribe();
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
    this.dialogRef.close(!!saved);
  }

  private formatQuantity(value: number, unit?: string | null): string {
    const quantity = Number(value ?? 0).toLocaleString('es-MX', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });

    return `${quantity} ${unit ?? ''}`.trim();
  }
}