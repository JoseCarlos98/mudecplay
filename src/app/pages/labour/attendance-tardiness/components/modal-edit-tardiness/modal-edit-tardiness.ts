import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ModuleHeader } from '../../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../../shared/ui/module-header/interfaces/module-header-interface';
import { BtnsSection } from '../../../../../shared/ui/btns-section/btns-section';
import { UpdateEmployeeAttendanceTardinessDto } from '../../interfaces/attendance-tardiness.interfaces';

export interface EditTardinessModalData {
  id: number;
  employee_name: string;
  area_name: string | null;
  work_date: string;
  arrival_time: string | null;
  tardiness_minutes: number | null;
  tardiness_discount: number | null;
  daily_salary: number | null;
}

export interface EditTardinessModalResult {
  action: 'saved';
  payload: UpdateEmployeeAttendanceTardinessDto;
}

const HEADER_CONFIG: ModuleHeaderConfig = { modal: true };

@Component({
  selector: 'app-modal-edit-tardiness',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModuleHeader, BtnsSection],
  templateUrl: './modal-edit-tardiness.html',
  styleUrl: './modal-edit-tardiness.scss',
})
export class ModalEditTardiness {
  readonly data = inject<EditTardinessModalData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ModalEditTardiness>);
  private readonly fb = inject(FormBuilder);

  readonly headerConfig = HEADER_CONFIG;
  saving = false;

  readonly form = this.fb.group({
    tardinessMinutes: this.fb.control<number>(this.data.tardiness_minutes ?? 0, {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.min(0),
        Validators.max(1439),
        Validators.pattern(/^\d+$/),
      ],
    }),
    reason: this.fb.control<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(255),
      ],
    }),
  });

  get areaName(): string {
    return this.data.area_name?.trim() || 'Sin dato';
  }

  get tardinessMinutes(): number {
    const raw = this.form.controls.tardinessMinutes.value;
    return Number.isInteger(raw) && raw >= 0 && raw <= 1439 ? raw : 0;
  }

  get estimatedDiscount(): number {
    const salary = Number(this.data.daily_salary ?? 0);
    if (!Number.isFinite(salary) || salary <= 0 || !this.form.controls.tardinessMinutes.valid) {
      return 0;
    }
    return Number(((salary / 8 / 60) * this.tardinessMinutes).toFixed(2));
  }

  get canSave(): boolean {
    return !!this.data.arrival_time && this.form.valid &&
      this.form.controls.reason.value.trim().length >= 5 &&
      !this.saving;
  }

  onBtnsSectionAction(action: string): void {
    if (action === 'save') this.save();
    if (action === 'cancel') this.closeModal();
  }

  save(): void {
    if (!this.canSave) return;

    this.saving = true;
    this.dialogRef.close({
      action: 'saved',
      payload: {
        tardiness_minutes: this.tardinessMinutes,
        reason: this.form.controls.reason.value.trim(),
      },
    } satisfies EditTardinessModalResult);
  }

  closeModal(): void {
    this.dialogRef.close(null);
  }
}
