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

import {
  finalize,
} from 'rxjs';

// UI
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

// Módulo
import * as entity from '../../interfaces/treasury-accounts-payable.interfaces';

import {
  TreasuryAccountsPayableService,
} from '../../services/treasury-accounts-payable.service';


const HEADER_CONFIG:
  ModuleHeaderConfig = {
  modal: true,
};


const CLASSIFICATION_OPTIONS:
  Catalog[] = [
    {
      id: 'transferencia_salida',
      name: 'Transferencia de salida',
    },
    {
      id: 'pago_tercero',
      name: 'Pago a tercero',
    },
    {
      id: 'gasto_por_comprobar',
      name: 'Gasto por comprobar',
    },
    {
      id: 'impuesto',
      name: 'Impuesto',
    },
    {
      id: 'prestamo',
      name: 'Préstamo',
    },
    {
      id: 'traspaso_interno_salida',
      name: 'Traspaso interno',
    },
  ];


const VALID_CLASSIFICATIONS:
  entity.TreasuryBankMovementReviewClassification[] = [
    'transferencia_salida',
    'traspaso_interno_salida',
    'pago_tercero',
    'gasto_por_comprobar',
    'prestamo',
    'impuesto',
  ];


@Component({
  selector:
    'app-modal-accounts-payable-bulk-classification',

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
    './modal-accounts-payable-bulk-classification.html',

  styleUrl:
    './modal-accounts-payable-bulk-classification.scss',
})
export class ModalAccountsPayableBulkClassification {

  // =========================================================
  // INYECCIONES
  // =========================================================

  readonly data =
    inject<
      entity.TreasuryBulkBankMovementClassificationModalData
    >(MAT_DIALOG_DATA);

  private readonly dialogRef =
    inject(
      MatDialogRef<
        ModalAccountsPayableBulkClassification
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

  readonly classificationOptions =
    CLASSIFICATION_OPTIONS;

  readonly saving =
    signal(false);


  // =========================================================
  // MOVIMIENTOS
  // =========================================================

  get movements():
    entity.TreasuryAvailableOutflowTableRow[] {

    return (
      this.data.movements ??
      []
    );
  }

  get movementsCount(): number {
    return this.movements.length;
  }

  get totalAvailable(): number {
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


  // =========================================================
  // FORM
  // =========================================================

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
    entity.TreasuryBankMovementReviewClassification
    | null {

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
        entity.TreasuryBankMovementReviewClassification;

    return VALID_CLASSIFICATIONS
      .includes(
        classification,
      )
      ? classification
      : null;
  }


  get canSave(): boolean {
    return (
      !this.saving() &&
      this.movements.length > 0 &&
      this.movements.every(
        (movement) =>
          movement.status ===
          'unmatched',
      ) &&
      this.form.valid &&
      this.selectedClassification !==
        null
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
        (movement) =>
          String(
            movement.id,
          ),
      );

    this.saving.set(
      true,
    );

    this.accountsPayableService
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

        finalize(() =>
          this.saving.set(
            false,
          ),
        ),
      )
      .subscribe({
        next: (
          response:
            entity.TreasuryUpdateBankMovementsClassificationResponse,
        ) => {
          if (
            !response?.success
          ) {
            return;
          }

          /*
           * El interceptor global
           * muestra el mensaje.
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
            'Error cambiando clasificaciones masivas:',
            error,
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
}