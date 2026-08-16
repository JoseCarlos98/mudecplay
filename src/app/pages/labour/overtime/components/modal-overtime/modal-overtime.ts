import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ModuleHeader } from '../../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../../shared/ui/module-header/interfaces/module-header-interface';
import { BtnsSection } from '../../../../../shared/ui/btns-section/btns-section';
import { InputField } from '../../../../../shared/ui/input-field/input-field';

export type OvertimeAuthorizeKind = 'overtime' | 'sunday';

export interface OvertimeAuthorizeModalData {
  id: number;
  kind: OvertimeAuthorizeKind;
  employee_name: string;
  area_label: string | null;
  work_date: string;
  project_name: string;
  overtime_label?: string | null;
  worked_until?: string | null;
  extra_days_label?: string | null;
  amount: number;
  authorized_by?: string | null;
}

export interface OvertimeAuthorizeModalResult {
  action: 'authorized';
  payload: {
    id: number;
    authorization_note: string | null;
  };
}

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

@Component({
  selector: 'app-modal-overtime',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModuleHeader,
    BtnsSection,
    InputField,
  ],
  templateUrl: './modal-overtime.html',
  styleUrl: './modal-overtime.scss',
})
export class ModalOvertime {
  readonly data = inject<OvertimeAuthorizeModalData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ModalOvertime>);
  private readonly fb = inject(FormBuilder);

  readonly headerConfig = HEADER_CONFIG;
  saving = false;

  form = this.fb.group({
    authorizationNote: this.fb.control<string>(''),
  });

  readonly modalTitle = computed(() =>
    this.data.kind === 'overtime'
      ? 'Autorizar horas extra'
      : 'Autorizar domingo trabajado',
  );

  readonly areaName = computed(() => this.data.area_label?.trim() || 'Sin dato');

  readonly detailLabel = computed(() =>
    this.data.kind === 'overtime' ? 'Horas registradas' : 'Detalle domingo',
  );

  readonly detailValue = computed(() => {
    if (this.data.kind === 'overtime') {
      return this.data.overtime_label || 'Sin dato';
    }

    const workedUntil = this.data.worked_until || 'Sin dato';
    const extraDays = this.data.extra_days_label || 'Sin dato';
    return `${workedUntil} · ${extraDays}`;
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
    if (this.saving) return;

    this.saving = true;

    const result: OvertimeAuthorizeModalResult = {
      action: 'authorized',
      payload: {
        id: this.data.id,
        authorization_note: this.form.controls.authorizationNote.value?.trim() || null,
      },
    };

    this.closeModal(result);
  }

  closeModal(result?: OvertimeAuthorizeModalResult): void {
    this.dialogRef.close(result ?? null);
  }
}