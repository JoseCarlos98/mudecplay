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

import {
  DialogService,
} from '../../../../../../shared/services/dialog.service';

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
      name: 'Pago a tercero',
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
    'app-modal-accounts-receivable-classification',

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
    './modal-accounts-receivable-classification.html',

  styleUrl:
    './modal-accounts-receivable-classification.scss',
})
export class ModalAccountsReceivableClassification {

  readonly data =
    inject<
      entity.TreasuryBankMovementClassificationModalData
    >(MAT_DIALOG_DATA);

  private readonly dialogRef =
    inject(
      MatDialogRef<
        ModalAccountsReceivableClassification
      >,
    );

  private readonly accountsReceivableService =
    inject(
      TreasuryAccountsReceivableService,
    );

  private readonly dialogService =
    inject(DialogService);

  private readonly fb =
    inject(FormBuilder);

  private readonly destroyRef =
    inject(DestroyRef);


  readonly headerConfig =
    HEADER_CONFIG;

  readonly classificationOptions =
    CLASSIFICATION_OPTIONS;

  readonly saving =
    signal(false);


  get movement(): entity.TreasuryAvailableInflow {

    return this.data.movement;
  }


  readonly form =
    this.fb.group({

      classification:
        this.fb.control<
          Catalog |
          string |
          null
        >(
          this.getInitialClassification(),
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


  get currentClassificationLabel():
    string {

    const classification =
      this.movement.classification;

    if (!classification) {
      return 'Sin clasificación';
    }

    const option =
      CLASSIFICATION_OPTIONS.find(
        (item) =>
          String(item.id) ===
          classification,
      );

    return (
      option?.name ||
      classification
    );
  }


  get selectedClassification():
    entity.TreasuryBankMovementInflowReviewClassification
    | null {

    return this.resolveClassification(
      this.form
        .getRawValue()
        .classification,
    );
  }


  get selectedClassificationLabel():
    string {

    const classification =
      this.selectedClassification;

    if (!classification) {
      return 'Sin clasificación';
    }

    const option =
      CLASSIFICATION_OPTIONS.find(
        (item) =>
          String(item.id) ===
          classification,
      );

    return (
      option?.name ||
      classification
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


  get canSave(): boolean {

    const classification =
      this.selectedClassification;

    return (
      !this.saving() &&
      this.form.valid &&
      Boolean(this.movement?.id) &&
      this.movement.status ===
      'unmatched' &&
      classification !== null &&
      classification !==
      this.movement.classification
    );
  }


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
      entity.TreasuryUpdateBankMovementClassificationPayload = {
      classification,
      reason,
    };

    this.saving.set(true);

    this.accountsReceivableService
      .updateBankMovementClassification(
        this.movement.id,
        payload,
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(() =>
          this.saving.set(false),
        ),
      )
      .subscribe({

        next: (
          response:
            entity.TreasuryUpdateBankMovementClassificationResponse,
        ) => {

          if (!response?.success) {
            return;
          }

          this.dialogRef.close(
            response,
          );
        },

        error: (
          error: unknown,
        ) => {

          console.error(
            'Error cambiando clasificación de entrada:',
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

    if (this.saving()) {
      return;
    }

    this.dialogRef.close(
      null,
    );
  }


  private getInitialClassification():
    string | null {

    const classification =
      this.movement
        ?.classification;

    if (!classification) {
      return null;
    }

    return VALID_CLASSIFICATIONS
      .includes(
        classification as
        entity.TreasuryBankMovementInflowReviewClassification,
      )
      ? classification
      : null;
  }


  private resolveClassification(
    value:
      | Catalog
      | string
      | null,
  ):
    entity.TreasuryBankMovementInflowReviewClassification
    | null {

    const raw =
      typeof value ===
        'object' &&
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


  private showError(
    message: string,
  ): void {

    this.dialogService
      .confirm({
        title:
          'No se pudo cambiar la clasificación',

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

    const backendMessage =
      (
        error as {
          error?: {
            message?:
            | string
            | string[];
          };
        }
      )?.error?.message;

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
      'No fue posible cambiar la clasificación de la entrada bancaria.'
    );
  }
}