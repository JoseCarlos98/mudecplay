import { CommonModule } from '@angular/common';

import {
  Component,
  inject,
} from '@angular/core';

import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';

import {
  finalize,
} from 'rxjs';

// UI compartida
import {
  ModuleHeader,
} from '../../../../../../shared/ui/module-header/module-header';

import {
  ModuleHeaderConfig,
} from '../../../../../../shared/ui/module-header/interfaces/module-header-interface';

import {
  BtnsSection,
} from '../../../../../../shared/ui/btns-section/btns-section';

import {
  InputField,
} from '../../../../../../shared/ui/input-field/input-field';

// Helpers
import {
  roundMoney,
} from '../../../../../../shared/helpers/general-helpers';

// Servicios compartidos
import {
  DialogService,
} from '../../../../../../shared/services/dialog.service';

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
  selector: 'app-modal-treasury-accounts-payable',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    ModuleHeader,
    BtnsSection,
    InputField,
  ],
  templateUrl:
    './modal-treasury-accounts-payable.html',
  styleUrl:
    './modal-treasury-accounts-payable.scss',
})
export class ModalTreasuryAccountsPayable {
  // =========================================================
  // INYECCIONES
  // =========================================================

  readonly data =
    inject<entity.TreasuryApplyBankMovementModalData>(
      MAT_DIALOG_DATA,
    );

  private readonly fb =
    inject(FormBuilder);

  private readonly dialogRef =
    inject(
      MatDialogRef<
        ModalTreasuryAccountsPayable,
        entity.TreasuryApplyBankMovementResponse | null
      >,
    );

  private readonly accountsPayableService =
    inject(TreasuryAccountsPayableService);

  private readonly dialogService =
    inject(DialogService);

  // =========================================================
  // UI
  // =========================================================

  readonly headerConfig =
    HEADER_CONFIG;

  saving = false;

  // =========================================================
  // FORMULARIO
  // =========================================================

  readonly form =
    this.fb.group({
      notes:
        this.fb.control<string | null>(
          null,
        ),
    });

  /**
   * Cada concepto tiene su propio control editable.
   *
   * No se incluye dentro del formulario de notas porque
   * la cantidad de conceptos es dinámica.
   */
  readonly applicationAmountControls =
    new Map<
      number,
      FormControl<number | null>
    >();

  constructor() {
    this.initializeApplicationAmountControls();
  }

  // =========================================================
  // INFORMACIÓN DEL MOVIMIENTO
  // =========================================================

  get movement():
    entity.TreasuryAvailableOutflowTableRow {
    return this.data.movement;
  }

  get accountDisplay(): string {
    return (
      this.movement.bank_account_display ||
      this.movement.bank_account?.alias ||
      this.movement.bank_account
        ?.account_identifier ||
      'Sin cuenta'
    );
  }

  get applicationsCount(): number {
    return this.data.applications.length;
  }

  get totalToApply(): number {
    const total =
      this.data.applications.reduce(
        (
          accumulator,
          application,
        ) => {
          const control =
            this.getApplicationAmountControl(
              application,
            );

          return (
            accumulator +
            Number(
              control.value || 0,
            )
          );
        },
        0,
      );

    return roundMoney(total);
  }

  get movementAvailableAmount(): number {
    return roundMoney(
      Number(
        this.movement.available_amount ||
        0,
      ),
    );
  }

  get remainingMovementAmount(): number {
    return roundMoney(
      Math.max(
        this.movementAvailableAmount -
          this.totalToApply,
        0,
      ),
    );
  }

  get movementExceededAmount(): number {
    return roundMoney(
      Math.max(
        this.totalToApply -
          this.movementAvailableAmount,
        0,
      ),
    );
  }

