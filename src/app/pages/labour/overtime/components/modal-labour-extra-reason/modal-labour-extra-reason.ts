import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ModuleHeader } from '../../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../../shared/ui/module-header/interfaces/module-header-interface';
import { BtnsSection } from '../../../../../shared/ui/btns-section/btns-section';

export interface LabourExtraReasonDialogData {
  action: 'cancel' | 'reverse';
  kind: 'overtime' | 'sunday';
  employeeName: string;
  workDate: string;
  amount: number;
}

const HEADER_CONFIG: ModuleHeaderConfig = { modal: true };

@Component({
  selector: 'app-modal-labour-extra-reason',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModuleHeader, BtnsSection],
  templateUrl: './modal-labour-extra-reason.html',
  styleUrl: './modal-labour-extra-reason.scss',
})
export class ModalLabourExtraReason {
  readonly data = inject<LabourExtraReasonDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ModalLabourExtraReason, string | null>);
  private readonly fb = inject(FormBuilder);

  readonly headerConfig = HEADER_CONFIG;
  readonly form = this.fb.nonNullable.group({
    reason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(255)]],
  });

  get modalTitle(): string {
    return this.data.action === 'cancel' ? 'Cancelar registro pendiente' : 'Revertir autorización';
  }

  get recordLabel(): string {
    return this.data.kind === 'overtime' ? 'Horas extra' : 'Domingo trabajado';
  }

  get reasonLength(): number { return this.form.controls.reason.value.trim().length; }
  get saveDisabled(): boolean {
    return this.form.invalid || this.reasonLength < 5 || this.reasonLength > 255;
  }

  onBtnsSectionAction(action: string): void {
    if (action === 'save') this.save();
    if (action === 'cancel') this.closeModal();
  }

  private save(): void {
    if (this.saveDisabled) return;
    this.dialogRef.close(this.form.controls.reason.value.trim());
  }

  closeModal(): void { this.dialogRef.close(null); }
}
