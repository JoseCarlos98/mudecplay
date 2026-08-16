import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ModuleHeader } from '../../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../../shared/ui/module-header/interfaces/module-header-interface';
import { BtnsSection } from '../../../../../shared/ui/btns-section/btns-section';
import { InputField } from '../../../../../shared/ui/input-field/input-field';
import { InputDate } from '../../../../../shared/ui/input-date/input-date';
import {
  InputSelect,
  SelectCatalogOption,
} from '../../../../../shared/ui/input-select/input-select';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

export type OvertimeFormModalMode = 'create' | 'edit';
export type OvertimeFormModalKind = 'overtime' | 'sunday';

export interface OvertimeFormModalRowData {
  id: number;
  employee_name: string;
  area_label: string;
  work_date: string;
  project_name: string;
  overtime_label?: string | null;
  worked_until?: string | null;
  extra_days_label?: string | null;
  amount?: number | null;
}

export interface OvertimeFormModalData {
  mode: OvertimeFormModalMode;
  kind: OvertimeFormModalKind;
  defaultDate: string;
  employeeOptions: SelectCatalogOption[];
  areaOptions: SelectCatalogOption[];
  projectOptions: SelectCatalogOption[];
  row?: OvertimeFormModalRowData | null;
  hourly_rate?: number | null;
  daily_salary?: number | null;
}

export interface OvertimeFormModalResult {
  action: 'saved';
  payload: {
    mode: OvertimeFormModalMode;
    kind: OvertimeFormModalKind;
    id?: number;
    employee_name: string;
    area_label: string;
    work_date: string;
    project_name: string;
    overtime_hours?: number;
    overtime_minutes?: number;
    worked_until?: string;
    extra_days?: 1 | 2;
    amount: number;
  };
}

