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

// UI compartida
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

// Interfaces compartidas
import {
  Catalog,
} from '../../../../../../shared/interfaces/general-interfaces';

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

const CLASSIFICATION_OPTIONS: Catalog[] = [
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
    'app-modal-accounts-payable-classification',

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
    './modal-accounts-payable-classification.html',

  styleUrl:
    './modal-accounts-payable-classification.scss',
})
export class ModalAccountsPayableClassification {

  // =========================================================
  // INYECCIONES
  // =========================================================

  readonly data =
    inject<
      entity.TreasuryBankMovementClassificationModalData
    >(MAT_DIALOG_DATA);

  private readonly dialogRef =
    inject(
      MatDialogRef<
        ModalAccountsPayableClassification
      >,
    );

  private readonly accountsPayableService =
    inject(TreasuryAccountsPayableService);

  private readonly dialogService =
    inject(DialogService);

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
  // MOVIMIENTO
  // =========================================================

  get movement():
    entity.TreasuryAvailableOutflowTableRow {
    return this.data.movement;
  }

  // =========================================================
  // FORMULARIO
  // =========================================================

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

  // =========================================================
  // INFORMACIÓN
  // =========================================================

  get currentClassificationLabel():
    string {
    return (
      this.movement
        .classification_label ||
      'Sin clasificación'
    );
  }

  get selectedClassification():
    entity.TreasuryBankMovementReviewClassification
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
      this.movement
        .bank_account_display ||
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

    this.accountsPayableService
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

          /*
           * No mostramos diálogo de éxito.
           * El interceptor global muestra
           * el mensaje enviado por backend.
           */
          this.dialogRef.close(
            response,
          );
        },

        error: (error: unknown) => {
          console.error(
            'Error cambiando clasificación del movimiento:',
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
  // BTN SECTION
  // =========================================================

  onBtnsSectionAction(
    action: ModuleFooterAction,
  ): void {
    switch (action) {
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

  closeModal(): void {
    if (this.saving()) {
      return;
    }

    this.dialogRef.close(null);
  }

  // =========================================================
  // HELPERS
  // =========================================================

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
          entity.TreasuryBankMovementReviewClassification,
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
    entity.TreasuryBankMovementReviewClassification
    | null {

    const raw =
      typeof value === 'object' &&
      value !== null
        ? value.id
        : value;

    const normalized =
      String(raw ?? '')
        .trim();

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
      'No fue posible cambiar la clasificación del movimiento.'
    );
  }
}