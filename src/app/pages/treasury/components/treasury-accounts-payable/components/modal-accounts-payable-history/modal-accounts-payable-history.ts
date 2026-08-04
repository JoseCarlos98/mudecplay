import { CommonModule } from '@angular/common';

import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import {
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { finalize } from 'rxjs';

// UI compartida
import {
  ModuleHeader,
} from '../../../../../../shared/ui/module-header/module-header';

import {
  ModuleHeaderConfig,
} from '../../../../../../shared/ui/module-header/interfaces/module-header-interface';

import {
  LoadingOverlay,
} from '../../../../../../shared/ui/loading-overlay/loading-overlay';

import {
  BtnsSection,
  ModuleFooterAction,
} from '../../../../../../shared/ui/btns-section/btns-section';

// Servicios compartidos
import {
  DialogService,
} from '../../../../../../shared/services/dialog.service';

// Módulo
import * as entity from '../../interfaces/treasury-accounts-payable.interfaces';

import {
  TreasuryAccountsPayableService,
} from '../../services/treasury-accounts-payable.service';

import {
  TreasuryBankMovementStatus,
} from '../../../../interfaces/treasury.interfaces';

import {
  ModalAccountsPayableReversePayment,
} from '../modal-accounts-payable-reverse-payment/modal-accounts-payable-reverse-payment';

// =========================================================
// HEADER
// =========================================================

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

@Component({
  selector: 'app-modal-accounts-payable-history',
  standalone: true,
  imports: [
    CommonModule,

    MatIconModule,
    MatButtonModule,

    ModuleHeader,
    LoadingOverlay,
    BtnsSection,
  ],
  templateUrl: './modal-accounts-payable-history.html',
  styleUrl: './modal-accounts-payable-history.scss',
})
export class ModalAccountsPayableHistory
  implements OnInit {

  // =========================================================
  // INYECCIONES
  // =========================================================

  readonly data =
    inject<entity.TreasuryBankMovementHistoryModalData>(
      MAT_DIALOG_DATA,
    );

  private readonly dialogRef =
    inject(
      MatDialogRef<
        ModalAccountsPayableHistory,
        boolean
      >,
    );

  private readonly accountsPayableService =
    inject(TreasuryAccountsPayableService);

  private readonly dialogService =
    inject(DialogService);

  // =========================================================
  // UI
  // =========================================================

  readonly headerConfig =
    HEADER_CONFIG;

  readonly loading =
    signal(false);

  readonly historyChanged =
    signal(false);

  // =========================================================
  // DATA
  // =========================================================

  historyResponse:
    entity.TreasuryBankMovementHistoryResponse | null =
    null;

  payments:
    entity.TreasuryBankMovementHistoryPayment[] = [];

  actions:
    entity.TreasuryBankMovementHistoryAction[] = [];

  // =========================================================
  // CICLO DE VIDA
  // =========================================================

  ngOnInit(): void {
    this.loadHistory();
  }

  // =========================================================
  // DATOS PRINCIPALES
  // =========================================================

  get movement():
    entity.TreasuryAvailableOutflowTableRow {
    return this.data.movement;
  }

  get movementAmount(): number {
    return Number(
      this.historyResponse
        ?.movement
        ?.amount ??
      this.movement.amount ??
      0,
    );
  }

  get availableAmount(): number {
    return Number(
      this.historyResponse
        ?.movement
        ?.available_amount ??
      this.movement.available_amount ??
      0,
    );
  }

  get appliedAmount(): number {
    return Number(
      this.historyResponse
        ?.movement
        ?.applied_amount ??
      this.movement.applied_amount ??
      0,
    );
  }

  get manualClosedAmount(): number {
    return Number(
      this.historyResponse
        ?.movement
        ?.manual_closed_amount ??
      this.movement.manual_closed_amount ??
      0,
    );
  }

  get movementStatus():
    TreasuryBankMovementStatus {
    return (
      this.historyResponse
        ?.movement
        ?.status ??
      this.movement.status
    );
  }

  get movementStatusLabel(): string {
    return this.getStatusLabel(
      this.movementStatus,
    );
  }

  get movementStatusClass(): string {
    switch (this.movementStatus) {
      case 'matched':
        return 'movement-status--success';

      case 'partially_matched':
        return 'movement-status--warning';

      case 'manually_closed':
        return 'movement-status--closed';

      case 'unmatched':
      default:
        return 'movement-status--neutral';
    }
  }

  get accountDisplay(): string {
    return (
      this.historyResponse
        ?.movement
        ?.bank_account
        ?.alias ||
      this.historyResponse
        ?.movement
        ?.bank_account
        ?.account_identifier ||
      this.movement.bank_account_display ||
      this.movement.bank_account
        ?.alias ||
      this.movement.bank_account
        ?.account_identifier ||
      'Sin cuenta'
    );
  }

  get totalApplications(): number {
    return this.payments.reduce(
      (
        total,
        payment,
      ) =>
        total +
        (
          payment.applications?.length ??
          0
        ),
      0,
    );
  }

  // =========================================================
  // CARGA
  // =========================================================

  loadHistory(): void {
    if (
      this.loading() ||
      !this.movement?.id
    ) {
      return;
    }

    this.loading.set(true);

    this.accountsPayableService
      .getBankMovementHistory(
        this.movement.id,
      )
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (
          response:
            entity.TreasuryBankMovementHistoryResponse,
        ) => {
          this.historyResponse =
            response;

          this.payments =
            response?.payments ??
            [];

          this.actions =
            response?.actions ??
            response?.history ??
            [];
        },

        error: (error: unknown) => {
          console.error(
            'Error al cargar el historial del movimiento:',
            error,
          );

          this.historyResponse =
            null;

          this.payments = [];
          this.actions = [];

          this.dialogService
            .confirm({
              title:
                'No se pudo cargar el historial',

              message:
                this.getErrorMessage(
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

  // =========================================================
  // FOOTER
  // =========================================================

  onFooterAction(
    action: ModuleFooterAction,
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
  // REVERSIÓN DE PAGO
  // =========================================================

  canReversePayment(
    payment:
      entity.TreasuryBankMovementHistoryPayment,
  ): boolean {
    const hasActiveApplication =
      (
        payment.applications ??
        []
      ).some(
        (application) =>
          application.status ===
          'active',
      );

    return (
      payment.status === 'active' &&
      Boolean(payment.payment_id) &&
      Number(payment.amount ?? 0) > 0 &&
      hasActiveApplication
    );
  }

  openReversePayment(
    payment:
      entity.TreasuryBankMovementHistoryPayment,
  ): void {
    const currentMovement =
      this.historyResponse?.movement;

    if (
      !currentMovement ||
      !this.canReversePayment(
        payment,
      )
    ) {
      return;
    }

    const modalData:
      entity.TreasuryReversePaymentModalData = {
      payment,
      movement:
        currentMovement,
    };

    this.dialogService
      .open(
        ModalAccountsPayableReversePayment,
        modalData,
        'large',
      )
      .afterClosed()
      .subscribe(
        (
          result:
            | entity.TreasuryReversePaymentResponse
            | null,
        ) => {
          if (!result?.success) {
            return;
          }

          this.historyChanged.set(
            true,
          );

          this.loadHistory();
        },
      );
  }

  // =========================================================
  // LABELS DE ACCIONES
  // =========================================================

  getActionLabel(
    action:
      entity.TreasuryBankMovementHistoryAction,
  ): string {
    switch (action.action_type) {
      case 'payment_applied':
        return 'Pago aplicado';

      case 'payment_reversed':
        return 'Pago revertido';

      case 'manual_close':
        return 'Saldo cerrado manualmente';

      case 'manual_reopen':
      case 'manual_close_reopened':
      case 'reopen_manual_close':
        return 'Cierre manual reabierto';

      case 'classification_changed':
      case 'classification_change':
        return 'Clasificación actualizada';

      default:
        return this.humanizeText(
          action.action_type,
        );
    }
  }

  getActionIcon(
    action:
      entity.TreasuryBankMovementHistoryAction,
  ): string {
    switch (action.action_type) {
      case 'payment_applied':
        return 'payments';

      case 'payment_reversed':
        return 'undo';

      case 'manual_close':
        return 'lock';

      case 'manual_reopen':
      case 'manual_close_reopened':
      case 'reopen_manual_close':
        return 'lock_open';

      case 'classification_changed':
      case 'classification_change':
        return 'label';

      default:
        return 'history';
    }
  }

  getActionClass(
    action:
      entity.TreasuryBankMovementHistoryAction,
  ): string {
    switch (action.action_type) {
      case 'payment_applied':
        return 'history-event--success';

      case 'payment_reversed':
        return 'history-event--danger';

      case 'manual_close':
        return 'history-event--warning';

      case 'manual_reopen':
      case 'manual_close_reopened':
      case 'reopen_manual_close':
      case 'classification_changed':
      case 'classification_change':
        return 'history-event--info';

      default:
        return 'history-event--neutral';
    }
  }

  // =========================================================
  // LABELS DE PAGOS
  // =========================================================

  isClassificationChange(
    action:
      entity.TreasuryBankMovementHistoryAction,
  ): boolean {
    return (
      action.action_type ===
      'classification_changed' ||
      action.action_type ===
      'classification_change'
    );
  }

  getPreviousClassificationLabel(
    action:
      entity.TreasuryBankMovementHistoryAction,
  ): string {
    return this.getClassificationLabel(
      this.getActionMetadataString(
        action,
        'previous_classification',
      ),
    );
  }

  getNewClassificationLabel(
    action:
      entity.TreasuryBankMovementHistoryAction,
  ): string {
    return this.getClassificationLabel(
      this.getActionMetadataString(
        action,
        'new_classification',
      ),
    );
  }

  private getActionMetadataString(
    action:
      entity.TreasuryBankMovementHistoryAction,
    key: string,
  ): string | null {
    const metadata =
      action.metadata as
      | Record<string, unknown>
      | null
      | undefined;

    const value =
      metadata?.[key];

    if (
      typeof value !== 'string'
    ) {
      return null;
    }

    const normalized =
      value.trim();

    return normalized || null;
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

      case 'comision_bancaria':
        return 'Comisión bancaria';

      case 'iva_comision':
        return 'IVA de comisión';

      case 'transferencia_entrada':
        return 'Transferencia de entrada';

      default:
        return classification
          ? this.humanizeText(
            classification,
          )
          : 'Sin clasificación';
    }
  }

  getPaymentStatusLabel(
    status:
      | string
      | null
      | undefined,
  ): string {
    switch (status) {
      case 'active':
        return 'Activo';

      case 'reversed':
        return 'Revertido';

      case 'cancelled':
        return 'Cancelado';

      default:
        return status
          ? this.humanizeText(
            status,
          )
          : 'Sin estatus';
    }
  }

  getPaymentStatusClass(
    status:
      string | null | undefined,
  ): string {
    switch (status) {
      case 'active':
        return 'payment-status--success';

      case 'reversed':
      case 'cancelled':
        return 'payment-status--danger';

      default:
        return 'payment-status--neutral';
    }
  }

  // =========================================================
  // LABELS DE APLICACIONES
  // =========================================================

  getExpenseFolio(
    application:
      entity.TreasuryBankMovementHistoryApplication,
  ): string {
    return (
      application.expense
        ?.internal_folio ||
      `Gasto #${application.expense_id ??
      application.expense?.id ??
      '—'
      }`
    );
  }

  getExpenseConcept(
    application:
      entity.TreasuryBankMovementHistoryApplication,
  ): string {
    return (
      application.expense_item
        ?.concept
        ?.trim() ||
      'Sin concepto'
    );
  }

  getSupplierName(
    application:
      entity.TreasuryBankMovementHistoryApplication,
  ): string {
    return (
      application.supplier
        ?.display_name ||
      'Sin proveedor'
    );
  }

  getProjectName(
    application:
      entity.TreasuryBankMovementHistoryApplication,
  ): string {
    return (
      application.project
        ?.name
        ?.trim() ||
      'Sin proyecto'
    );
  }

  getUserName(
    user:
      | entity.TreasuryBankMovementHistoryUser
      | null
      | undefined,
  ): string {
    return (
      user?.name?.trim() ||
      'Sistema'
    );
  }

  getStatusLabel(
    status:
      | TreasuryBankMovementStatus
      | null
      | undefined,
  ): string {
    switch (status) {
      case 'unmatched':
        return 'Pendiente';

      case 'partially_matched':
        return 'Parcial';

      case 'matched':
        return 'Aplicado';

      case 'manually_closed':
        return 'Cerrado manualmente';

      default:
        return 'Sin estatus';
    }
  }

  // =========================================================
  // MODAL
  // =========================================================

  closeModal(): void {
    this.dialogRef.close(
      this.historyChanged(),
    );
  }

  // =========================================================
  // HELPERS
  // =========================================================

  private humanizeText(
    value:
      string | null | undefined,
  ): string {
    if (!value) {
      return 'Evento';
    }

    return value
      .split('_')
      .filter(Boolean)
      .map(
        (part) =>
          part
            .charAt(0)
            .toUpperCase() +
          part.slice(1),
      )
      .join(' ');
  }

  private getErrorMessage(
    error: unknown,
  ): string {
    const httpError =
      error as {
        error?: {
          message?:
          | string
          | string[];
        };

        message?: string;
      };

    const backendMessage =
      httpError?.error?.message;

    if (
      Array.isArray(
        backendMessage,
      )
    ) {
      return backendMessage
        .join(' ');
    }

    if (
      typeof backendMessage ===
      'string' &&
      backendMessage.trim()
    ) {
      return backendMessage;
    }

    return 'No se pudo consultar el historial del movimiento bancario.';
  }
}