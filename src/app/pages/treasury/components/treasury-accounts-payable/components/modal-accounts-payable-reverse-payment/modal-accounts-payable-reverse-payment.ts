import { CommonModule } from '@angular/common';

import {
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';

import { MatIconModule } from '@angular/material/icon';

import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';

import { finalize } from 'rxjs';

// UI compartida
import {
  ModuleHeader,
} from '../../../../../../shared/ui/module-header/module-header';

import {
  ModuleHeaderConfig,
} from '../../../../../../shared/ui/module-header/interfaces/module-header-interface';

import {
  BtnsSection,
  ModuleFooterAction,
} from '../../../../../../shared/ui/btns-section/btns-section';

import {
  InputField,
} from '../../../../../../shared/ui/input-field/input-field';

import {
  LoadingOverlay,
} from '../../../../../../shared/ui/loading-overlay/loading-overlay';

// Módulo
import * as entity from '../../interfaces/treasury-accounts-payable.interfaces';

import {
  TreasuryAccountsPayableService,
} from '../../services/treasury-accounts-payable.service';

// =========================================================
// CONFIGURACIÓN
// =========================================================

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

@Component({
  selector: 'app-modal-accounts-payable-reverse-payment',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatIconModule,

    ModuleHeader,
    BtnsSection,
    InputField,
    LoadingOverlay,
  ],
  templateUrl: './modal-accounts-payable-reverse-payment.html',
  styleUrl: './modal-accounts-payable-reverse-payment.scss',
})
export class ModalAccountsPayableReversePayment {

  // =========================================================
  // INYECCIONES
  // =========================================================

  readonly data =
    inject<entity.TreasuryReversePaymentModalData>(
      MAT_DIALOG_DATA,
    );

  private readonly dialogRef =
    inject(
      MatDialogRef<
        ModalAccountsPayableReversePayment
      >,
    );

  private readonly accountsPayableService =
    inject(TreasuryAccountsPayableService);

  private readonly fb =
    inject(FormBuilder);

  private readonly destroyRef =
    inject(DestroyRef);

  // =========================================================
  // UI
  // =========================================================

  readonly headerConfig =
    HEADER_CONFIG;

  readonly saving =
    signal(false);

  // =========================================================
  // FORMULARIO
  // =========================================================

  readonly form =
    this.fb.group({
      reason:
        this.fb.control<string>(
          '',
          {
            nonNullable: true,

            validators: [
              Validators.required,
              Validators.minLength(5),
              Validators.maxLength(500),
            ],
          },
        ),
    });

  // =========================================================
  // DATOS
  // =========================================================

  get payment():
    entity.TreasuryBankMovementHistoryPayment {
    return this.data.payment;
  }

  get movement():
    entity.TreasuryBankMovementHistoryCurrentMovement {
    return this.data.movement;
  }

  get activeApplications():
    entity.TreasuryBankMovementHistoryApplication[] {
    return (
      this.payment.applications ?? []
    ).filter(
      (application) =>
        application.status === 'active',
    );
  }

  get paymentAmount(): number {
    return Number(
      this.payment.amount ?? 0,
    );
  }

  get currentAvailableAmount(): number {
    return Number(
      this.movement.available_amount ?? 0,
    );
  }

  get currentAppliedAmount(): number {
    return Number(
      this.movement.applied_amount ?? 0,
    );
  }

  get availableAfterReverse(): number {
    return this.roundMoney(
      this.currentAvailableAmount +
      this.paymentAmount,
    );
  }

  get appliedAfterReverse(): number {
    return this.roundMoney(
      Math.max(
        0,
        this.currentAppliedAmount -
        this.paymentAmount,
      ),
    );
  }

  get restoredApplicationsAmount(): number {
    return this.roundMoney(
      this.activeApplications.reduce(
        (total, application) =>
          total +
          Number(
            application.applied_amount ??
            0,
          ),
        0,
      ),
    );
  }

  get referenceDisplay(): string {
    return (
      this.payment.reference?.trim() ||
      this.movement.tracking_key?.trim() ||
      this.movement.bank_reference?.trim() ||
      this.movement.receipt_number?.trim() ||
      `Pago ${this.payment.payment_id}`
    );
  }

  get accountDisplay(): string {
    const alias =
      this.movement.bank_account
        ?.alias
        ?.trim();

    const identifier =
      this.movement.bank_account
        ?.account_identifier
        ?.trim();

    if (alias && identifier) {
      return `${alias} · ${identifier}`;
    }

    return (
      alias ||
      identifier ||
      'Sin cuenta'
    );
  }

  get canSave(): boolean {
    return (
      !this.saving() &&
      this.form.valid &&
      Boolean(
        this.payment.payment_id,
      ) &&
      this.payment.status ===
      'active' &&
      this.paymentAmount > 0 &&
      this.activeApplications.length > 0
    );
  }

  // =========================================================
  // GUARDAR
  // =========================================================

  saveData(): void {
    if (
      this.saving() ||
      !this.canSave
    ) {
      this.form.markAllAsTouched();
      return;
    }

    const reason =
      this.form
        .getRawValue()
        .reason
        .trim();

    if (
      reason.length < 5 ||
      reason.length > 500
    ) {
      this.form.markAllAsTouched();
      return;
    }

    const payload:
      entity.TreasuryReversePaymentPayload = {
      reason,
    };

    this.saving.set(true);

    this.accountsPayableService
      .reversePayment(
        this.payment.payment_id,
        payload,
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(() => {
          this.saving.set(false);
        }),
      )
      .subscribe({
        next: (
          response:
            entity.TreasuryReversePaymentResponse,
        ) => {
          if (!response.success) {
            return;
          }

          this.dialogRef.close(
            response,
          );
        },

        error: (error: unknown) => {
          console.error(
            'Error al revertir el pago:',
            error,
          );
        },
      });
  }

  // =========================================================
  // BTN SECTION
  // =========================================================

  onBtnsSectionAction(
    action: ModuleFooterAction,
  ): void {
    switch (action) {
      case 'cancel':
        this.closeModal();
        break;

      default:
        break;
    }
  }

  // =========================================================
  // MODAL
  // =========================================================

  closeModal(): void {
    if (this.saving()) {
      return;
    }

    this.dialogRef.close(null);
  }

  // =========================================================
  // HELPERS
  // =========================================================

  formatDate(
    value:
      | string
      | null
      | undefined,
  ): string {
    if (!value) {
      return '-';
    }

    const date =
      String(value).slice(0, 10);

    const [
      year,
      month,
      day,
    ] = date.split('-');

    if (
      !year ||
      !month ||
      !day
    ) {
      return date;
    }

    return `${day}/${month}/${year}`;
  }

  private roundMoney(
    value: number,
  ): number {
    return Number(
      Number(value ?? 0)
        .toFixed(2),
    );
  }
}