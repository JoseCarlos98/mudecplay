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

import {
  MatIconModule,
} from '@angular/material/icon';

import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';

import {
  finalize,
} from 'rxjs';

// =========================================================
// UI COMPARTIDA
// =========================================================

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

// =========================================================
// SERVICIOS COMPARTIDOS
// =========================================================

import {
  DialogService,
} from '../../../../../../shared/services/dialog.service';

// =========================================================
// MÓDULO
// =========================================================

import * as entity
  from '../../interfaces/treasury-accounts-payable.interfaces';

import {
  TreasuryAccountsPayableService,
} from '../../services/treasury-accounts-payable.service';

// =========================================================
// CONFIGURACIÓN
// =========================================================

const HEADER_CONFIG:
  ModuleHeaderConfig = {
    modal: true,
  };

@Component({
  selector:
    'app-modal-reverse-payment',

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

  templateUrl:
    './modal-reverse-payment.html',

  styleUrl:
    './modal-reverse-payment.scss',
})
export class ModalReversePayment {

  // =========================================================
  // INYECCIONES
  // =========================================================

  readonly data =
    inject<
      entity.TreasuryCurrentPaymentReverseModalData
    >(MAT_DIALOG_DATA);

  private readonly dialogRef =
    inject(
      MatDialogRef<
        ModalReversePayment,
        | entity.TreasuryReversePaymentResponse
        | null
      >,
    );

  private readonly accountsPayableService =
    inject(
      TreasuryAccountsPayableService,
    );

  private readonly dialogService =
    inject(
      DialogService,
    );

  private readonly fb =
    inject(
      FormBuilder,
    );

