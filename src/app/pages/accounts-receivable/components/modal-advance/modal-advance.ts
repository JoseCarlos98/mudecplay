import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { InputDate } from '../../../../shared/ui/input-date/input-date';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';

import { AccountsReceivableService } from '../../services/accounts-receivable.service';
import {
  AccountReceivableRow,
  CreateAccountReceivableAdvance,
} from '../../interfaces/accounts-receivable-interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

@Component({
  selector: 'app-modal-advance',
  standalone: true,
  imports: [
    CommonModule,
    ModuleHeader,
    ReactiveFormsModule,
    InputField,
    InputDate,
    BtnsSection,
  ],
  templateUrl: './modal-advance.html',
  styleUrl: './modal-advance.scss',
})
export class ModalAdvance {
  readonly data = inject<AccountReceivableRow>(MAT_DIALOG_DATA);

  private readonly dialogRef = inject(MatDialogRef<ModalAdvance>);
  private readonly fb = inject(FormBuilder);
  private readonly accountsReceivableService = inject(AccountsReceivableService);

  readonly headerConfig = HEADER_CONFIG;

  saving = false;

  form: FormGroup = this.fb.group({
    amount: this.fb.control<number | null>(null, {
      validators: [Validators.required, Validators.min(0.01)],
    }),
    advance_date: this.fb.control<string | null>(this.getTodayIsoDate(), {
      validators: [Validators.required],
    }),
  });

  get invoiceDisplay(): string {
    return this.data.series ? `${this.data.series}-${this.data.folio}` : `${this.data.folio}`;
  }

  get totalAmount(): number {
    return Number(this.data.total ?? 0);
  }

  get currentAdvanceAmount(): number {
    return Number(this.data.advance_amount ?? 0);
  }

  get availableAdvanceAmount(): number {
    return Math.max(this.totalAmount - this.currentAdvanceAmount, 0);
  }

  get saveDisabled(): boolean {
    return this.saving || this.form.invalid || this.availableAdvanceAmount <= 0;
  }

  private getTodayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
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

  saveData(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    const payload: CreateAccountReceivableAdvance = {
      amount: Number(raw.amount ?? 0),
      advance_date: raw.advance_date!,
    };

    if (payload.amount > this.availableAdvanceAmount) {
      this.form.get('amount')?.setErrors({ max: true });
      this.form.get('amount')?.markAsTouched();
      return;
    }

    this.saving = true;

    this.accountsReceivableService.addAdvance(this.data.id, payload).subscribe({
      next: (response) => {
        this.saving = false;

        if (response.success) {
          this.dialogRef.close({
            action: 'saved',
          });
        }
      },
      error: (err) => {
        this.saving = false;
        console.error('Error al guardar anticipo:', err);
      },
    });
  }

  closeModal(): void {
    this.dialogRef.close();
  }
}