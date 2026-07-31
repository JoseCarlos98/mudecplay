import { CommonModule } from '@angular/common';

import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';

import {
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';

import {
  MatIconModule,
} from '@angular/material/icon';

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
import { ModalReversePayment } from '../modal-reverse-payment/modal-reverse-payment';
import { PermissionsService } from '../../../../../../auth/services/permissions.service';

// =========================================================
// CONFIGURACIÓN
// =========================================================

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

@Component({
  selector:
    'app-modal-expense-item-payment-history',

  standalone: true,

  imports: [
    CommonModule,

    MatIconModule,

    ModuleHeader,
    BtnsSection,
    LoadingOverlay,
  ],

  templateUrl:
    './modal-expense-item-payment-history.html',

  styleUrl:
    './modal-expense-item-payment-history.scss',
})
export class ModalExpenseItemPaymentHistory
  implements OnInit {

  // =========================================================
  // INYECCIONES
  // =========================================================
  private readonly permissionsService =
  inject(
    PermissionsService,
  );

  readonly data =
    inject<
      entity.TreasuryExpenseItemPaymentHistoryModalData
    >(MAT_DIALOG_DATA);

  private readonly dialogRef =
    inject(
      MatDialogRef<
        ModalExpenseItemPaymentHistory,
        boolean
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

  private historyChanged =
    false;

  // =========================================================
  // DATA
  // =========================================================

  historyResponse:
    entity.TreasuryExpenseItemPaymentHistoryResponse | null =
    null;

  history:
    entity.TreasuryExpenseItemPaymentHistoryEvent[] =
    [];

  // =========================================================
  // CICLO DE VIDA
  // =========================================================

  ngOnInit(): void {
    this.loadHistory();
  }

  // =========================================================
  // DATOS DEL CONCEPTO
  // =========================================================

  get row():
    entity.TreasuryPendingExpenseItemTableRow {
    return this.data.expenseItem;
  }

  get expenseItem():
    entity.TreasuryExpenseItemPaymentHistoryExpenseItem
    | null {
    return (
      this.historyResponse
        ?.expense_item ??
      null
    );
  }

  get internalFolio(): string {
    return (
      this.expenseItem
        ?.internal_folio ||
      this.row.internal_folio ||
      'Sin folio'
    );
  }

  get concept(): string {
    return (
      this.expenseItem
        ?.concept ||
      this.row.concept ||
      'Sin concepto'
    );
  }

  get supplierName(): string {
    return (
      this.expenseItem
        ?.supplier
        ?.display_name ||
      this.row
        .supplier_display_name ||
      this.row
        .supplier
        ?.display_name ||
      'Sin proveedor'
    );
  }

  get projectName(): string {
    return (
      this.expenseItem
        ?.project
        ?.name ||
      this.row
        .project_name ||
      this.row
        .project
        ?.name ||
      'Sin proyecto'
    );
  }

  get originalAmount(): number {
    return Number(
      this.historyResponse
        ?.summary
        ?.original_amount ??
      this.expenseItem
        ?.amount ??
      this.row.amount ??
      0,
    );
  }

  get paidAmount(): number {
    return Number(
      this.historyResponse
        ?.summary
        ?.paid_amount ??
      this.expenseItem
        ?.paid_amount ??
      this.row.paid_amount ??
      0,
    );
  }

  get pendingAmount(): number {
    return Number(
      this.historyResponse
        ?.summary
        ?.pending_amount ??
      this.expenseItem
        ?.pending_amount ??
      this.row.pending_amount ??
      0,
    );
  }

  get paymentStatus(): string {
    return (
      this.expenseItem
        ?.payment_status ||
      this.row.payment_status ||
      'unpaid'
    );
  }

  get paymentStatusLabel(): string {
    switch (
    this.paymentStatus
    ) {
      case 'paid':
        return 'Pagado';

      case 'partial':
        return 'Pago parcial';

      case 'unpaid':
      default:
        return 'Pendiente';
    }
  }

  get paymentStatusClass(): string {
    switch (
    this.paymentStatus
    ) {
      case 'paid':
        return 'concept-status--paid';

      case 'partial':
        return 'concept-status--partial';

      case 'unpaid':
      default:
        return 'concept-status--pending';
    }
  }

  get itemTypeLabel(): string {
    return (
      this.expenseItem
        ?.item_type ??
      this.row.item_type
    ) === 'warehouse'
      ? 'Almacén'
      : 'Directo';
  }

  get applicationsCount(): number {
    return Number(
      this.historyResponse
        ?.summary
        ?.applications_count ??
      0,
    );
  }

  get activeApplicationsCount(): number {
    return Number(
      this.historyResponse
        ?.summary
        ?.active_applications_count ??
      0,
    );
  }

  get reversedApplicationsCount(): number {
    return Number(
      this.historyResponse
        ?.summary
        ?.reversed_applications_count ??
      0,
    );
  }

  // =========================================================
  // EVENTOS
  // =========================================================

  getEventTitle(
    event:
      entity.TreasuryExpenseItemPaymentHistoryEvent,
  ): string {
    return event.action_type ===
      'payment_reversed'
      ? 'Pago revertido'
      : 'Pago aplicado';
  }

  getEventIcon(
    event:
      entity.TreasuryExpenseItemPaymentHistoryEvent,
  ): string {
    return event.action_type ===
      'payment_reversed'
      ? 'undo'
      : 'payments';
  }

  getEventClass(
    event:
      entity.TreasuryExpenseItemPaymentHistoryEvent,
  ): string {
    return event.action_type ===
      'payment_reversed'
      ? 'payment-event--reversed'
      : 'payment-event--applied';
  }

  getEventStatusLabel(
    event:
      entity.TreasuryExpenseItemPaymentHistoryEvent,
  ): string {
    if (
      event.action_type ===
      'payment_reversed'
    ) {
      return 'Revertido';
    }

    const wasLaterReversed =
      event.application.status ===
      'reversed' ||
      event.payment.status ===
      'reversed';

    return wasLaterReversed
      ? 'Revertido posteriormente'
      : 'Activo';
  }

  getEventStatusClass(
    event:
      entity.TreasuryExpenseItemPaymentHistoryEvent,
  ): string {
    if (
      event.action_type ===
      'payment_reversed' ||
      event.application.status ===
      'reversed' ||
      event.payment.status ===
      'reversed'
    ) {
      return 'event-status--reversed';
    }

    return 'event-status--active';
  }

  getPaymentMethodLabel(
    payment:
      entity.TreasuryExpenseItemPaymentHistoryPayment,
  ): string {
    switch (
    payment.payment_method
    ) {
      case 'transfer':
        return 'Transferencia';

      case 'cash':
        return 'Efectivo';

      case 'unknown':
      default:
        return 'Sin identificar';
    }
  }

  getCompanyName(
    event:
      entity.TreasuryExpenseItemPaymentHistoryEvent,
  ): string {
    return (
      event.payment
        .company
        ?.name ||
      'Empresa no identificada'
    );
  }

  getMovementReference(
    event:
      entity.TreasuryExpenseItemPaymentHistoryEvent,
  ): string {
    return (
      event.payment
        .bank_movement
        ?.bank_reference ||
      event.payment
        .reference ||
      'Sin referencia'
    );
  }

  getMovementDisplay(
    event:
      entity.TreasuryExpenseItemPaymentHistoryEvent,
  ): string {
    const movement =
      event.payment
        .bank_movement;

    if (!movement) {
      return 'Sin movimiento';
    }

    return (
      `Movimiento ${movement.id} · ` +
      this.getMovementReference(
        event,
      )
    );
  }

  getBankName(
    event:
      entity.TreasuryExpenseItemPaymentHistoryEvent,
  ): string {
    return (
      event.payment
        .bank_movement
        ?.bank
        ?.name ||
      'Sin banco'
    );
  }

  getBankAccountDisplay(
    event:
      entity.TreasuryExpenseItemPaymentHistoryEvent,
  ): string {
    const account =
      event.payment
        .bank_movement
        ?.bank_account;

    if (!account) {
      return 'Sin cuenta';
    }

    const alias =
      account.alias?.trim();

    const identifier =
      account
        .account_identifier
        ?.trim();

    if (
      alias &&
      identifier
    ) {
      return (
        `${alias} · ${identifier}`
      );
    }

    return (
      alias ||
      identifier ||
      'Sin cuenta'
    );
  }

  getEventUserId(
    event:
      entity.TreasuryExpenseItemPaymentHistoryEvent,
  ): number | null {
    if (
      event.action_type ===
      'payment_reversed'
    ) {
      return (
        event.application
          .reversed_by_user_id ??
        event.payment
          .reversed_by_user_id ??
        null
      );
    }

    return (
      event.application
        .created_by_user_id ??
      event.payment
        .created_by_user_id ??
      null
    );
  }

  getEventReason(
    event:
      entity.TreasuryExpenseItemPaymentHistoryEvent,
  ): string | null {
    if (
      event.action_type ===
      'payment_reversed'
    ) {
      return (
        event.application
          .reversal_reason ||
        event.payment
          .reversal_reason ||
        null
      );
    }

    return (
      event.payment.notes ||
      null
    );
  }


  // =========================================================
  // REVERSIÓN
  // =========================================================

  openReversePayment(
    event:
      entity.TreasuryExpenseItemPaymentHistoryEvent,
  ): void {
    if (
      !this.canReverseEvent(
        event,
      ) ||
      !this.expenseItem
    ) {
      return;
    }

    const movement =
      event.payment
        .bank_movement;

    const modalData:
      entity.TreasuryCurrentPaymentReverseModalData = {
      payment: {
        id:
          String(
            event.payment.id,
          ),

        amount:
          Number(
            event.payment.amount ??
            0,
          ),

        payment_date:
          event.payment
            .payment_date ??
          null,

        payment_method:
          event.payment
            .payment_method,

        source_type:
          event.payment
            .source_type,

        origin:
          event.payment.origin,

        status:
          event.payment.status,

        reference:
          event.payment
            .reference ??
          null,

        notes:
          event.payment
            .notes ??
          null,

        company:
          event.payment.company
            ? {
              id:
                event.payment
                  .company
                  .id ??
                null,

              code:
                event.payment
                  .company
                  .code ??
                null,

              name:
                event.payment
                  .company
                  .name,
            }
            : null,

        bank_movement:
          movement
            ? {
              id:
                String(
                  movement.id,
                ),

              movement_date:
                movement
                  .movement_date ??
                null,

              amount:
                Number(
                  movement.amount ??
                  0,
                ),

              available_amount:
                Number(
                  movement
                    .available_amount ??
                  0,
                ),

              status:
                movement.status,

              bank_reference:
                movement
                  .bank_reference ??
                null,

              description:
                movement
                  .description ??
                null,

              bank:
                movement.bank
                  ? {
                    id:
                      movement
                        .bank.id,

                    code:
                      movement
                        .bank.code,

                    name:
                      movement
                        .bank.name,
                  }
                  : null,

              bank_account:
                movement
                  .bank_account
                  ? {
                    id:
                      movement
                        .bank_account
                        .id,

                    alias:
                      movement
                        .bank_account
                        .alias ??
                      null,

                    account_identifier:
                      movement
                        .bank_account
                        .account_identifier,
                  }
                  : null,
            }
            : null,
      },

      application: {
        id:
          String(
            event.application.id,
          ),

        applied_amount:
          Number(
            event.application
              .applied_amount ??
            0,
          ),

        status:
          event.application
            .status,
      },

      expense_item: {
        id:
          this.expenseItem.id,

        internal_folio:
          this.internalFolio,

        concept:
          this.concept,

        amount:
          this.originalAmount,

        paid_amount:
          this.paidAmount,

        pending_amount:
          this.pendingAmount,
      },
    };

    this.dialogService
      .open(
        ModalReversePayment,
        modalData,
        'medium',
      )
      .afterClosed()
      .subscribe(
        (
          result:
            | entity.TreasuryReversePaymentResponse
            | null,
        ) => {
          if (
            !result?.success
          ) {
            return;
          }

          /*
           * Mantiene abierto este historial,
           * pero vuelve a consultar sus datos.
           */
          this.historyChanged =
            true;

          this.loadHistory();
        },
      );
  }

  // =========================================================
  // REVERSIÓN
  // =========================================================

canReverseEvent(
  event:
    entity.TreasuryExpenseItemPaymentHistoryEvent,
): boolean {
  return (
    this.permissionsService.isAdmin() &&

    event.action_type ===
      'payment_applied' &&

    event.payment.origin ===
      'new' &&

    event.payment.status ===
      'active' &&

    event.application.status ===
      'active'
  );
}

  // =========================================================
  // ACCIONES
  // =========================================================

  onFooterAction(
    action: ModuleFooterAction,
  ): void {
    if (
      action === 'close'
    ) {
      this.closeModal();
    }
  }

  closeModal(): void {
    this.dialogRef.close(
      this.historyChanged,
    );
  }

  // =========================================================
  // CARGA
  // =========================================================

  private loadHistory(): void {
    const expenseItemId =
      this.row
        ?.expense_item_id;

    if (!expenseItemId) {
      return;
    }

    this.loading.set(
      true,
    );

    this.accountsPayableService
      .getExpenseItemPaymentHistory(
        expenseItemId,
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(() => {
          this.loading.set(
            false,
          );
        }),
      )
      .subscribe({
        next: (
          response:
            entity.TreasuryExpenseItemPaymentHistoryResponse,
        ) => {
          this.historyResponse =
            response;

          this.history =
            response.history ??
            [];
        },

        error: (
          error: unknown,
        ) => {
          console.error(
            'Error al cargar el historial del concepto:',
            error,
          );

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
  // HELPERS
  // =========================================================

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
      httpError
        ?.error
        ?.message;

    if (
      Array.isArray(
        backendMessage,
      )
    ) {
      return backendMessage.join(
        ' ',
      );
    }

    if (
      typeof backendMessage ===
      'string' &&
      backendMessage.trim()
    ) {
      return backendMessage;
    }

    if (
      typeof httpError
        ?.message ===
      'string' &&
      httpError.message.trim()
    ) {
      return httpError.message;
    }

    return 'No fue posible consultar el historial de pagos del concepto.';
  }
}