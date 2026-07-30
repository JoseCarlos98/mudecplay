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
  LoadingOverlay,
} from '../../../../../../shared/ui/loading-overlay/loading-overlay';

// Helpers
import {
  roundMoney,
} from '../../../../../../shared/helpers/general-helpers';

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

const HEADER_CONFIG:
  ModuleHeaderConfig = {
    modal: true,
  };

@Component({
  selector:
    'app-modal-reopen-historical-regularization',

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
    './modal-reopen-historical-regularization.html',

  styleUrl:
    './modal-reopen-historical-regularization.scss',
})
export class ModalReopenHistoricalRegularization {

  // =========================================================
  // INYECCIONES
  // =========================================================

  readonly data =
    inject<
      entity.TreasuryReopenHistoricalRegularizationModalData
    >(
      MAT_DIALOG_DATA,
    );

  private readonly dialogRef =
    inject(
      MatDialogRef<
        ModalReopenHistoricalRegularization
      >,
    );

  private readonly accountsPayableService =
    inject(
      TreasuryAccountsPayableService,
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
  // INFORMACIÓN DEL PAGO
  // =========================================================

  get payment():
    entity.TreasuryHistoricalPaymentTableRow {
    return this.data.payment;
  }

  get paymentAmount(): number {
    return roundMoney(
      Number(
        this.payment.amount || 0,
      ),
    );
  }

  get folioDisplay(): string {
    return (
      this.payment.internal_folio ||
      this.payment.expense
        ?.internal_folio ||
      'Sin folio'
    );
  }

  get paymentDateDisplay(): string {
    return this.formatDate(
      this.payment.payment_date,
    );
  }

  get supplierDisplay(): string {
    return (
      this.payment
        .supplier_display_name ||
      this.payment.supplier
        ?.display_name ||
      'Sin proveedor'
    );
  }

  get projectDisplay(): string {
    return (
      this.payment.project_name ||
      this.payment.project
        ?.name ||
      'Sin proyecto'
    );
  }

  get conceptDisplay(): string {
    return (
      this.payment.concept ||
      this.payment.expense_item
        ?.concept ||
      'Sin concepto'
    );
  }

  get companyDisplay(): string {
    return (
      this.payment.company?.name ||
      this.payment.company_name ||
      'Empresa no identificada'
    );
  }

  get paymentMethodDisplay(): string {
    if (
      this.payment.payment_method_label
    ) {
      return this.payment
        .payment_method_label;
    }

    switch (
      this.payment.payment_method
    ) {
      case 'transfer':
        return 'Transferencia';

      case 'cash':
        return 'Efectivo';

      default:
        return 'No identificado';
    }
  }

  get regularizationTypeDisplay(): string {
    if (
      this.payment
        .regularization_type_label
    ) {
      return this.payment
        .regularization_type_label;
    }

    switch (
      this.payment.regularization_type
    ) {
      case 'bank_transfer_matched':
        return 'Transferencia conciliada';

      case 'historical_transfer_without_movement':
        return 'Transferencia sin movimiento';

      case 'cash':
        return 'Efectivo';

      default:
        return 'Sin tipo';
    }
  }

  get hasBankMovement(): boolean {
    return Boolean(
      this.payment.bank_movement?.id,
    );
  }

  get bankMovement():
    entity.TreasuryHistoricalPaymentBankMovement
    | null {
    return (
      this.payment.bank_movement ??
      null
    );
  }

  get movementReferenceDisplay(): string {
    return (
      this.bankMovement
        ?.bank_reference
        ?.trim() ||
      this.payment
        .bank_movement_reference ||
      this.payment.reference ||
      'Sin referencia'
    );
  }

  get movementAvailableAmount(): number {
    return roundMoney(
      Number(
        this.bankMovement
          ?.available_amount ||
        0,
      ),
    );
  }

  get movementAvailableAfterReopen(): number {
    if (!this.hasBankMovement) {
      return 0;
    }

    return roundMoney(
      this.movementAvailableAmount +
      this.paymentAmount,
    );
  }

  get canSave(): boolean {
    return (
      !this.saving() &&
      this.form.valid &&
      Boolean(
        this.payment?.payment_id,
      ) &&
      this.payment
        .regularization_status ===
        'regularized' &&
      this.payment
        .can_reopen_regularization
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
      entity.TreasuryReopenHistoricalRegularizationPayload = {
        reason,
      };

    this.saving.set(
      true,
    );

    this.accountsPayableService
      .reopenHistoricalPaymentRegularization(
        this.payment.payment_id,
        payload,
      )
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
            entity.TreasuryReopenHistoricalRegularizationResponse,
        ) => {
          if (!response.success) {
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
            'Error al reabrir la regularización histórica:',
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

  // =========================================================
  // MODAL
  // =========================================================

  closeModal(): void {
    if (this.saving()) {
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
    if (!value) {
      return 'Sin fecha';
    }

    const normalized =
      String(value)
        .slice(0, 10);

    const parts =
      normalized.split('-');

    if (parts.length !== 3) {
      return normalized;
    }

    const [
      year,
      month,
      day,
    ] = parts;

    return `${day}/${month}/${year}`;
  }

  private showError(
    message:
      string,
  ): void {
    this.dialogService
      .confirm({
        title:
          'No se pudo reabrir la regularización',

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
      'No fue posible reabrir la regularización del pago histórico.'
    );
  }


  get movementStatusDisplay(): string {
  switch (this.bankMovement?.status) {
    case 'unmatched':
      return 'Pendiente';

    case 'partially_matched':
      return 'Parcialmente conciliado';

    case 'matched':
      return 'Conciliado';

    case 'manually_closed':
      return 'Cerrado manualmente';

    case 'cancelled':
      return 'Cancelado';

    default:
      return 'Sin estatus';
  }
}
}