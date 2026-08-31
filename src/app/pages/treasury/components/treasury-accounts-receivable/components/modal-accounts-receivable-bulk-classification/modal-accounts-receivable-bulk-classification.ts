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
  InputSelect,
} from '../../../../../../shared/ui/input-select/input-select';

import {
  LoadingOverlay,
} from '../../../../../../shared/ui/loading-overlay/loading-overlay';

import {
  Catalog,
} from '../../../../../../shared/interfaces/general-interfaces';

import * as entity
  from '../../interfaces/treasury-accounts-receivable.interfaces';

import {
  TreasuryAccountsReceivableService,
} from '../../services/treasury-accounts-receivable.service';


const HEADER_CONFIG:
  ModuleHeaderConfig = {
    modal: true,
  };


const CLASSIFICATION_OPTIONS:
  Catalog[] = [
    {
      id: 'transferencia_entrada',
      name: 'Transferencia de entrada',
    },
    {
      id: 'pago_tercero',
      name: 'Pago de tercero',
    },
    {
      id: 'prestamo',
      name: 'Préstamo',
    },
    {
      id: 'traspaso_interno_entrada',
      name: 'Traspaso interno',
    },
  ];


const VALID_CLASSIFICATIONS:
  entity.TreasuryBankMovementInflowReviewClassification[] = [
    'transferencia_entrada',
    'traspaso_interno_entrada',
    'pago_tercero',
    'prestamo',
  ];


@Component({
  selector:
    'app-modal-accounts-receivable-bulk-classification',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatIconModule,

    ModuleHeader,
    BtnsSection,
    InputField,
    InputSelect,
    LoadingOverlay,
  ],

  templateUrl:
    './modal-accounts-receivable-bulk-classification.html',

  styleUrl:
    './modal-accounts-receivable-bulk-classification.scss',
})
export class ModalAccountsReceivableBulkClassification {

  readonly data =
    inject<
      entity.TreasuryBulkBankMovementClassificationModalData
    >(MAT_DIALOG_DATA);

  private readonly dialogRef =
    inject(
      MatDialogRef<
        ModalAccountsReceivableBulkClassification
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


  readonly headerConfig =
    HEADER_CONFIG;

  readonly classificationOptions =
    CLASSIFICATION_OPTIONS;

  readonly saving =
    signal(false);


  get movements():
    entity.TreasuryAvailableInflow[] {

    return (
      this.data.movements ??
      []
    );
  }


  get movementsCount():
    number {

    return this.movements.length;
  }


  get totalAvailable():
    number {

    return this.movements.reduce(
      (
        total,
        movement,
      ) =>
        total +
        Number(
          movement.available_amount ||
          0,
        ),
      0,
    );
  }


  readonly form =
    this.fb.group({

      classification:
        this.fb.control<
          Catalog |
          string |
          null
        >(
          null,
          {
            validators: [
              Validators.required,
            ],
          },
        ),

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


  get selectedClassification():
    entity.TreasuryBankMovementInflowReviewClassification |
    null {

    const value =
      this.form
        .getRawValue()
        .classification;

    const raw =
      typeof value === 'object' &&
      value !== null
        ? value.id
        : value;

    const normalized =
      String(
        raw ?? '',
      ).trim();

    if (!normalized) {
      return null;
    }

    const classification =
      normalized as
        entity.TreasuryBankMovementInflowReviewClassification;

    return VALID_CLASSIFICATIONS
      .includes(
        classification,
      )
        ? classification
        : null;
  }


  get canSave():
    boolean {

    return (
      !this.saving() &&
      this.movements.length > 0 &&
      this.movements.every(
        (
          movement,
        ) =>
          movement.status ===
          'unmatched',
      ) &&
      this.form.valid &&
      this.selectedClassification !==
      null
    );
  }


  saveData():
    void {

    if (
      this.saving() ||
      !this.canSave
    ) {

      this.form.markAllAsTouched();

      return;
    }

    const classification =
      this.selectedClassification;

    if (!classification) {
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

    const movementIds =
      this.movements.map(
        (
          movement,
        ) =>
          String(
            movement.id,
          ),
      );

    this.saving.set(
      true,
    );

    this.accountsReceivableService
      .updateBankMovementsClassification({
        movement_ids:
          movementIds,

        classification,

        reason,
      })
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
          response,
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
            'Error cambiando clasificaciones masivas de entradas:',
            error,
          );
        },
      });
  }


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