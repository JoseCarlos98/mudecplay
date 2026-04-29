import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ModuleHeaderConfig } from '../../../../../shared/ui/module-header/interfaces/module-header-interface';
import { ModuleHeader } from '../../../../../shared/ui/module-header/module-header';
import { BtnsSection } from '../../../../../shared/ui/btns-section/btns-section';
import { InputField } from '../../../../../shared/ui/input-field/input-field';



const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

export type MarkAttendanceMode = 'mark' | 'edit';

export interface MarkAttendanceModalData {
  mode: MarkAttendanceMode;
  id: number;
  employee_name: string;
  area_name: string | null;
  work_date: string;
  arrival_time: string | null;
  tardiness_reason: string | null;
  daily_salary?: number | null;
}

export interface MarkAttendanceModalResult {
  action: 'saved';
  payload: {
    arrival_time: string;
    is_tardy: boolean;
    tardiness_minutes: number;
    tardiness_discount: number | null;
    tardiness_reason: string | null;
  };
}

@Component({
  selector: 'app-modal-mark-attendance',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModuleHeader,
    BtnsSection,
    InputField,
  ],
  templateUrl: './modal-mark-attendance.html',
  styleUrl: './modal-mark-attendance.scss',
})
export class ModalMarkAttendance {
  readonly data = inject<MarkAttendanceModalData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ModalMarkAttendance>);
  private readonly fb = inject(FormBuilder);

  readonly headerConfig = HEADER_CONFIG;

  saving = false;

  form = this.fb.group({
    arrivalTime: this.fb.control<string>(this.getInitialArrivalTime(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    tardinessReason: this.fb.control<string>(this.data.tardiness_reason ?? '', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  get modalTitle(): string {
    return this.data.mode === 'edit'
      ? 'Editar hora de llegada'
      : 'Marcar llegada';
  }

  get areaName(): string {
    return this.data.area_name?.trim() || 'Sin dato';
  }

  get isEditMode(): boolean {
    return this.data.mode === 'edit';
  }

  get isTardy(): boolean {
    const arrivalTime = this.form.controls.arrivalTime.value;
    if (!arrivalTime) return false;

    return this.toMinutes(arrivalTime) > this.toMinutes('08:10');
  }

  get tardinessMinutes(): number {
    const arrivalTime = this.form.controls.arrivalTime.value;
    if (!arrivalTime) return 0;

    const arrival = this.toMinutes(arrivalTime);
    const tolerance = this.toMinutes('08:10');
    const base = this.toMinutes('08:00');

    if (arrival <= tolerance) return 0;
    return Math.max(arrival - base, 0);
  }

  get tardinessDiscount(): number | null {
    const dailySalary = this.data.daily_salary ?? null;
    const minutes = this.tardinessMinutes;

    if (!dailySalary || minutes <= 0) return null;

    return (dailySalary / 8 / 60) * minutes;
  }

  onBtnsSectionAction(action: string): void {
    switch (action) {
      case 'save':
        this.save();
        break;

      case 'cancel':
        this.closeModal();
        break;
    }
  }

  private save(): void {
    if (this.form.invalid || this.saving) return;

    this.saving = true;

    const arrivalTime = this.form.controls.arrivalTime.value;
    const reasonRaw = this.form.controls.tardinessReason.value.trim();

    const result: MarkAttendanceModalResult = {
      action: 'saved',
      payload: {
        arrival_time: arrivalTime,
        is_tardy: this.isTardy,
        tardiness_minutes: this.tardinessMinutes,
        tardiness_discount: this.tardinessDiscount,
        tardiness_reason: this.isTardy ? (reasonRaw || null) : null,
      },
    };

    this.closeModal(result);
  }

  closeModal(result?: MarkAttendanceModalResult): void {
    this.dialogRef.close(result ?? null);
  }

  private getInitialArrivalTime(): string {
    return this.data.arrival_time ?? '08:00';
  }

  private toMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}