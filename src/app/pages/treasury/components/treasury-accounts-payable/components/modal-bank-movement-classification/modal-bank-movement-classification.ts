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

import {
  Catalog,
} from '../../../../../../shared/interfaces/general-interfaces';

// Tesorería
import * as entity from '../../../../interfaces/treasury.interfaces';

import {
  TreasuryService,
} from '../../../../services/treasury.service';

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
    id: 'prestamo',
    name: 'Préstamo',
  },
];

@Component({
  selector:
    'app-modal-bank-movement-classification',

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
    './modal-bank-movement-classification.html',

  styleUrl:
    './modal-bank-movement-classification.scss',
})
export class ModalBankMovementClassification {

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
        ModalBankMovementClassification
      >,
    );

  private readonly treasuryService =
    inject(TreasuryService);

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

  // =========================================================
  // MOVIMIENTO
  // =========================================================

  get movement():
    entity.TreasuryBankMovementTableRow {
    return this.data.movement;
  }

  get originalAmount(): number {
    return Number(
      this.movement.amount ?? 0,
    );
  }

  get availableAmount(): number {
    return Number(
      this.movement.available_amount ?? 0,
    );
  }

  get appliedAmount(): number {
    return Number(
      this.movement.applied_amount ?? 0,
    );
  }

  get manualClosedAmount(): number {
    return Number(
      this.movement.manual_closed_amount ?? 0,
    );
  }

  get referenceDisplay(): string {
    return (
      this.movement.tracking_key?.trim() ||
      this.movement.bank_reference?.trim() ||
      this.movement.receipt_number?.trim() ||
      `Movimiento ${this.movement.id}`
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

    if (alias && identifier) {
      return `${alias} · ${identifier}`;
    }

    return (
      alias ||
      identifier ||
      'Sin cuenta'
    );
  }

  get currentClassificationLabel(): string {
    return (
      this.movement
        .classification_label ||
      this.getClassificationLabel(
        this.movement.classification,
      )
    );
  }

  get selectedClassification():
    entity.TreasuryManualBankMovementClassification |
    null {
    const rawValue =
      this.form.controls
        .classification
        .value;

    const value =
      typeof rawValue === 'object' &&
      rawValue !== null
        ? rawValue.id
        : rawValue;

    const normalized =
      String(value ?? '').trim();

    const allowedValues:
      entity.TreasuryManualBankMovementClassification[] = [
      'transferencia_salida',
      'pago_tercero',
      'gasto_por_comprobar',
      'prestamo',
    ];

    return allowedValues.includes(
      normalized as
        entity.TreasuryManualBankMovementClassification,
    )
      ? normalized as
          entity.TreasuryManualBankMovementClassification
      : null;
  }

  get selectedClassificationLabel(): string {
    return this.getClassificationLabel(
      this.selectedClassification,
    );
  }

  get excludesFromAccountsPayable(): boolean {
    return (
      this.selectedClassification ===
        'gasto_por_comprobar' ||
      this.selectedClassification ===
        'prestamo'
    );
  }

  get movementIsEligible(): boolean {
    return (
      Boolean(this.movement?.id) &&
      this.movement.movement_type ===
        'outflow' &&
      this.movement.status ===
        'unmatched' &&
      this.roundMoney(
        this.manualClosedAmount,
      ) === 0 &&
      this.roundMoney(
        this.appliedAmount,
      ) === 0 &&
      this.roundMoney(
        this.availableAmount,
      ) ===
        this.roundMoney(
          this.originalAmount,
        )
    );
  }

  get canSave(): boolean {
    const selectedClassification =
      this.selectedClassification;

    return (
      !this.saving() &&
      this.form.valid &&
      this.movementIsEligible &&
      selectedClassification !== null &&
      selectedClassification !==
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

    const reason =
      this.form.controls
        .reason
        .value
        .trim();

    if (
      !classification ||
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

    this.treasuryService
      .updateBankMovementClassification(
        this.movement.id,
        payload,
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(() => {
          this.saving.set(false);
        }),
      )
      .subscribe({
        next: (
          response:
            entity.TreasuryUpdateBankMovementClassificationResponse,
        ) => {
          if (!response.success) {
            return;
          }

          this.dialogRef.close(
            response,
          );
        },

        error: (error: unknown) => {
          console.error(
            'Error al cambiar la clasificación del movimiento:',
            error,
          );
        },
      });
  }

  // =========================================================
  // BOTONES
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

  formatDate(
    value:
      | string
      | null
      | undefined,
  ): string {
    if (!value) {
      return '-';
    }

    const date =
      String(value).slice(0, 10);

    const [
      year,
      month,
      day,
    ] = date.split('-');

    if (
      !year ||
      !month ||
      !day
    ) {
      return date;
    }

    return `${day}/${month}/${year}`;
  }

  private getClassificationLabel(
    classification:
      | string
      | null
      | undefined,
  ): string {
    switch (classification) {
      case 'transferencia_salida':
        return 'Transferencia de salida';

      case 'pago_tercero':
        return 'Pago a tercero';

      case 'gasto_por_comprobar':
        return 'Gasto por comprobar';

      case 'prestamo':
        return 'Préstamo';

      default:
        return 'Sin clasificación';
    }
  }

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
}