import {
  CommonModule,
} from '@angular/common';

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
} from '../../../../../../shared/ui/btns-section/btns-section';

import {
  InputField,
} from '../../../../../../shared/ui/input-field/input-field';


// =========================================================
// HELPERS / SERVICIOS
// =========================================================

import {
  roundMoney,
} from '../../../../../../shared/helpers/general-helpers';

import {
  DialogService,
} from '../../../../../../shared/services/dialog.service';


// =========================================================
// MÓDULO
// =========================================================

import * as entity
  from '../../interfaces/treasury-accounts-receivable.interfaces';

import {
  TreasuryAccountsReceivableService,
} from '../../services/treasury-accounts-receivable.service';


// =========================================================
// CONFIGURACIÓN
// =========================================================

const HEADER_CONFIG:
  ModuleHeaderConfig = {
    modal: true,
  };


@Component({
  selector:
    'app-modal-treasury-accounts-receivable',

  standalone:
    true,

  imports: [
    CommonModule,
    ReactiveFormsModule,

    ModuleHeader,
    BtnsSection,
    InputField,
  ],

  templateUrl:
    './modal-treasury-accounts-receivable.html',

  styleUrl:
    './modal-treasury-accounts-receivable.scss',
})
export class ModalTreasuryAccountsReceivable {

  // =======================================================
  // INYECCIONES
  // =======================================================

  readonly data =
    inject<
      entity.TreasuryApplyCollectionModalData
    >(
      MAT_DIALOG_DATA,
    );


  private readonly fb =
    inject(
      FormBuilder,
    );


