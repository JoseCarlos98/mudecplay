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
import { InputField } from '../../../../../shared/ui/input-field/input-field';
import { LoadingOverlay } from '../../../../../shared/ui/loading-overlay/loading-overlay';

import { EmployeeLoanDto } from '../../interfaces/loans-interfaces';
import { LoansService } from '../../services/loans.service';

/** No se admiten motivos formados solo por espacios. */
function validCancellationReason(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const reason = typeof control.value === 'string' ? control.value.trim() : '';
    if (reason.length < 5 || reason.length > 255) {
      return { cancellationReasonLength: true };
    }
    return null;
  };
}

const HEADER_CONFIG: ModuleHeaderConfig = { modal: true };

@Component({
  selector: 'app-modal-loan-reason',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    ModuleHeader,
    InputField,
    BtnsSection,
    LoadingOverlay,
  ],
  templateUrl: './modal-loan-reason.html',
  styleUrl: './modal-loan-reason.scss',
})
export class ModalLoanReason {
  readonly data = inject<{ loan: EmployeeLoanDto }>(MAT_DIALOG_DATA);

  private readonly ref = inject(MatDialogRef<ModalLoanReason>);
  private readonly loans = inject(LoansService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly headerConfig = HEADER_CONFIG;
  saving = false;

  readonly form = this.fb.nonNullable.group({
    cancellation_reason: ['', [
      Validators.required,
      Validators.minLength(5),
      Validators.maxLength(255),
      validCancellationReason(),
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
    if (!this.saving) this.ref.close(false);
  }

  save(): void {
    // También protege un posible submit por teclado.
    if (!this.canSave) {
      this.form.markAllAsTouched();
      return;
    }

    const reason = this.form.controls.cancellation_reason.value.trim();
    this.saving = true;

    this.loans.cancelLoan(this.data.loan.id, reason)
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => { this.saving = false; }),
      )
      .subscribe({
        next: () => this.ref.close(true),
        // Los mensajes de error/éxito del backend los maneja el interceptor existente.
        error: () => {},
      });
  }
}
