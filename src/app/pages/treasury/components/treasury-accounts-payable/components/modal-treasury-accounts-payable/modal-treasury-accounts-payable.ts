import { CommonModule } from '@angular/common';

import {
  Component,
  inject,
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';

import {
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';

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
} from '../../../../../../shared/ui/btns-section/btns-section';

import {
  InputField,
} from '../../../../../../shared/ui/input-field/input-field';

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
  templateUrl: './modal-treasury-accounts-payable.html',
  styleUrl: './modal-treasury-accounts-payable.scss',
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
    return this.roundMoney(
      this.data.applications.reduce(
        (
          total,
          application,
        ) =>
          total +
          Number(
            application.amount || 0,
          ),
        0,
      ),
    );
  }

  get remainingMovementAmount(): number {
    return this.roundMoney(
      Math.max(
        Number(
          this.movement.available_amount ||
          0,
        ) -
        this.totalToApply,
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

    if (this.totalToApply <= 0) {
      return false;
    }

    if (
      this.totalToApply >
      Number(
        this.movement.available_amount,
      )
    ) {
      return false;
    }

    return this.data.applications.every(
      (application) => {
        const amount =
          Number(application.amount);

        const pendingAmount =
          Number(
            application.item
              .pending_amount,
          );

        return (
          Number.isFinite(amount) &&
          amount > 0 &&
          amount <= pendingAmount
        );
      },
    );
  }

  getPendingAfter(
    application:
      entity.TreasuryApplyBankMovementModalApplication,
  ): number {
    return this.roundMoney(
      Math.max(
        Number(
          application.item
            .pending_amount,
        ) -
        Number(
          application.amount,
        ),
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
      return;
    }

    const notes =
      this.form.controls.notes.value
        ?.trim() ||
      null;

    const payload:
      entity.TreasuryApplyBankMovementPayload = {
      bank_movement_id:
        String(this.movement.id),

      applications:
        this.data.applications.map(
          (application) => ({
            expense_item_id:
              application.item
                .expense_item_id,

            amount:
              this.roundMoney(
                application.amount,
              ),
          }),
        ),

      notes,
    };

    this.saving = true;

    this.accountsPayableService
      .applyBankMovement(payload)
      .pipe(
        finalize(() => {
          this.saving = false;
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
          this.dialogRef.close(response);
        },

        error: (error: unknown) => {
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

    this.dialogRef.close(null);
  }

  // =========================================================
  // HELPERS
  // =========================================================

  private roundMoney(
    value: number,
  ): number {
    return Math.round(
      (
        Number(value || 0) +
        Number.EPSILON
      ) *
      100,
    ) / 100;
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