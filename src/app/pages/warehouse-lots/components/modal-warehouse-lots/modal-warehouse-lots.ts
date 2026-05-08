import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

// Angular Material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

// UI compartidos
import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { Autocomplete } from '../../../../shared/ui/autocomplete/autocomplete';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';

// Servicios
import { WarehouseService } from '../../services/warehouse.service';

// Interfaces
import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import * as entity from '../../interfaces/warehouse-interfaces';
import { toIdForm } from '../../../../shared/helpers/general-helpers';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

@Component({
  selector: 'app-modal-warehouse-lots',
  imports: [
    CommonModule,
    ReactiveFormsModule,

    // UI
    ModuleHeader,
    Autocomplete,
    InputField,
    BtnsSection,

    // Material
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './modal-warehouse-lots.html',
  styleUrl: './modal-warehouse-lots.scss',
})
export class ModalWarehouseLots implements OnInit {
  readonly data = inject<entity.WarehouseLotResponseDto>(MAT_DIALOG_DATA);

  private readonly warehouseService = inject(WarehouseService);
  private readonly dialogRef = inject(MatDialogRef<ModalWarehouseLots>);
  private readonly fb = inject(FormBuilder);

  readonly headerConfig = HEADER_CONFIG;

  form = this.fb.group({
    project_id: this.fb.control<Catalog | null>(null, {
      validators: Validators.required,
    }),
    quantity: this.fb.control<number | null>(null, {
      validators: [Validators.required, Validators.min(0.0001)],
    }),
    notes: this.fb.control<string | null>(null),
  });

  ngOnInit(): void {
    this.form.get('quantity')?.setValidators([
      Validators.required,
      Validators.min(0.0001),
      Validators.max(Number(this.data.available_quantity ?? 0)),
    ]);

    this.form.get('quantity')?.updateValueAndValidity({ emitEvent: false });
  }

  get availableText(): string {
    return this.formatQuantity(this.data.available_quantity, this.data.unit);
  }

  get originalText(): string {
    return this.formatQuantity(this.data.original_quantity, this.data.unit);
  }

  get assignedPreviewAmount(): number {
    const quantity = Number(this.form.get('quantity')?.value ?? 0);
    const unitCost = Number(this.data.unit_cost ?? 0);

    if (quantity <= 0 || unitCost <= 0) return 0;

    return Number((quantity * unitCost).toFixed(2));
  }

  private formatQuantity(value: number, unit?: string | null): string {
    const quantity = Number(value ?? 0).toLocaleString('es-MX', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });

    return `${quantity} ${unit ?? ''}`.trim();
  }

  saveData(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    const projectId = toIdForm(raw.project_id);
    const quantity = Number(raw.quantity ?? 0);
    const available = Number(this.data.available_quantity ?? 0);

    if (!projectId) {
      this.form.get('project_id')?.setErrors({ required: true });
      this.form.get('project_id')?.markAsTouched();
      return;
    }

    if (quantity <= 0) {
      this.form.get('quantity')?.setErrors({ min: true });
      this.form.get('quantity')?.markAsTouched();
      return;
    }

    if (quantity > available) {
      this.form.get('quantity')?.setErrors({ max: true });
      this.form.get('quantity')?.markAsTouched();
      return;
    }

    const payload: entity.AssignWarehouseLotDto = {
      project_id: projectId,
      quantity,
      notes: raw.notes?.trim() || null,
    };

    this.warehouseService.assignWarehouseLot(this.data.id, payload).subscribe({
      next: (response) => {
        if (response.success) this.closeModal(true);
      },
      error: (err) => console.error('Error al asignar material:', err),
    });
  }

  onBtnsSectionAction(action: string): void {
    switch (action) {
      case 'cancel':
        this.closeModal();
        break;
    }
  }

  closeModal(saved?: boolean): void {
    this.dialogRef.close(!!saved);
  }
}