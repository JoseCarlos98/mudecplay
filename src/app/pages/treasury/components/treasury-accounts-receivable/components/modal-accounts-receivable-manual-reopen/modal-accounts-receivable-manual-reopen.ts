import {
  CommonModule,
} from '@angular/common';

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
// UI
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

import {
  DialogService,
} from '../../../../../../shared/services/dialog.service';


// =========================================================
// CxC
// =========================================================

import * as entity
  from '../../interfaces/treasury-accounts-receivable.interfaces';

import {
  TreasuryAccountsReceivableService,
} from '../../services/treasury-accounts-receivable.service';


// =========================================================
// CONFIG
// =========================================================

const HEADER_CONFIG:
  ModuleHeaderConfig = {
  modal: true,
};


@Component({
  selector:
    'app-modal-accounts-receivable-manual-reopen',

  standalone:
    true,

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
    './modal-accounts-receivable-manual-reopen.html',

  styleUrl:
    './modal-accounts-receivable-manual-reopen.scss',
})
export class ModalAccountsReceivableManualReopen {

  // =========================================================
  // INYECCIONES
  // =========================================================

  readonly data =
    inject<
      entity.TreasuryReceivableManualReopenModalData
    >(
      MAT_DIALOG_DATA,
    );


  private readonly dialogRef =
    inject(
      MatDialogRef<
        ModalAccountsReceivableManualReopen
      >,
    );


  private readonly accountsReceivableService =
    inject(
      TreasuryAccountsReceivableService,
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
    signal(
      false,
    );


  // =========================================================
  // FORM
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
  // MOVIMIENTO
  // =========================================================

  get movement():
    entity.TreasuryReceivableBankMovementHistoryMovement {

    return this.data.movement;
  }


  get originalAmount():
    number {

    return Number(
      this.movement.amount ??
      0,
    );
  }


  get appliedAmount():
    number {

    return Number(
      this.movement.applied_amount ??
      0,
    );
  }


  get availableAmount():
    number {

    return Number(
      this.movement.available_amount ??
      0,
    );
  }


  get manualClosedAmount():
    number {

    return Number(
      this.movement.manual_closed_amount ??
      0,
    );
  }


  get availableAfterReopen():
    number {

    return Number(
      (
        this.availableAmount +
        this.manualClosedAmount
      ).toFixed(
        2,
      ),
    );
  }


  get referenceDisplay():
    string {

    return (
      this.movement.bank_reference
        ?.trim() ||

      this.movement.receipt_number
        ?.trim() ||

      this.movement.tracking_key
        ?.trim() ||

      `Movimiento ${this.movement.id}`
    );
  }


  get accountDisplay():
    string {

    const alias =
      this.movement
        .bank_account
        ?.alias
        ?.trim();


    const identifier =
      this.movement
        .bank_account
        ?.account_identifier
        ?.trim();


    if (
      alias &&
      identifier
    ) {

      return (
        `${alias} · ${identifier}`
      );
    }


    return (
      alias ||
      identifier ||
      'Sin cuenta'
    );
  }


  get canSave():
    boolean {

    return (
      !this.saving() &&

      this.form.valid &&

      Boolean(
        this.movement?.id,
      ) &&

      this.manualClosedAmount > 0 &&

      this.movement.status ===
        'manually_closed'
    );
  }


  // =========================================================
  // GUARDAR
  // =========================================================

  saveData():
    void {

    if (
      this.saving() ||
      !this.canSave
    ) {

      this.form
        .markAllAsTouched();

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

      this.form
        .markAllAsTouched();

      return;
    }


    const payload:
      entity.TreasuryReceivableManualReopenPayload = {

      reason,
    };


    this.saving.set(
      true,
    );


    this.accountsReceivableService
      .manualReopenBankMovement(
        this.movement.id,
        payload,
      )
      .pipe(

        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(
          () => {

            this.saving.set(
              false,
            );
          },
        ),
      )
      .subscribe({

        next: (
          response:
            entity.TreasuryReceivableMovementMutationResponse,
        ) => {

          if (
            !response?.success
          ) {

            return;
          }


          this.dialogRef.close(
            response,
          );
        },


        error: (
          error:
            unknown,
        ) => {

          console.error(
            'Error al reabrir el movimiento bancario:',
            error,
          );


          this.dialogService
            .confirm({

              title:
                'No se pudo reabrir el movimiento',

              message:
                this.resolveErrorMessage(
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


  // =========================================================
  // FOOTER
  // =========================================================

  onBtnsSectionAction(
    action:
      ModuleFooterAction,
  ): void {

    if (
      action ===
      'cancel'
    ) {

      this.closeModal();
    }
  }


  closeModal():
    void {

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
  // HELPERS
  // =========================================================

  formatDate(
    value:
      | string
      | null
      | undefined,
  ): string {

    if (
      !value
    ) {

      return '-';
    }


    const date =
      String(
        value,
      ).slice(
        0,
        10,
      );


    const parts =
      date.split(
        '-',
      );


    if (
      parts.length !== 3
    ) {

      return date;
    }


    const [
      year,
      month,
      day,
    ] = parts;


    return (
      `${day}/${month}/${year}`
    );
  }


  private resolveErrorMessage(
    error:
      unknown,
  ): string {

    const backendMessage =
      (
        error as {
          error?: {
            message?:
              | string
              | string[];
          };
        }
      )
        ?.error
        ?.message;


    if (
      Array.isArray(
        backendMessage,
      )
    ) {

      return backendMessage
        .join(
          '\n',
        );
    }


    if (
      typeof backendMessage ===
        'string' &&
      backendMessage.trim()
    ) {

      return backendMessage.trim();
    }


    return (
      'No fue posible reabrir el saldo del movimiento bancario.'
    );
  }
}