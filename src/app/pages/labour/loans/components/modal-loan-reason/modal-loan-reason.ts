import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { finalize, take } from 'rxjs';
import { EmployeeLoanDto } from '../../interfaces/loans-interfaces';
import { LoansService } from '../../services/loans.service';
@Component({
  selector: 'app-modal-loan-reason', standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-loan-reason.html', styleUrl: './modal-loan-reason.scss',
})
export class ModalLoanReason {
  readonly data = inject<{ loan: EmployeeLoanDto }>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ModalLoanReason>);
  private readonly loans = inject(LoansService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  saving = false;
  readonly form = this.fb.nonNullable.group({
    cancellation_reason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(255)]],
  });
  close(): void { if (!this.saving) this.ref.close(false); }
  save(): void {
    if (this.data.loan.status !== 'pending' || this.form.invalid || this.form.controls.cancellation_reason.value.trim().length < 5) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.loans.cancelLoan(this.data.loan.id, this.form.controls.cancellation_reason.value.trim())
      .pipe(take(1), takeUntilDestroyed(this.destroyRef), finalize(() => this.saving = false))
      .subscribe({
        next: () => this.ref.close(true),
        error: (err) => console.error('No se pudo cancelar el préstamo', err),
      });
  }
}
