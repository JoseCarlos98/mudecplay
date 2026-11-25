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
import { AuthService } from '../../../../../auth/services/auth.service';
import { EmployeeCompensationDto } from '../../interfaces/compensations-interfaces';
import { CompensationsService } from '../../services/compensations.service';

// El backend exige entre 5 y 255 caracteres útiles, sin espacios extremos.
const validCancellationReason: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const reason = typeof control.value === 'string' ? control.value.trim() : '';
  return reason.length >= 5 && reason.length <= 255 ? null : { cancellationReason: true };
};

const HEADER_CONFIG: ModuleHeaderConfig = { modal: true };

@Component({
  selector: 'app-modal-compensation-cancel',
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
  templateUrl: './modal-compensation-cancel.html',
  styleUrl: './modal-compensation-cancel.scss',
})
export class ModalCompensationCancel {
  readonly data = inject<{ compensation: EmployeeCompensationDto }>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ModalCompensationCancel>);
  private readonly service = inject(CompensationsService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly headerConfig = HEADER_CONFIG;
  saving = false;

  readonly form = this.fb.nonNullable.group({
    cancellation_reason: ['', [
      Validators.required,
      Validators.minLength(5),
      Validators.maxLength(255),
      validCancellationReason,
    ]],
  });

  get canSave(): boolean {
    return !this.saving && this.form.valid &&
      this.data.compensation.status === 'pending' &&
      (this.auth.hasRole('NOMINA_EDITOR') || this.auth.hasRole('ADMIN_GENERAL'));
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
    // Doble protección por si se intenta enviar mediante Enter.
    if (!this.canSave) {
      this.form.markAllAsTouched();
      return;
    }

    const reason = this.form.controls.cancellation_reason.value.trim();
    this.saving = true;
    this.service.cancelCompensation(String(this.data.compensation.id), reason)
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => { this.saving = false; }),
      )
      .subscribe({
        next: () => this.dialogRef.close(true),
        // El interceptor global muestra el error o éxito enviado por NestJS.
        error: () => {},
      });
  }
}