  private readonly destroyRef =
    inject(
      DestroyRef,
    );

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
              Validators.minLength(
                5,
              ),
              Validators.maxLength(
                500,
              ),
            ],
          },
        ),
    });

  // =========================================================
  // INFORMACIÓN RECIBIDA
  // =========================================================

  get payment():
    entity.TreasuryCurrentPaymentReverseModalPayment {
    return this.data.payment;
  }

  get application():
    entity.TreasuryCurrentPaymentReverseModalApplication {
    return this.data.application;
  }

  get expenseItem():
    entity.TreasuryCurrentPaymentReverseModalExpenseItem {
    return this.data.expense_item;
  }

  get paymentId(): string {
    return String(
      this.payment.id ??
      '',
    ).trim();
  }

  get paymentAmount(): number {
    return Number(
      this.payment.amount ??
      0,
    );
  }

  get appliedAmount(): number {
    return Number(
      this.application
        .applied_amount ??
      0,
    );
  }

  get currentPaidAmount(): number {
    return Number(
      this.expenseItem
        .paid_amount ??
      0,
    );
  }

  get currentPendingAmount(): number {
    return Number(
      this.expenseItem
        .pending_amount ??
      0,
    );
  }

  get paidAfterReversal(): number {
    return Math.max(
      Number(
        (
          this.currentPaidAmount -
          this.appliedAmount
        ).toFixed(2),
      ),
      0,
    );
  }

  get pendingAfterReversal(): number {
    return Number(
      (
        this.currentPendingAmount +
        this.appliedAmount
      ).toFixed(2),
    );
  }

  // =========================================================
  // MÉTODO DEL PAGO
  // =========================================================

  get isCashPayment(): boolean {
    return (
      this.payment
        .payment_method ===
        'cash'
    );
  }

  get isBankPayment(): boolean {
    return (
      this.payment
        .payment_method ===
        'transfer'
    );
  }

  get paymentMethodLabel(): string {
    switch (
      this.payment
        .payment_method
    ) {
      case 'cash':
        return 'Efectivo';

      case 'transfer':
        return 'Transferencia';

      default:
        return (
          this.payment
            .payment_method ||
          'Sin método'
        );
    }
  }

  get paymentMethodIcon(): string {
    return this.isCashPayment
      ? 'payments'
      : 'account_balance';
  }

  // =========================================================
  // TEXTOS PARA MOSTRAR
  // =========================================================

  get paymentDateDisplay(): string {
    const date =
      String(
        this.payment
          .payment_date ??
        '',
      ).trim();

    const match =
      /^(\d{4})-(\d{2})-(\d{2})$/
        .exec(
          date,
        );

    if (!match) {
      return (
        date ||
        'Sin fecha'
      );
    }

    const [
      ,
      year,
      month,
      day,
    ] = match;

    return `${day}/${month}/${year}`;
  }

  get companyDisplay(): string {
    return (
      this.payment
        .company
        ?.name ||
      'Empresa no identificada'
    );
  }

  get referenceDisplay(): string {
    return (
      this.payment
        .reference ||
      this.payment
        .bank_movement
        ?.bank_reference ||
      'Sin referencia'
    );
  }

  get movementDisplay(): string {
    const movement =
      this.payment
        .bank_movement;

    if (!movement) {
      return 'Sin movimiento bancario';
    }

    return (
      movement
        .bank_reference ||
      `Movimiento #${movement.id}`
    );
  }

  get bankDisplay(): string {
    const movement =
      this.payment
        .bank_movement;

    if (!movement) {
      return 'Sin banco';
    }

    return (
      movement.bank
        ?.name ||
      'Sin banco'
    );
  }

  get accountDisplay(): string {
    const account =
      this.payment
        .bank_movement
        ?.bank_account;

    if (!account) {
      return 'Sin cuenta';
    }

    return (
      account.alias ||
      account.account_identifier ||
      'Sin cuenta'
    );
  }

  // =========================================================
  // VALIDACIÓN
  // =========================================================

  get canSave(): boolean {
    if (
      this.saving() ||
      this.form.invalid
    ) {
      return false;
    }

    if (
      !this.paymentId ||
      this.payment.status !==
        'active'
    ) {
      return false;
    }

    if (
      this.payment.origin !==
        'new'
    ) {
      return false;
    }

    if (
      this.paymentAmount <= 0 ||
      this.appliedAmount <= 0
    ) {
      return false;
    }

    return true;
  }

  // =========================================================
  // REVERSIÓN
  // =========================================================

  saveData(): void {
    if (
      !this.canSave
    ) {
      this.form
        .markAllAsTouched();

      return;
    }

    const reason =
      this.form.controls
        .reason
        .value
        .trim();

    if (
      reason.length < 5 ||
      reason.length > 500
    ) {
      this.form.controls
        .reason
        .markAsTouched();

      return;
    }

    const payload:
      entity.TreasuryReversePaymentPayload = {
      reason,
    };

    this.saving.set(
      true,
    );

    this.accountsPayableService
      .reversePayment(
        this.paymentId,
        payload,
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(() =>
          this.saving.set(
            false,
          ),
        ),
      )
      .subscribe({
        next: (
          response:
            entity.TreasuryReversePaymentResponse,
        ) => {
          if (
            !response.success
          ) {
            return;
          }

          /*
           * No se agrega diálogo de éxito.
           * El interceptor muestra el mensaje del backend.
           */
          this.dialogRef.close(
            response,
          );
        },

        error: (
          error:
            unknown,
        ) => {
          console.error(
            'Error al revertir el pago:',
            error,
          );

          this.showError(
            this.resolveErrorMessage(
              error,
            ),
          );
        },
      });
  }

  // =========================================================
  // FOOTER
  // =========================================================

  onBtnsSectionAction(
    action:
      ModuleFooterAction,
  ): void {
    switch (action) {
      case 'save':
        this.saveData();
        break;

      case 'cancel':
        this.closeModal();
        break;

      default:
        break;
    }
  }

  closeModal(): void {
    if (
      this.saving()
    ) {
      return;
    }

    this.dialogRef.close(
      null,
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  private showError(
    message: string,
  ): void {
    this.dialogService
      .confirm({
        title:
          'No se pudo revertir el pago',

        message,

        confirmText:
          'Aceptar',

        cancelText:
          '',
      })
      .subscribe();
  }

  private resolveErrorMessage(
    error: unknown,
  ): string {
    const httpError =
      error as {
        error?: {
          message?:
            | string
            | string[];
        };

        message?: string;
      };

    const backendMessage =
      httpError
        ?.error
        ?.message;

    if (
      Array.isArray(
        backendMessage,
      )
    ) {
      return backendMessage.join(
        ' ',
      );
    }

    if (
      typeof backendMessage ===
        'string' &&
      backendMessage.trim()
    ) {
      return backendMessage;
    }

    if (
      typeof httpError
        ?.message ===
        'string' &&
      httpError
        .message
        .trim()
    ) {
      return httpError.message;
    }

    return 'No se pudo revertir el pago. Verifica que siga activo y que no haya sido revertido anteriormente.';
  }
}