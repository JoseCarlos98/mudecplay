import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { finalize, take } from 'rxjs';
import { EmployeeLoanDto } from '../../interfaces/loans-interfaces';
import { LoansService } from '../../services/loans.service';
export interface LoanDialogData { loan: EmployeeLoanDto; }
function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
@Component({
  selector: 'app-modal-loan-disburse', standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-loan-disburse.html', styleUrl: './modal-loan-disburse.scss',
})
export class ModalLoanDisburse {
  readonly data = inject<LoanDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ModalLoanDisburse>);
  private readonly loans = inject(LoansService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  saving = false;
  message = '';
  readonly form = this.fb.nonNullable.group({
    disbursed_on: [localDate(), Validators.required],
    confirmed_disbursement: [false, Validators.requiredTrue],
  });
  close(): void { if (!this.saving) this.ref.close(false); }
  save(): void {
    this.message = '';
    const loan = this.data.loan;
    const value = this.form.getRawValue();
    if (loan.status !== 'pending' || this.form.invalid || value.disbursed_on < loan.requested_on) {
      this.form.markAllAsTouched();
      this.message = 'Confirma la entrega y usa una fecha igual o posterior a la solicitud.';
      return;
    }
    this.saving = true;
    this.loans.disburseLoan(loan.id, {
      disbursed_on: value.disbursed_on,
      confirmed_disbursement: true,
    }).pipe(take(1), takeUntilDestroyed(this.destroyRef), finalize(() => this.saving = false))
      .subscribe({
        next: () => this.ref.close(true),
        error: (err) => console.error('No se pudo confirmar el desembolso', err),
      });
  }
}
