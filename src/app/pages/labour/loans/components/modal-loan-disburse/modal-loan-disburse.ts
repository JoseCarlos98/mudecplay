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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { finalize, take } from 'rxjs';

import { ModuleHeader } from '../../../../../shared/ui/module-header/module-header';
import {
  ModuleHeaderAction,
  ModuleHeaderConfig,
} from '../../../../../shared/ui/module-header/interfaces/module-header-interface';
import {
  BtnsSection,
  ModuleFooterAction,
} from '../../../../../shared/ui/btns-section/btns-section';
import { InputDate } from '../../../../../shared/ui/input-date/input-date';
import { LoadingOverlay } from '../../../../../shared/ui/loading-overlay/loading-overlay';

import { EmployeeLoanDto } from '../../interfaces/loans-interfaces';
import { LoansService } from '../../services/loans.service';

/** Se mantiene el contrato del diálogo que abre loans.ts. */
export interface LoanDialogData {
  loan: EmployeeLoanDto;
}

function localDate(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** La fecha de entrega nunca puede ser anterior a la solicitud. */
function notBeforeRequestedOn(requestedOn: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) return null; // Validators.required maneja el valor vacío.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { invalidDate: true };
    return value < requestedOn ? { beforeRequestedOn: true } : null;
  };
}

const HEADER_CONFIG: ModuleHeaderConfig = { modal: true };

@Component({
  selector: 'app-modal-loan-disburse',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    ModuleHeader,
    InputDate,
    BtnsSection,
    LoadingOverlay,
  ],
  templateUrl: './modal-loan-disburse.html',
  styleUrl: './modal-loan-disburse.scss',
})
export class ModalLoanDisburse {
  readonly data = inject<LoanDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ModalLoanDisburse>);
  private readonly loans = inject(LoansService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly headerConfig = HEADER_CONFIG;
  saving = false;

  readonly form = this.fb.nonNullable.group({
    disbursed_on: [localDate(), [
      Validators.required,
      notBeforeRequestedOn(this.data.loan.requested_on),
    ]],
  });

  get canSave(): boolean {
    return !this.saving && this.data.loan.status === 'pending' && this.form.valid;
  }

  onHeaderAction(action: ModuleHeaderAction | string): void {
    if (action === 'close') this.close();
  }

  onFooterAction(action: ModuleFooterAction | string): void {
    if (action === 'cancel') this.close();
    if (action === 'save') this.save();
  }

  close(): void {
    if (!this.saving) this.dialogRef.close(false);
  }

  save(): void {
    // Mantener la misma condición del botón incluso si se dispara un submit por Enter.
    if (!this.canSave) {
      this.form.markAllAsTouched();
      return;
    }

    const { disbursed_on } = this.form.getRawValue();
    this.saving = true;

    this.loans.disburseLoan(this.data.loan.id, {
      disbursed_on,
      confirmed_disbursement: true,
    })
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => { this.saving = false; }),
      )
      .subscribe({
        next: () => this.dialogRef.close(true),
        // El interceptor global ya muestra los mensajes de NestJS.
        error: () => {},
      });
  }
}
