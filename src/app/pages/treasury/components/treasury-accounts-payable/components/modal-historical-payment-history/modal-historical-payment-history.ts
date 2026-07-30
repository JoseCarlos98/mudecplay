import { CommonModule } from '@angular/common';

import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';

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
  LoadingOverlay,
} from '../../../../../../shared/ui/loading-overlay/loading-overlay';

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
    'app-modal-historical-payment-history',

  standalone: true,

  imports: [
    CommonModule,

    MatIconModule,

    ModuleHeader,
    BtnsSection,
    LoadingOverlay,
  ],

  templateUrl:
    './modal-historical-payment-history.html',

  styleUrl:
    './modal-historical-payment-history.scss',
})
export class ModalHistoricalPaymentHistory
  implements OnInit {

  // =========================================================
  // INYECCIONES
  // =========================================================

  readonly data =
    inject<
      entity.TreasuryHistoricalPaymentHistoryModalData
    >(
      MAT_DIALOG_DATA,
    );

  private readonly dialogRef =
    inject(
      MatDialogRef<
        ModalHistoricalPaymentHistory
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

  private readonly destroyRef =
    inject(
      DestroyRef,
    );

  // =========================================================
  // UI
  // =========================================================

  readonly headerConfig =
    HEADER_CONFIG;

  readonly loading =
    signal(false);

  // =========================================================
  // DATA
  // =========================================================

  historyResponse:
    entity.TreasuryHistoricalPaymentHistoryResponse
    | null =
    null;

  actions:
    entity.TreasuryHistoricalPaymentHistoryAction[] =
    [];

  // =========================================================
  // CICLO DE VIDA
  // =========================================================

  ngOnInit(): void {
    this.loadHistory();
  }

  // =========================================================
  // PAGO DE LA TABLA
  // =========================================================

  get paymentRow():
    entity.TreasuryHistoricalPaymentTableRow {
    return this.data.payment;
  }

  // =========================================================
  // PAGO DEVUELTO POR HISTORIAL
  // =========================================================

  get currentPayment():
    entity.TreasuryHistoricalPaymentHistoryResponse['payment']
    | null {
    return (
      this.historyResponse
        ?.payment ??
      null
    );
  }

  get paymentId(): string {
    return (
      this.currentPayment?.id ||
      this.paymentRow.payment_id
    );
  }

  get paymentAmount(): number {
    return Number(
      this.currentPayment?.amount ??
      this.paymentRow.amount ??
      0,
    );
  }

  get paymentDate(): string | null {
    return (
      this.currentPayment
        ?.payment_date ??
      this.paymentRow
        .payment_date ??
      null
    );
  }

  get folioDisplay(): string {
    return (
      this.paymentRow
        .internal_folio ||
      this.paymentRow
        .expense
        ?.internal_folio ||
      'Sin folio'
    );
  }

  get supplierDisplay(): string {
    return (
      this.paymentRow
        .supplier_display_name ||
      this.paymentRow
        .supplier
        ?.display_name ||
      'Sin proveedor'
    );
  }

  get projectDisplay(): string {
    return (
      this.paymentRow
        .project_name ||
      this.paymentRow
        .project
        ?.name ||
      'Sin proyecto'
    );
  }

  get conceptDisplay(): string {
    return (
      this.paymentRow
        .concept ||
      this.paymentRow
        .expense_item
        ?.concept ||
      'Sin concepto'
    );
  }

  // =========================================================
  // ESTADO ACTUAL
  // =========================================================

  get regularizationStatus():
    entity.TreasuryHistoricalRegularizationStatus {
    return (
      this.currentPayment
        ?.regularization_status ??
      this.paymentRow
        .regularization_status
    );
  }

  get regularizationStatusLabel(): string {
    return this.getRegularizationStatusLabel(
      this.regularizationStatus,
    );
  }

  get regularizationStatusClass(): string {
    switch (
      this.regularizationStatus
    ) {
      case 'regularized':
        return (
          'historical-payment-status--success'
        );

      case 'pending':
      default:
        return (
          'historical-payment-status--warning'
        );
    }
  }

  get currentPaymentMethod():
    entity.TreasuryHistoricalPaymentMethod {
    return (
      this.currentPayment
        ?.payment_method ??
      this.paymentRow
        .payment_method
    );
  }

  get currentPaymentMethodLabel(): string {
    return this.getPaymentMethodLabel(
      this.currentPaymentMethod,
    );
  }

  get currentRegularizationType():
    | entity.TreasuryHistoricalRegularizationType
    | null {
    return (
      this.currentPayment
        ?.regularization_type ??
      this.paymentRow
        .regularization_type ??
      null
    );
  }

  get currentRegularizationTypeLabel(): string {
    return this.getRegularizationTypeLabel(
      this.currentRegularizationType,
    );
  }

  get companyDisplay(): string {
    return (
      this.currentPayment
        ?.company
        ?.name ||
      this.paymentRow
        .company
        ?.name ||
      'Empresa no identificada'
    );
  }

  get currentReference(): string {
    return (
      this.currentPayment
        ?.reference
        ?.trim() ||
      this.paymentRow
        .reference
        ?.trim() ||
      'Sin referencia'
    );
  }

  get currentBankMovementId(): string | null {
    return (
      this.currentPayment
        ?.bank_movement
        ?.id ??
      this.paymentRow
        .bank_movement
        ?.id ??
      null
    );
  }

  get currentBankMovementReference(): string {
    return (
      this.currentPayment
        ?.bank_movement
        ?.bank_reference
        ?.trim() ||
      this.paymentRow
        .bank_movement
        ?.bank_reference
        ?.trim() ||
      this.paymentRow
        .bank_movement_reference
        ?.trim() ||
      (
        this.currentBankMovementId
          ? `Movimiento ${this.currentBankMovementId}`
          : 'Sin movimiento bancario'
      )
    );
  }

  get currentRegularizedAt(): string | null {
    return (
      this.currentPayment
        ?.regularized_at ??
      this.paymentRow
        .regularized_at ??
      null
    );
  }

  get currentRegularizedByUserId(): number | null {
    return (
      this.currentPayment
        ?.regularized_by_user_id ??
      this.paymentRow
        .regularized_by_user_id ??
      null
    );
  }

  get currentRegularizationNotes(): string | null {
    return (
      this.currentPayment
        ?.regularization_notes
        ?.trim() ||
      this.paymentRow
        .regularization_notes
        ?.trim() ||
      null
    );
  }

  // =========================================================
  // CARGA
  // =========================================================

  loadHistory(): void {
    if (
      this.loading() ||
      !this.paymentRow
        ?.payment_id
    ) {
      return;
    }

    this.loading.set(
      true,
    );

    this.accountsPayableService
      .getHistoricalPaymentHistory(
        this.paymentRow.payment_id,
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(() =>
          this.loading.set(
            false,
          ),
        ),
      )
      .subscribe({
        next: (
          response:
            entity.TreasuryHistoricalPaymentHistoryResponse,
        ) => {
          this.historyResponse =
            response;

          this.actions =
            response.history ??
            [];
        },

        error: (
          error:
            unknown,
        ) => {
          console.error(
            'Error al cargar el historial del pago histórico:',
            error,
          );

          this.historyResponse =
            null;

          this.actions =
            [];

          this.showError(
            this.resolveErrorMessage(
              error,
            ),
          );
        },
      });
  }

  // =========================================================
  // ACCIONES DEL HISTORIAL
  // =========================================================

  getActionLabel(
    action:
      entity.TreasuryHistoricalPaymentHistoryAction,
  ): string {
    switch (
      action.action_type
    ) {
      case 'regularize':
        return 'Pago histórico regularizado';

      case 'reopen_regularization':
        return 'Regularización reabierta';

      default:
        return 'Evento de regularización';
    }
  }

  getActionIcon(
    action:
      entity.TreasuryHistoricalPaymentHistoryAction,
  ): string {
    switch (
      action.action_type
    ) {
      case 'regularize':
        return 'fact_check';

      case 'reopen_regularization':
        return 'restart_alt';

      default:
        return 'history';
    }
  }

  getActionClass(
    action:
      entity.TreasuryHistoricalPaymentHistoryAction,
  ): string {
    switch (
      action.action_type
    ) {
      case 'regularize':
        return (
          'history-event--success'
        );

      case 'reopen_regularization':
        return (
          'history-event--warning'
        );

      default:
        return (
          'history-event--neutral'
        );
    }
  }

  getActionRegularizationTypeLabel(
    action:
      entity.TreasuryHistoricalPaymentHistoryAction,
  ): string {
    return this.getRegularizationTypeLabel(
      action.regularization_type,
    );
  }

  getActionCompanyDisplay(
    action:
      entity.TreasuryHistoricalPaymentHistoryAction,
  ): string {
    const metadataCompany =
      this.getMetadataString(
        action,
        'company_display',
      );

    if (metadataCompany) {
      return metadataCompany;
    }

    const previousCompany =
      this.getMetadataString(
        action,
        'previous_company_name',
      );

    if (previousCompany) {
      return previousCompany;
    }

    if (action.company_id) {
      return (
        `Empresa #${action.company_id}`
      );
    }

    return (
      'Empresa no identificada'
    );
  }

  getActionMovementDisplay(
    action:
      entity.TreasuryHistoricalPaymentHistoryAction,
  ): string {
    const metadataReference =
      this.getMetadataString(
        action,
        'reference',
      );

    if (
      action.bank_movement_id &&
      metadataReference
    ) {
      return (
        `${metadataReference} · ` +
        `Movimiento ${action.bank_movement_id}`
      );
    }

    const previousReference =
      this.getMetadataString(
        action,
        'previous_reference',
      );

    if (
      action.bank_movement_id &&
      previousReference
    ) {
      return (
        `${previousReference} · ` +
        `Movimiento ${action.bank_movement_id}`
      );
    }

    if (action.bank_movement_id) {
      return (
        `Movimiento ${action.bank_movement_id}`
      );
    }

    return (
      metadataReference ||
      previousReference ||
      'Sin movimiento bancario'
    );
  }

  getActionUserDisplay(
    action:
      entity.TreasuryHistoricalPaymentHistoryAction,
  ): string {
    return action.created_by_user_id
      ? `Usuario #${action.created_by_user_id}`
      : 'Sistema';
  }

  hasMovementBalanceRestored(
    action:
      entity.TreasuryHistoricalPaymentHistoryAction,
  ): boolean {
    return (
      this.getMetadataBoolean(
        action,
        'movement_balance_restored',
      ) === true
    );
  }

  getPreviousMovementAvailableAmount(
    action:
      entity.TreasuryHistoricalPaymentHistoryAction,
  ): number | null {
    return this.getMetadataNumber(
      action,
      'previous_movement_available_amount',
    );
  }

  getNewMovementAvailableAmount(
    action:
      entity.TreasuryHistoricalPaymentHistoryAction,
  ): number | null {
    return this.getMetadataNumber(
      action,
      'new_movement_available_amount',
    );
  }

  // =========================================================
  // LABELS
  // =========================================================

  getRegularizationStatusLabel(
    status:
      | entity.TreasuryHistoricalRegularizationStatus
      | null
      | undefined,
  ): string {
    switch (status) {
      case 'regularized':
        return 'Regularizado';

      case 'pending':
      default:
        return 'Pendiente';
    }
  }

  getPaymentMethodLabel(
    method:
      | entity.TreasuryHistoricalPaymentMethod
      | null
      | undefined,
  ): string {
    switch (method) {
      case 'transfer':
        return 'Transferencia';

      case 'cash':
        return 'Efectivo';

      case 'unknown':
      default:
        return 'Sin identificar';
    }
  }

  getRegularizationTypeLabel(
    type:
      | entity.TreasuryHistoricalRegularizationType
      | null
      | undefined,
  ): string {
    switch (type) {
      case 'bank_transfer_matched':
        return 'Transferencia conciliada';

      case 'historical_transfer_without_movement':
        return 'Transferencia sin movimiento';

      case 'cash':
        return 'Efectivo';

      default:
        return 'Sin regularizar';
    }
  }

  // =========================================================
  // FOOTER
  // =========================================================

  onFooterAction(
    action:
      ModuleFooterAction,
  ): void {
    switch (action) {
      case 'close':
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
    this.dialogRef.close(
      null,
    );
  }

  // =========================================================
  // METADATA
  // =========================================================

  private getMetadata(
    action:
      entity.TreasuryHistoricalPaymentHistoryAction,
  ): Record<string, unknown> {
    return (
      action.metadata &&
      typeof action.metadata ===
        'object'
    )
      ? action.metadata
      : {};
  }

  private getMetadataString(
    action:
      entity.TreasuryHistoricalPaymentHistoryAction,

    key:
      string,
  ): string | null {
    const value =
      this.getMetadata(
        action,
      )[key];

    if (
      typeof value !==
      'string'
    ) {
      return null;
    }

    const normalized =
      value.trim();

    return normalized ||
      null;
  }

  private getMetadataBoolean(
    action:
      entity.TreasuryHistoricalPaymentHistoryAction,

    key:
      string,
  ): boolean | null {
    const value =
      this.getMetadata(
        action,
      )[key];

    return typeof value ===
      'boolean'
      ? value
      : null;
  }

  private getMetadataNumber(
    action:
      entity.TreasuryHistoricalPaymentHistoryAction,

    key:
      string,
  ): number | null {
    const value =
      this.getMetadata(
        action,
      )[key];

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    const amount =
      Number(value);

    return Number.isFinite(
      amount,
    )
      ? amount
      : null;
  }

  // =========================================================
  // ERROR
  // =========================================================

  private showError(
    message:
      string,
  ): void {
    this.dialogService
      .confirm({
        title:
          'No se pudo cargar el historial',

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
      return backendMessage
        .join('\n');
    }

    if (
      typeof backendMessage ===
        'string' &&
      backendMessage.trim()
    ) {
      return backendMessage
        .trim();
    }

    return (
      'No fue posible consultar el historial del pago histórico.'
    );
  }
}