  get canApplyPayment(): boolean {
    if (
      this.saving ||
      !this.movement?.id ||
      this.applicationsCount === 0
    ) {
      return false;
    }

    if (
      this.totalToApply <= 0 ||
      this.movementExceededAmount > 0
    ) {
      return false;
    }

    return this.data.applications.every(
      (application) => {
        const control =
          this.getApplicationAmountControl(
            application,
          );

        const amount =
          Number(
            control.value,
          );

        const pendingAmount =
          roundMoney(
            Number(
              application.item
                .pending_amount ||
              0,
            ),
          );

        return (
          control.valid &&
          Number.isFinite(amount) &&
          amount > 0 &&
          amount <= pendingAmount
        );
      },
    );
  }

  // =========================================================
  // CONTROLES DE IMPORTE
  // =========================================================

  getApplicationAmountControl(
    application:
      entity.TreasuryApplyBankMovementModalApplication,
  ): FormControl<number | null> {
    const expenseItemId =
      Number(
        application.item
          .expense_item_id,
      );

    const control =
      this.applicationAmountControls.get(
        expenseItemId,
      );

    if (control) {
      return control;
    }

    /*
     * Respaldo defensivo.
     * Normalmente todos los controles se crean
     * en el constructor.
     */
    const pendingAmount =
      roundMoney(
        Number(
          application.item
            .pending_amount ||
          0,
        ),
      );

    const fallbackControl =
      this.createApplicationAmountControl(
        application,
        pendingAmount,
      );

    this.applicationAmountControls.set(
      expenseItemId,
      fallbackControl,
    );

    return fallbackControl;
  }

  normalizeApplicationAmount(
    application:
      entity.TreasuryApplyBankMovementModalApplication,
  ): void {
    const control =
      this.getApplicationAmountControl(
        application,
      );

    control.markAsTouched();

    if (
      control.value === null ||
      control.value === undefined
    ) {
      return;
    }

    const amount =
      Number(
        control.value,
      );

    if (!Number.isFinite(amount)) {
      return;
    }

    control.setValue(
      roundMoney(amount),
      {
        emitEvent: false,
      },
    );

    control.updateValueAndValidity({
      emitEvent: false,
    });
  }

  selectAmountInput(
    event: FocusEvent,
  ): void {
    const input =
      event.target as
        | HTMLInputElement
        | null;

    input?.select();
  }

  hasApplicationAmountError(
    application:
      entity.TreasuryApplyBankMovementModalApplication,
  ): boolean {
    const control =
      this.getApplicationAmountControl(
        application,
      );

    return (
      control.invalid &&
      (
        control.dirty ||
        control.touched
      )
    );
  }

  getApplicationAmountError(
    application:
      entity.TreasuryApplyBankMovementModalApplication,
  ): string | null {
    const control =
      this.getApplicationAmountControl(
        application,
      );

    if (
      !control.invalid ||
      (
        !control.dirty &&
        !control.touched
      )
    ) {
      return null;
    }

    if (
      control.hasError('required')
    ) {
      return 'Ingresa el importe que deseas aplicar.';
    }

    if (
      control.hasError('min')
    ) {
      return 'El importe debe ser mayor a cero.';
    }

    if (
      control.hasError('max')
    ) {
      return 'El importe no puede superar el saldo pendiente.';
    }

    return 'El importe ingresado no es válido.';
  }

  getPendingAfter(
    application:
      entity.TreasuryApplyBankMovementModalApplication,
  ): number {
    const control =
      this.getApplicationAmountControl(
        application,
      );

    const pendingAmount =
      roundMoney(
        Number(
          application.item
            .pending_amount ||
          0,
        ),
      );

    const amount =
      roundMoney(
        Number(
          control.value ||
          0,
        ),
      );

    return roundMoney(
      Math.max(
        pendingAmount -
          amount,
        0,
      ),
    );
  }

  // =========================================================
  // ACCIONES
  // =========================================================

  onBtnsSectionAction(
    action: string,
  ): void {
    switch (action) {
      case 'save':
        this.applyPayment();
        break;

      case 'cancel':
        this.closeModal();
        break;
    }
  }

