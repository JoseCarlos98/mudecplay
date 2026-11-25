import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { finalize, take } from 'rxjs';

import { ModuleHeader } from '../../../../../shared/ui/module-header/module-header';
import {
  ModuleHeaderAction,
  ModuleHeaderConfig,
} from '../../../../../shared/ui/module-header/interfaces/module-header-interface';
import { BtnsSection, ModuleFooterAction } from '../../../../../shared/ui/btns-section/btns-section';
import { InputDate } from '../../../../../shared/ui/input-date/input-date';
import { LoadingOverlay } from '../../../../../shared/ui/loading-overlay/loading-overlay';
import { PayrollService } from '../../services/payroll.service';

interface PayrollCalendarPreview {
  week_start: string;
  week_end: string;
  overtime_start: string;
  overtime_end: string;
  pay_date: string;
}

/** Valida fecha real YYYY-MM-DD y día domingo sin depender de zona horaria local. */
const validSunday: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (!value) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { invalidDate: true };
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return { invalidDate: true };
  }
  return date.getUTCDay() === 0 ? null : { notSunday: true };
};

function shiftDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const HEADER_CONFIG: ModuleHeaderConfig = { modal: true };

@Component({
  selector: 'app-modal-payroll-period-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    ModuleHeader,
    BtnsSection,
    InputDate,
    LoadingOverlay,
  ],
  templateUrl: './modal-payroll-period-form.html',
  styleUrl: './modal-payroll-period-form.scss',
})
export class ModalPayrollPeriodForm {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PayrollService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(MatDialogRef<ModalPayrollPeriodForm>);

  readonly headerConfig = HEADER_CONFIG;
  saving = false;

  readonly form = this.fb.group({
    week_start: this.fb.nonNullable.control('', [Validators.required, validSunday]),
  });

  get canSave(): boolean {
    return !this.saving && this.form.valid;
  }

  get calendar(): PayrollCalendarPreview | null {
    const control = this.form.controls.week_start;
    if (control.invalid || !control.value) return null;
    const start = control.value;
    return {
      week_start: start,
      week_end: shiftDays(start, 6),
      overtime_start: shiftDays(start, -3),
      overtime_end: shiftDays(start, 3),
      pay_date: shiftDays(start, 6),
    };
  }

  onHeaderAction(action: ModuleHeaderAction | string): void {
    if (action === 'close') this.cancel();
  }

  onFooterAction(action: ModuleFooterAction | string): void {
    if (action === 'cancel') this.cancel();
    if (action === 'save') this.save();
  }

  cancel(): void {
    if (!this.saving) this.dialogRef.close(false);
  }

  save(): void {
    if (!this.canSave) {
      this.form.markAllAsTouched();
      return;
    }

    const week_start = this.form.getRawValue().week_start;
    this.saving = true;
    this.service.createPeriod(week_start)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef), finalize(() => { this.saving = false; }))
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: () => {}, // Únicamente el interceptor global presenta errores HTTP.
      });
  }
}
