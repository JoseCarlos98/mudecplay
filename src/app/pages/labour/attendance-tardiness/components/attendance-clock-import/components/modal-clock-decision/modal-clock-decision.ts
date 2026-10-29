import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { InputSelect, SelectCatalogOption } from '../../../../../../../shared/ui/input-select/input-select';
import { BtnsSection } from '../../../../../../../shared/ui/btns-section/btns-section';
import { ModuleHeader } from '../../../../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../../../../shared/ui/module-header/interfaces/module-header-interface';
import { ClockRowDecision, ClockSaveDecisionPayload, ClockStagedTableRow } from '../../interfaces/attendance-clock-import.interfaces';


export interface ClockDecisionModalData {
  row: ClockStagedTableRow;
}

export interface ClockDecisionModalResult {
  action: 'save';
  payload: ClockSaveDecisionPayload;
}

const HEADER_CONFIG: ModuleHeaderConfig = { modal: true };

@Component({
  selector: 'app-modal-clock-decision',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, ModuleHeader, BtnsSection, InputSelect],
  templateUrl: './modal-clock-decision.html',
  styleUrl: './modal-clock-decision.scss',
})
export class ModalClockDecision {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ModalClockDecision>);
  readonly data = inject<ClockDecisionModalData>(MAT_DIALOG_DATA);
  readonly headerConfig = HEADER_CONFIG;

  readonly decisionOptions: SelectCatalogOption[] = this.getDecisionOptions();
  readonly arrivalOptions: SelectCatalogOption[] = [...new Set(this.data.row.original_marks ?? [])]
    .map((time) => ({ id: time, name: time }));

  readonly form = this.fb.group({
    decision: this.fb.control<ClockRowDecision | null>(null, Validators.required),
    approvedArrivalTime: this.fb.control<string | null>(null),
    reason: this.fb.control<string>('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
  });

  get selectedDecision(): ClockRowDecision | null {
    return this.form.controls.decision.value;
  }

  get manualArrival(): boolean {
    return this.selectedDecision === 'import_arrival' &&
      ['incomplete_marks', 'multiple_marks'].includes(this.data.row.issues?.review_code ?? '');
  }

  get standardArrival(): boolean {
    return this.selectedDecision === 'import_arrival' && !this.manualArrival;
  }

  get needsReason(): boolean {
    return this.selectedDecision === 'confirm_absence' || this.selectedDecision === 'skip' || this.manualArrival;
  }

  get isValid(): boolean {
    if (this.form.invalid || !this.selectedDecision) return false;
    if (this.needsReason && this.form.controls.reason.value.trim().length < 5) return false;
    if (this.manualArrival && !this.arrivalOptions.some((option) =>
      option.id === this.form.controls.approvedArrivalTime.value)) return false;
    if (this.standardArrival && !this.data.row.original_arrival_time) return false;
    return true;
  }

  constructor() {
    this.form.controls.decision.valueChanges.subscribe(() => {
      this.form.controls.approvedArrivalTime.reset(null);
    });
  }

  onBtnsSectionAction(action: string): void {
    if (action === 'cancel') this.close();
    if (action === 'save') this.save();
  }

  save(): void {
    if (!this.isValid || !this.selectedDecision) return;
    const decision = this.selectedDecision;
    const time = decision !== 'import_arrival' ? undefined
      : this.manualArrival
        ? this.form.controls.approvedArrivalTime.value
        : this.data.row.original_arrival_time;
    const payload: ClockSaveDecisionPayload = {
      decision,
      ...(decision === 'import_arrival' ? { approved_arrival_time: time } : {}),
      ...(this.form.controls.reason.value.trim()
        ? { resolution_note: this.form.controls.reason.value.trim() } : {}),
    };
    this.dialogRef.close({ action: 'save', payload } satisfies ClockDecisionModalResult);
  }

  close(): void {
    this.dialogRef.close(null);
  }

  private getDecisionOptions(): SelectCatalogOption[] {
    const code = this.data.row.issues?.review_code;
    const result: SelectCatalogOption[] = [];
    if (['new_arrival', 'existing_attendance_without_arrival', 'incomplete_marks', 'multiple_marks'].includes(code ?? '')) {
      result.push({ id: 'import_arrival', name: 'Aprobar llegada' });
    }
    if (code === 'possible_absence') result.push({ id: 'confirm_absence', name: 'Confirmar falta' });
    result.push({ id: 'skip', name: 'Omitir registro' });
    return result;
  }
}