  applyPayment(): void {
    if (!this.canApplyPayment) {
      this.markApplicationAmountControlsAsTouched();
      return;
    }

    const notes =
      this.form.controls.notes.value
        ?.trim() ||
      null;

    const payload:
      entity.TreasuryApplyBankMovementPayload = {
      bank_movement_id:
        String(
          this.movement.id,
        ),

      applications:
        this.data.applications.map(
          (application) => {
            const control =
              this.getApplicationAmountControl(
                application,
              );

            return {
              expense_item_id:
                application.item
                  .expense_item_id,

              amount:
                roundMoney(
                  Number(
                    control.value ||
                    0,
                  ),
                ),
            };
          },
        ),

      notes,
    };

    this.saving = true;
    this.setFormsDisabled(true);

    this.accountsPayableService
      .applyBankMovement(payload)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.setFormsDisabled(false);
        }),
      )
      .subscribe({
        next: (
          response:
            entity.TreasuryApplyBankMovementResponse,
        ) => {
          if (!response.success) {
            return;
          }

          /*
           * Cierra el modal y entrega el resultado
           * al componente principal.
           */
          this.dialogRef.close(
            response,
          );
        },

        error: (
          error: unknown,
        ) => {
          console.error(
            'Error al aplicar el movimiento bancario:',
            error,
          );

          this.dialogService
            .confirm({
              title:
                'No se pudo aplicar el pago',

              message:
                this.getErrorMessage(
                  error,
                ),

              confirmText:
                'Aceptar',

              cancelText:
                '',
            })
            .subscribe();
        },
      });
  }

  closeModal(): void {
    if (this.saving) {
      return;
    }

    this.dialogRef.close(
      null,
    );
  }

  // =========================================================
  // INICIALIZACIÓN
  // =========================================================

  private initializeApplicationAmountControls(): void {
    this.data.applications.forEach(
      (application) => {
        const expenseItemId =
          Number(
            application.item
              .expense_item_id,
          );

        const pendingAmount =
          roundMoney(
            Number(
              application.item
                .pending_amount ||
              0,
            ),
          );

        this.applicationAmountControls.set(
          expenseItemId,
          this.createApplicationAmountControl(
            application,
            pendingAmount,
          ),
        );
      },
    );
  }

  private createApplicationAmountControl(
    application:
      entity.TreasuryApplyBankMovementModalApplication,

    pendingAmount: number,
  ): FormControl<number | null> {
    const originalAmount =
      Number(
        application.amount,
      );

    const initialAmount =
      Number.isFinite(
        originalAmount,
      ) &&
      originalAmount > 0
        ? roundMoney(
            Math.min(
              originalAmount,
              pendingAmount,
            ),
          )
        : pendingAmount;

    return this.fb.control<
      number | null
    >(
      initialAmount,
      {
        validators: [
          Validators.required,
          Validators.min(
            0.01,
          ),
          Validators.max(
            pendingAmount,
          ),
        ],
      },
    );
  }

  // =========================================================
  // HELPERS
  // =========================================================

  private markApplicationAmountControlsAsTouched(): void {
    this.applicationAmountControls
      .forEach(
        (control) => {
          control.markAsTouched();
          control.updateValueAndValidity();
        },
      );
  }

  private setFormsDisabled(
    disabled: boolean,
  ): void {
    if (disabled) {
      this.form.disable({
        emitEvent: false,
      });

      this.applicationAmountControls
        .forEach(
          (control) =>
            control.disable({
              emitEvent: false,
            }),
        );

      return;
    }

    this.form.enable({
      emitEvent: false,
    });

    this.applicationAmountControls
      .forEach(
        (control) =>
          control.enable({
            emitEvent: false,
          }),
      );
  }

  private getErrorMessage(
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
      httpError?.error?.message;

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
      typeof httpError?.message ===
        'string' &&
      httpError.message.trim()
    ) {
      return httpError.message;
    }

    return 'No se pudo aplicar el movimiento bancario. Revisa que el movimiento y los conceptos todavía tengan saldo disponible.';
  }
}