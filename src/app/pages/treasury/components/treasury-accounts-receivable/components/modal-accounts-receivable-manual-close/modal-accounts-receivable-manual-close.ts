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

import * as entity
  from '../../interfaces/treasury-accounts-receivable.interfaces';

import {
  TreasuryAccountsReceivableService,
} from '../../services/treasury-accounts-receivable.service';


// =========================================================
// CONFIGURACIÓN
// =========================================================

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};


@Component({
  selector:
    'app-modal-accounts-receivable-manual-close',

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
    './modal-accounts-receivable-manual-close.html',

  styleUrl:
    './modal-accounts-receivable-manual-close.scss',
})
export class ModalAccountsReceivableManualClose {

  // =========================================================
  // INYECCIONES
  // =========================================================

  readonly data =
    inject<
      entity.TreasuryReceivableManualCloseModalData
    >(MAT_DIALOG_DATA);


  private readonly dialogRef =
    inject(
      MatDialogRef<
        ModalAccountsReceivableManualClose
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
  // MOVIMIENTO
  // =========================================================

  get movement():
    entity.TreasuryAvailableInflow {

    return this.data.movement;
  }


  get originalAmount():
    number {

    return Number(
      this.movement.amount ?? 0,
    );
  }


  get appliedAmount():
    number {

    return Number(
      this.movement.applied_amount ?? 0,
    );
  }


  get availableAmount():
    number {

    return Number(
      this.movement.available_amount ?? 0,
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
      this.movement.bank_account
        ?.alias
        ?.trim();

    const identifier =
      this.movement.bank_account
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
      this.availableAmount > 0
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
      entity.TreasuryReceivableManualClosePayload = {

      reason,

    };


    this.saving.set(
      true,
    );


    this.accountsReceivableService
      .manualCloseBankMovement(
        this.movement.id,
        payload,
      )
      .pipe(

        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(
          () =>
            this.saving.set(
              false,
            ),
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
            'Error cerrando residual del movimiento:',
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

    switch (
      action
    ) {

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


  private showError(
    message:
      string,
  ): void {

    this.dialogService
      .confirm({
        title:
          'No se pudo cerrar el movimiento',

        message,

        confirmText:
          'Aceptar',

        cancelText:
          '',
      })
      .subscribe();
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

      return backendMessage.join(
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
      'No fue posible cerrar el saldo disponible del movimiento bancario.'
    );
  }

}