  private readonly dialogRef =
    inject(
      MatDialogRef<
        ModalTreasuryAccountsReceivable,
        boolean
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


  // =======================================================
  // UI
  // =======================================================

  readonly headerConfig =
    HEADER_CONFIG;


  saving =
    false;


  // =======================================================
  // FORMULARIO
  // =======================================================

  readonly form =
    this.fb.group({

      notes:
        this.fb.control<
          string | null
        >(
          null,
          {
            validators: [
              Validators.maxLength(
                1000,
              ),
            ],
          },
        ),
    });


  readonly applicationAmountControls =
    new Map<
      number,
      FormControl<number | null>
    >();


  constructor() {

    this
      .initializeApplicationAmountControls();
  }


  // =======================================================
  // MOVIMIENTO
  // =======================================================

  get movement():
    entity.TreasuryAvailableInflow {

    return this.data.movement;
  }


  get accountDisplay():
    string {

    return (
      this.movement
        .bank_account
        ?.alias ||

      this.movement
        .bank_account
        ?.account_identifier ||

      'Sin cuenta'
    );
  }


  // =======================================================
  // RESUMEN
  // =======================================================

  get applicationsCount():
    number {

    return (
      this.data
        .applications
        .length
    );
  }


  get totalToApply():
    number {

    const total =
      this.data
        .applications
        .reduce(
          (
            accumulator,
            application,
          ) => {

            const control =
              this
                .getApplicationAmountControl(
                  application,
                );

            return (
              accumulator +
              Number(
                control.value ||
                0,
              )
            );
          },
          0,
        );

    return roundMoney(
      total,
    );
  }


  get movementAvailableAmount():
    number {

    return roundMoney(
      Number(
        this.movement
          .available_amount ||
        0,
      ),
    );
  }


  get remainingMovementAmount():
    number {

    return roundMoney(
      Math.max(
        this.movementAvailableAmount -
        this.totalToApply,
        0,
      ),
    );
  }


  get movementExceededAmount():
    number {

    return roundMoney(
      Math.max(
        this.totalToApply -
        this.movementAvailableAmount,
        0,
      ),
    );
  }


  // =======================================================
  // VALIDACIÓN GENERAL
  // =======================================================

  get canApplyCollection():
    boolean {

    if (
      this.saving ||
      !this.movement?.id ||
      this.applicationsCount ===
      0
    ) {

      return false;
    }


    if (
      this.totalToApply <=
      0 ||
      this.movementExceededAmount >
      0
    ) {

      return false;
    }


    return (
      this.data
        .applications
        .every(
          (
            application,
          ) => {

            const control =
              this
                .getApplicationAmountControl(
                  application,
                );


            const amount =
              Number(
                control.value,
              );


            const pendingAmount =
              roundMoney(
                Number(
                  application
                    .receivable
                    .pending_amount ||
                  0,
                ),
              );


            return (
              control.valid &&
              Number.isFinite(
                amount,
              ) &&
              amount > 0 &&
              amount <=
              pendingAmount
            );
          },
        )
    );
  }


  // =======================================================
  // CONTROLES DE IMPORTE
  // =======================================================

  getApplicationAmountControl(
    application:
      entity.TreasuryApplyCollectionModalApplication,
  ):
    FormControl<number | null> {

    const receivableId =
      Number(
        application
          .receivable
          .id,
      );


    const control =
      this
        .applicationAmountControls
        .get(
          receivableId,
        );


    if (
      control
    ) {

      return control;
    }


    const pendingAmount =
      roundMoney(
        Number(
          application
            .receivable
            .pending_amount ||
          0,
        ),
      );


    const fallbackControl =
      this
        .createApplicationAmountControl(
          application,
          pendingAmount,
        );


    this
      .applicationAmountControls
      .set(
        receivableId,
        fallbackControl,
      );


    return fallbackControl;
  }


  normalizeApplicationAmount(
    application:
      entity.TreasuryApplyCollectionModalApplication,
  ):
    void {

    const control =
      this
        .getApplicationAmountControl(
          application,
        );


    control.markAsTouched();


    if (
      control.value ===
      null ||
      control.value ===
      undefined
    ) {

      return;
    }


    const amount =
      Number(
        control.value,
      );


    if (
      !Number.isFinite(
        amount,
      )
    ) {

      return;
    }


    control.setValue(
      roundMoney(
        amount,
      ),
      {
        emitEvent:
          false,
      },
    );


    control
      .updateValueAndValidity({
        emitEvent:
          false,
      });
  }


  selectAmountInput(
    event:
      FocusEvent,
  ):
    void {

    const input =
      event.target as
        | HTMLInputElement
        | null;


    input?.select();
  }


  // =======================================================
  // ERRORES DE IMPORTE
  // =======================================================

  hasApplicationAmountError(
    application:
      entity.TreasuryApplyCollectionModalApplication,
  ):
    boolean {

    const control =
      this
        .getApplicationAmountControl(
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
      entity.TreasuryApplyCollectionModalApplication,
  ):
    string | null {

    const control =
      this
        .getApplicationAmountControl(
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
      control.hasError(
        'required',
      )
    ) {

      return (
        'Ingresa el importe que deseas aplicar.'
      );
    }


    if (
      control.hasError(
        'min',
      )
    ) {

      return (
        'El importe debe ser mayor a cero.'
      );
    }


    if (
      control.hasError(
        'max',
      )
    ) {

      return (
        'El importe no puede superar el saldo pendiente.'
      );
    }


    return (
      'El importe ingresado no es válido.'
    );
  }


  // =======================================================
  // SALDO POSTERIOR DE CADA CxC
  // =======================================================

  getPendingAfter(
    application:
      entity.TreasuryApplyCollectionModalApplication,
  ):
    number {

    const control =
      this
        .getApplicationAmountControl(
          application,
        );


    const pendingAmount =
      roundMoney(
        Number(
          application
            .receivable
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


  // =======================================================
  // ACCIONES
  // =======================================================

  onBtnsSectionAction(
    action:
      string,
  ):
    void {

    switch (
      action
    ) {

      case 'save':

        this
          .applyCollection();

        break;


      case 'cancel':

        this
          .closeModal();

        break;
    }
  }


  // =======================================================
  // APLICAR COBRO
  // =======================================================

  applyCollection():
    void {

    if (
      !this.canApplyCollection
    ) {

      this
        .markApplicationAmountControlsAsTouched();

      return;
    }


    const notes =
      this.form
        .controls
        .notes
        .value
        ?.trim() ||
      null;


    const payload = {

      bank_movement_id:
        String(
          this.movement.id,
        ),


      applications:
        this.data
          .applications
          .map(
            (
              application,
            ) => {

              const control =
                this
                  .getApplicationAmountControl(
                    application,
                  );


              return {

                account_receivable_id:
                  Number(
                    application
                      .receivable
                      .id,
                  ),


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


    this.saving =
      true;


    this
      .setFormsDisabled(
        true,
      );


    this
      .accountsReceivableService
      .applyBankMovement(
        payload,
      )
      .pipe(
        finalize(
          () => {

            this.saving =
              false;


            this
              .setFormsDisabled(
                false,
              );
          },
        ),
      )
      .subscribe({

        next:
          (
            response,
          ) => {

            if (
              !response
                ?.success
            ) {

              return;
            }


            this
              .dialogRef
              .close(
                true,
              );
          },


        error:
          (
            error:
              unknown,
          ) => {

            console.error(
              'Error al aplicar el cobro bancario:',
              error,
            );


            this
              .dialogService
              .confirm({

                title:
                  'No se pudo aplicar el cobro',


                message:
                  this
                    .getErrorMessage(
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


  closeModal():
    void {

    if (
      this.saving
    ) {

      return;
    }


    this
      .dialogRef
      .close(
        false,
      );
  }


  // =======================================================
  // INICIALIZACIÓN
  // =======================================================

  private initializeApplicationAmountControls():
    void {

    this.data
      .applications
      .forEach(
        (
          application,
        ) => {

          const receivableId =
            Number(
              application
                .receivable
                .id,
            );


          const pendingAmount =
            roundMoney(
              Number(
                application
                  .receivable
                  .pending_amount ||
                0,
              ),
            );


          this
            .applicationAmountControls
            .set(
              receivableId,

              this
                .createApplicationAmountControl(
                  application,
                  pendingAmount,
                ),
            );
        },
      );
  }


  private createApplicationAmountControl(
    application:
      entity.TreasuryApplyCollectionModalApplication,

    pendingAmount:
      number,
  ):
    FormControl<number | null> {

    const originalAmount =
      Number(
        application.amount,
      );


    const initialAmount =
      Number.isFinite(
        originalAmount,
      ) &&
      originalAmount >
      0

        ? roundMoney(
            Math.min(
              originalAmount,
              pendingAmount,
            ),
          )

        : pendingAmount;


    return (
      this.fb
        .control<
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
        )
    );
  }


  // =======================================================
  // ESTADO FORMULARIOS
  // =======================================================

  private markApplicationAmountControlsAsTouched():
    void {

    this
      .applicationAmountControls
      .forEach(
        (
          control,
        ) => {

          control
            .markAsTouched();


          control
            .updateValueAndValidity();
        },
      );
  }


  private setFormsDisabled(
    disabled:
      boolean,
  ):
    void {

    if (
      disabled
    ) {

      this
        .form
        .disable({
          emitEvent:
            false,
        });


      this
        .applicationAmountControls
        .forEach(
          (
            control,
          ) =>
            control.disable({
              emitEvent:
                false,
            }),
        );


      return;
    }


    this
      .form
      .enable({
        emitEvent:
          false,
      });


    this
      .applicationAmountControls
      .forEach(
        (
          control,
        ) =>
          control.enable({
            emitEvent:
              false,
          }),
      );
  }


  // =======================================================
  // ERRORES BACKEND
  // =======================================================

  private getErrorMessage(
    error:
      unknown,
  ):
    string {

    const candidate =
      error as {

        error?: {
          message?:
            | string
            | string[];
        };

        message?:
          string;
      };


    const backendMessage =
      candidate
        ?.error
        ?.message;


    if (
      Array.isArray(
        backendMessage,
      )
    ) {

      return (
        backendMessage
          .filter(
            (
              item,
            ) =>
              !!item,
          )
          .join(
            '\n',
          ) ||

        'No fue posible aplicar el cobro.'
      );
    }


    if (
      typeof backendMessage ===
      'string' &&
      backendMessage
        .trim()
    ) {

      return backendMessage;
    }


    if (
      typeof candidate
        ?.message ===
      'string' &&
      candidate
        .message
        .trim()
    ) {

      return candidate
        .message;
    }


    return (
      'No fue posible aplicar el cobro.'
    );
  }
}