@Component({
  selector: 'app-modal-overtime-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModuleHeader,
    BtnsSection,
    InputField,
    InputDate,
    InputSelect,
  ],
  templateUrl: './modal-overtime-form.html',
  styleUrl: './modal-overtime-form.scss',
})
export class ModalOvertimeForm {
  readonly data = inject<OvertimeFormModalData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ModalOvertimeForm>);
  private readonly fb = inject(FormBuilder);

  readonly headerConfig = HEADER_CONFIG;
  saving = false;

  readonly minutesOptions: SelectCatalogOption[] = [
    { id: 0, name: '00' },
    { id: 30, name: '30' },
  ];

  readonly form = this.fb.nonNullable.group({
    employee_name: [this.getInitialEmployeeName(), Validators.required],
    area_label: [this.getInitialAreaLabel(), Validators.required],
    work_date: [this.getInitialWorkDate(), Validators.required],
    project_name: [this.getInitialProjectName(), Validators.required],
    overtime_hours: [this.getInitialOvertimeHours(), [Validators.min(0)]],
    overtime_minutes: [this.getInitialOvertimeMinutes()],
    worked_until: [this.getInitialWorkedUntil()],
  });

  readonly isOvertime = computed(() => this.data.kind === 'overtime');
  readonly isSunday = computed(() => this.data.kind === 'sunday');
  readonly isEditMode = computed(() => this.data.mode === 'edit');

  readonly modalTitle = computed(() => {
    if (this.data.kind === 'overtime') {
      return this.data.mode === 'edit'
        ? 'Editar horas extra'
        : 'Registrar horas extra';
    }

    return this.data.mode === 'edit'
      ? 'Editar domingo trabajado'
      : 'Registrar domingo trabajado';
  });

  readonly currentRecordLabel = computed(() => {
    if (this.isOvertime()) {
      const hours = this.getInitialOvertimeHours();
      const minutes = this.getInitialOvertimeMinutes();
      return `${hours} h ${String(minutes).padStart(2, '0')} min`;
    }

    const workedUntil = this.data.row?.worked_until ?? '13:00';
    const extraDays = this.getSundayExtraDaysFromTime(workedUntil);
    return `${workedUntil} · ${extraDays} ${extraDays === 1 ? 'día extra' : 'días extra'}`;
  });

  readonly effectiveHourlyRate = computed(() => Number(this.data.hourly_rate ?? 357.14));
  readonly effectiveDailySalary = computed(() => Number(this.data.daily_salary ?? 410));

  readonly formattedDuration = computed(() => {
    const hours = Number(this.form.controls.overtime_hours.value || 0);
    const minutes = Number(this.form.controls.overtime_minutes.value || 0);

    return `${hours} h ${String(minutes).padStart(2, '0')} min`;
  });

  readonly sundayExtraDays = computed<1 | 2>(() => {
    const workedUntil = this.form.controls.worked_until.value || '13:00';
    return this.getSundayExtraDaysFromTime(workedUntil);
  });

  readonly computedAmount = computed(() => {
    if (this.isOvertime()) {
      const hours = Number(this.form.controls.overtime_hours.value || 0);
      const minutes = Number(this.form.controls.overtime_minutes.value || 0);
      const totalHours = hours + minutes / 60;

      return Number((this.effectiveHourlyRate() * totalHours).toFixed(2));
    }

    return Number((this.effectiveDailySalary() * this.sundayExtraDays()).toFixed(2));
  });

  readonly saveDisabled = computed(() => {
    if (this.form.invalid || this.saving) return true;

    if (this.isOvertime()) {
      const hours = Number(this.form.controls.overtime_hours.value || 0);
      const minutes = Number(this.form.controls.overtime_minutes.value || 0);
      return hours <= 0 && minutes <= 0;
    }

    return !(this.form.controls.worked_until.value || '').trim();
  });

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
    if (this.saveDisabled()) return;

    this.saving = true;

    const value = this.form.getRawValue();

    const result: OvertimeFormModalResult = {
      action: 'saved',
      payload: {
        mode: this.data.mode,
        kind: this.data.kind,
        id: this.data.row?.id,
        employee_name: value.employee_name,
        area_label: value.area_label,
        work_date: value.work_date,
        project_name: value.project_name,
        overtime_hours: this.isOvertime() ? Number(value.overtime_hours || 0) : undefined,
        overtime_minutes: this.isOvertime() ? Number(value.overtime_minutes || 0) : undefined,
        worked_until: this.isSunday() ? (value.worked_until || '13:00') : undefined,
        extra_days: this.isSunday() ? this.sundayExtraDays() : undefined,
        amount: this.computedAmount(),
      },
    };

    this.closeModal(result);
  }

  closeModal(result?: OvertimeFormModalResult): void {
    this.dialogRef.close(result ?? null);
  }

  private getInitialEmployeeName(): string {
    return this.data?.row?.employee_name ?? '';
  }

  private getInitialAreaLabel(): string {
    return this.data?.row?.area_label ?? '';
  }

  private getInitialWorkDate(): string {
    return this.data?.row?.work_date ?? this.data?.defaultDate ?? '';
  }

  private getInitialProjectName(): string {
    return this.data?.row?.project_name ?? '';
  }

  private getInitialWorkedUntil(): string {
    return this.data?.row?.worked_until ?? '13:00';
  }

  private getInitialOvertimeHours(): number {
    if (!this.data?.row?.overtime_label) return 1;

    const match = this.data.row.overtime_label.match(/(\d+)\s*h\s*(\d+)\s*min/i);
    if (!match) return 1;

    return Number(match[1]);
  }

  private getInitialOvertimeMinutes(): number {
    if (!this.data?.row?.overtime_label) return 0;

    const match = this.data.row.overtime_label.match(/(\d+)\s*h\s*(\d+)\s*min/i);
    if (!match) return 0;

    return Number(match[2]);
  }

  private getSundayExtraDaysFromTime(time: string): 1 | 2 {
    return this.toMinutes(time) >= this.toMinutes('14:00') ? 2 : 1;
  }

  private toMinutes(time: string): number {
    const [hours, minutes] = (time || '13:00').split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  }
}