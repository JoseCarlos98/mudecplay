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


// =========================================================
// MÓDULO
// =========================================================

import * as entity
  from '../../interfaces/treasury-accounts-receivable.interfaces';

import {
  TreasuryAccountsReceivableService,
} from '../../services/treasury-accounts-receivable.service';


// =========================================================
// DATA LOCAL DEL MODAL
// =========================================================

export interface ReverseCollectionDialogData {

  receivable:
    entity.TreasuryReceivableHistoryReceivable;

  item:
    entity.TreasuryReceivableHistoryApplication;
}


const HEADER_CONFIG:
  ModuleHeaderConfig = {
    modal: true,
  };


@Component({
  selector:
    'app-modal-reverse-collection',

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
    './modal-reverse-collection.html',

  styleUrl:
    './modal-reverse-collection.scss',
})
export class ModalReverseCollection {

  // =======================================================
  // INYECCIONES
  // =======================================================

  readonly data =
    inject<ReverseCollectionDialogData>(
      MAT_DIALOG_DATA,
    );


  private readonly dialogRef =
    inject(
      MatDialogRef<
        ModalReverseCollection,
        | entity.TreasuryReverseCollectionResponse
        | null
      >,
    );


  private readonly accountsReceivableService =
    inject(
      TreasuryAccountsReceivableService,
    );


  private readonly fb =
    inject(
      FormBuilder,
    );


  private readonly destroyRef =
    inject(
      DestroyRef,
    );


  // =======================================================
  // UI
  // =======================================================

  readonly headerConfig =
    HEADER_CONFIG;


  readonly saving =
    signal(
      false,
    );


  // =======================================================
  // FORM
  // =======================================================

  readonly form =
    this.fb.group({

      reason:
        this.fb.control<string>(
          '',
          {
            nonNullable:
              true,

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


  // =======================================================
  // DATA
  // =======================================================

  get item():
    entity.TreasuryReceivableHistoryApplication {

    return this.data.item;
  }


  get collection():
    entity.TreasuryReceivableHistoryCollection {

    return this.item.collection;
  }


  get movement():
    entity.TreasuryReceivableHistoryBankMovement {

    return this.item.bank_movement;
  }


  get receivable():
    entity.TreasuryReceivableHistoryReceivable {

    return this.data.receivable;
  }


  get collectionAmount():
    number {

    return Number(
      this.collection.amount ??
      0,
    );
  }


  get appliedAmount():
    number {

    return Number(
      this.item.applied_amount ??
      0,
    );
  }


  get invoiceDisplay():
    string {

    return this.receivable.series
      ? `${this.receivable.series}-${this.receivable.folio}`
      : this.receivable.folio;
  }


  get companyDisplay():
    string {

    return (
      this.movement.company?.name ||
      'Empresa no identificada'
    );
  }


  get referenceDisplay():
    string {

    return (
      this.movement.bank_reference ||
      'Sin referencia'
    );
  }


  get movementDisplay():
    string {

    return (
      `Movimiento ${this.movement.id} · ` +
      this.referenceDisplay
    );
  }


  get bankDisplay():
    string {

    return (
      this.movement.bank?.name ||
      'Sin banco'
    );
  }


  get accountDisplay():
    string {

    const account =
      this.movement.bank_account;


    if (!account) {

      return 'Sin cuenta';
    }


    const alias =
      account.alias?.trim();


    const identifier =
      account.account_identifier?.trim();


    if (
      alias &&
      identifier
    ) {

      return `${alias} · ${identifier}`;
    }


    return (
      alias ||
      identifier ||
      'Sin cuenta'
    );
  }


  get clientDisplay():
    string {

    return (
      this.receivable.receiver_name ||
      'Sin cliente'
    );
  }


  get projectDisplay():
    string {

    return (
      this.receivable.project?.name ||
      'Sin proyecto'
    );
  }


  get collectionNotes():
    string |
    null {

    return (
      this.collection.notes ??
      null
    );
  }


  get canSave():
    boolean {

    return (
      !this.saving() &&

      this.form.valid &&

      Boolean(
        this.collection.id,
      ) &&

      this.collection.status ===
      'active' &&

      this.item.application_status ===
      'active' &&

      this.collectionAmount > 0
    );
  }


  // =======================================================
  // GUARDAR
  // =======================================================

  saveData():
    void {

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
      entity.TreasuryReverseCollectionPayload = {

        reason,
      };


    this.saving.set(
      true,
    );


    this.accountsReceivableService
      .reverseCollection(
        this.collection.id,
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
            entity.TreasuryReverseCollectionResponse,
        ) => {

          if (
            !response.success
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
            'Error al revertir la Collection:',
            error,
          );
        },
      });
  }


  // =======================================================
  // FOOTER
  // =======================================================

  onBtnsSectionAction(
    action:
      ModuleFooterAction,
  ): void {

    switch (
      action
    ) {

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
}