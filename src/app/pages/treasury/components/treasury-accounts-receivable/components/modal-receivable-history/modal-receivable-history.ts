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


// =========================================================
// UI COMPARTIDA
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
  LoadingOverlay,
} from '../../../../../../shared/ui/loading-overlay/loading-overlay';

import {
  DialogService,
} from '../../../../../../shared/services/dialog.service';


// =========================================================
// MÓDULO
// =========================================================

import * as entity
  from '../../interfaces/treasury-accounts-receivable.interfaces';

import {
  TreasuryAccountsReceivableService,
} from '../../services/treasury-accounts-receivable.service';

import {
  PermissionsService,
} from '../../../../../../auth/services/permissions.service';

import {
  ModalReverseCollection,
  ReverseCollectionDialogData,
} from '../modal-reverse-collection/modal-reverse-collection';


// =========================================================
// CONFIGURACIÓN
// =========================================================

const HEADER_CONFIG:
  ModuleHeaderConfig = {
    modal: true,
  };


type ReceivableHistoryEventType =
  | 'collection_applied'
  | 'collection_reversed';


interface ReceivableHistoryTimelineEvent {
  event_id:
    string;

  action_type:
    ReceivableHistoryEventType;

  event_at:
    string;

  amount:
    number;

  previous_pending_amount:
    number;

  new_pending_amount:
    number;

  item:
    entity.TreasuryReceivableHistoryApplication;
}


interface ReceivableHistoryRawEvent {
  event_id:
    string;

  action_type:
    ReceivableHistoryEventType;

  event_at:
    string;

  amount_cents:
    number;

  item:
    entity.TreasuryReceivableHistoryApplication;
}


@Component({
  selector:
    'app-modal-receivable-history',

  standalone:
    true,

  imports: [
    CommonModule,
    MatIconModule,

    ModuleHeader,
    BtnsSection,
    LoadingOverlay,
  ],

  templateUrl:
    './modal-receivable-history.html',

  styleUrl:
    './modal-receivable-history.scss',
})
export class ModalReceivableHistory
  implements OnInit {

  // =======================================================
  // INYECCIONES
  // =======================================================

  readonly data =
    inject<
      entity.TreasuryReceivableHistoryModalData
    >(
      MAT_DIALOG_DATA,
    );


  private readonly permissionsService =
    inject(
      PermissionsService,
    );


  private readonly dialogRef =
    inject(
      MatDialogRef<
        ModalReceivableHistory,
        boolean
      >,
    );


  private readonly accountsReceivableService =
    inject(
      TreasuryAccountsReceivableService,
    );


  private readonly dialogService =
    inject(
      DialogService,
    );


  private readonly destroyRef =
    inject(
      DestroyRef,
    );


  // =======================================================
  // UI
  // =======================================================

  readonly historyChanged =
    signal(
      false,
    );


  readonly headerConfig =
    HEADER_CONFIG;


  readonly loading =
    signal(
      false,
    );


  // =======================================================
  // DATA
  // =======================================================

  historyResponse:
    entity.TreasuryReceivableCollectionHistoryResponse |
    null =
    null;


  timelineEvents:
    ReceivableHistoryTimelineEvent[] =
    [];


  // =======================================================
  // CICLO DE VIDA
  // =======================================================

  ngOnInit():
    void {

    this.loadHistory();
  }


  // =======================================================
  // CxC
  // =======================================================

  get row():
    entity.TreasuryPendingReceivable {

    return this.data.receivable;
  }


  get receivable():
    entity.TreasuryReceivableHistoryReceivable |
    null {

    return (
      this.historyResponse
        ?.receivable ??
      null
    );
  }


  get balance():
    entity.TreasuryReceivableHistoryBalance |
    null {

    return (
      this.historyResponse
        ?.balance ??
      null
    );
  }


  get history():
    entity.TreasuryReceivableHistoryApplication[] {

    return (
      this.historyResponse
        ?.history ??
      []
    );
  }


  // =======================================================
  // RESUMEN
  // =======================================================

  get invoiceDisplay():
    string {

    const series =
      this.receivable
        ?.series ??
      this.row.series;


    const folio =
      this.receivable
        ?.folio ??
      this.row.folio;


    return series
      ? `${series}-${folio}`
      : folio;
  }


  get clientName():
    string {

    return (
      this.receivable
        ?.receiver_name ||
      this.row.receiver_name ||
      'Sin cliente'
    );
  }


  get clientRfc():
    string {

    return (
      this.receivable
        ?.receiver_rfc ||
      this.row.receiver_rfc ||
      'Sin RFC'
    );
  }


  get projectName():
    string {

    return (
      this.receivable
        ?.project
        ?.name ||
      this.row
        .project
        ?.name ||
      'Sin proyecto'
    );
  }


  get totalAmount():
    number {

    return Number(
      this.receivable
        ?.total ??
      this.row.total ??
      0,
    );
  }


  get collectedAmount():
    number {

    return Number(
      this.balance
        ?.collected_amount ??
      this.row
        .collected_amount ??
      0,
    );
  }


  get pendingAmount():
    number {

    return Number(
      this.balance
        ?.pending_amount ??
      this.row
        .pending_amount ??
      0,
    );
  }


  get financialStatus():
    entity.TreasuryAccountsReceivableFinancialStatus {

    return (
      this.balance
        ?.status ??
      this.row.status
    );
  }


  get financialStatusLabel():
    string {

    switch (
      this.financialStatus
    ) {

      case 'collected':
        return 'Cobrado';


      case 'partial':
        return 'Cobro parcial';


      case 'pending':
      default:
        return 'Pendiente';
    }
  }


  get financialStatusClass():
    string {

    switch (
      this.financialStatus
    ) {

      case 'collected':
        return 'receivable-status--collected';


      case 'partial':
        return 'receivable-status--partial';


      case 'pending':
      default:
        return 'receivable-status--pending';
    }
  }


  get financialSourceLabel():
    string {

    const source =
      this.balance
        ?.financial_source ??
      this.row
        .financial_source;


    return source ===
      'treasury'
      ? 'Tesorería'
      : 'Legacy';
  }


  get applicationsCount():
    number {

    return this.history.length;
  }


  get activeApplicationsCount():
    number {

    return this.history
      .filter(
        (
          item,
        ) =>
          item.application_status ===
          'active',
      )
      .length;
  }


  get reversedApplicationsCount():
    number {

    return this.history
      .filter(
        (
          item,
        ) =>
          item.application_status ===
          'reversed',
      )
      .length;
  }


  // =======================================================
  // EVENTOS
  // =======================================================

  getEventTitle(
    event:
      ReceivableHistoryTimelineEvent,
  ): string {

    return event.action_type ===
      'collection_reversed'
      ? 'Cobro revertido'
      : 'Cobro aplicado';
  }


  getEventIcon(
    event:
      ReceivableHistoryTimelineEvent,
  ): string {

    return event.action_type ===
      'collection_reversed'
      ? 'undo'
      : 'payments';
  }


  getEventClass(
    event:
      ReceivableHistoryTimelineEvent,
  ): string {

    return event.action_type ===
      'collection_reversed'
      ? 'collection-event--reversed'
      : 'collection-event--applied';
  }


  getEventStatusLabel(
    event:
      ReceivableHistoryTimelineEvent,
  ): string {

    if (
      event.action_type ===
      'collection_reversed'
    ) {

      return 'Revertido';
    }


    return event.item
      .application_status ===
      'reversed'
      ? 'Revertido posteriormente'
      : 'Activo';
  }


  getEventStatusClass(
    event:
      ReceivableHistoryTimelineEvent,
  ): string {

    if (
      event.action_type ===
        'collection_reversed' ||

      event.item
        .application_status ===
        'reversed'
    ) {

      return 'event-status--reversed';
    }


    return 'event-status--active';
  }


  getEventOriginLabel(
    event:
      ReceivableHistoryTimelineEvent,
  ): string {

    return this.getOriginLabel(
      event.item
        .collection
        .origin,
    );
  }


  getEventReason(
    event:
      ReceivableHistoryTimelineEvent,
  ): string |
    null {

    if (
      event.action_type ===
      'collection_reversed'
    ) {

      return this.getReversalReason(
        event.item,
      );
    }


    return this.getNotes(
      event.item,
    );
  }


  canReverseEvent(
    event:
      ReceivableHistoryTimelineEvent,
  ): boolean {

    return (
      event.action_type ===
        'collection_applied' &&

      this.canReverseCollection(
        event.item,
      )
    );
  }


  // =======================================================
  // DATOS DE COBRO
  // =======================================================

  getReference(
    item:
      entity.TreasuryReceivableHistoryApplication,
  ): string {

    return (
      item
        .bank_movement
        .bank_reference ||
      'Sin referencia'
    );
  }


  getBankName(
    item:
      entity.TreasuryReceivableHistoryApplication,
  ): string {

    return (
      item
        .bank_movement
        .bank
        ?.name ||
      'Sin banco'
    );
  }


  getBankAccountDisplay(
    item:
      entity.TreasuryReceivableHistoryApplication,
  ): string {

    const account =
      item
        .bank_movement
        .bank_account;


    if (!account) {

      return 'Sin cuenta';
    }


    const alias =
      account.alias
        ?.trim();


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


  getCompanyName(
    item:
      entity.TreasuryReceivableHistoryApplication,
  ): string {

    return (
      item
        .bank_movement
        .company
        ?.name ||
      'Empresa no identificada'
    );
  }


  getMovementDisplay(
    item:
      entity.TreasuryReceivableHistoryApplication,
  ): string {

    return (
      `Movimiento ${item.bank_movement.id} · ` +
      this.getReference(
        item,
      )
    );
  }


  getOriginLabel(
    origin:
      entity.TreasuryAccountsReceivableCollectionOrigin,
  ): string {

    return origin ===
      'historical_migration'
      ? 'Migración histórica'
      : 'Nuevo';
  }


  getNotes(
    item:
      entity.TreasuryReceivableHistoryApplication,
  ): string |
    null {

    return (
      item.collection.notes ??
      null
    );
  }


  getReversalReason(
    item:
      entity.TreasuryReceivableHistoryApplication,
  ): string |
    null {

    return (
      item
        .application_reversal_reason ||

      item
        .collection
        .reversal_reason ||

      null
    );
  }


  // =======================================================
  // TIMELINE
  // =======================================================

  private buildTimeline():
    ReceivableHistoryTimelineEvent[] {

    const rawEvents:
      ReceivableHistoryRawEvent[] =
      [];


    for (
      const item
      of this.history
    ) {

      const amountCents =
        this.moneyToCents(
          item.applied_amount,
        );


      rawEvents.push({
        event_id:
          `application-${item.application_id}-applied`,

        action_type:
          'collection_applied',

        event_at:
          item.application_created_at ||
          item.collection.created_at ||
          item.collection.collection_date,

        amount_cents:
          amountCents,

        item,
      });


      if (
        item.application_status ===
        'reversed'
      ) {

        rawEvents.push({
          event_id:
            `application-${item.application_id}-reversed`,

          action_type:
            'collection_reversed',

          event_at:
            item.application_reversed_at ||
            item.collection.reversed_at ||
            item.collection.created_at ||
            item.application_created_at ||
            item.collection.collection_date,

          amount_cents:
            amountCents,

          item,
        });
      }
    }


    rawEvents.sort(
      (
        left,
        right,
      ) => {

        const dateDifference =
          this.getTimestamp(
            left.event_at,
          ) -
          this.getTimestamp(
            right.event_at,
          );


        if (
          dateDifference !==
          0
        ) {

          return dateDifference;
        }


        if (
          left.action_type !==
          right.action_type
        ) {

          return left.action_type ===
            'collection_applied'
            ? -1
            : 1;
        }


        return left.event_id
          .localeCompare(
            right.event_id,
          );
      },
    );


    const totalCents =
      this.moneyToCents(
        this.totalAmount,
      );


    let pendingCents =
      totalCents;


    const calculated =
      rawEvents.map(
        (
          event,
        ):
          ReceivableHistoryTimelineEvent => {

          const previousPendingCents =
            pendingCents;


          if (
            event.action_type ===
            'collection_reversed'
          ) {

            pendingCents =
              Math.min(
                totalCents,
                pendingCents +
                event.amount_cents,
              );

          } else {

            pendingCents =
              Math.max(
                0,
                pendingCents -
                event.amount_cents,
              );
          }


          return {
            event_id:
              event.event_id,

            action_type:
              event.action_type,

            event_at:
              event.event_at,

            amount:
              event.amount_cents /
              100,

            previous_pending_amount:
              previousPendingCents /
              100,

            new_pending_amount:
              pendingCents /
              100,

            item:
              event.item,
          };
        },
      );


    return calculated
      .sort(
        (
          left,
          right,
        ) => {

          const dateDifference =
            this.getTimestamp(
              right.event_at,
            ) -
            this.getTimestamp(
              left.event_at,
            );


          if (
            dateDifference !==
            0
          ) {

            return dateDifference;
          }


          return right.event_id
            .localeCompare(
              left.event_id,
            );
        },
      );
  }


  private getTimestamp(
    value:
      string |
      null |
      undefined,
  ): number {

    if (!value) {

      return 0;
    }


    const timestamp =
      Date.parse(
        value,
      );


    return Number.isFinite(
      timestamp,
    )
      ? timestamp
      : 0;
  }


  private moneyToCents(
    value:
      unknown,
  ): number {

    const amount =
      Number(
        value ??
        0,
      );


    if (
      !Number.isFinite(
        amount,
      )
    ) {

      return 0;
    }


    return Math.round(
      (
        amount +
        Number.EPSILON
      ) *
      100,
    );
  }


  // =======================================================
  // ACCIONES
  // =======================================================

  onFooterAction(
    action:
      ModuleFooterAction,
  ): void {

    if (
      action ===
      'close'
    ) {

      this.closeModal();
    }
  }


  closeModal():
    void {

    this.dialogRef.close(
      this.historyChanged(),
    );
  }


  // =======================================================
  // CARGA
  // =======================================================

  private loadHistory():
    void {

    const receivableId =
      Number(
        this.row
          ?.id ??
        0,
      );


    if (
      !Number.isInteger(
        receivableId,
      ) ||
      receivableId <= 0
    ) {

      return;
    }


    this.loading.set(
      true,
    );


    this
      .accountsReceivableService
      .getReceivableCollectionHistory(
        receivableId,
      )
      .pipe(

        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(
          () => {

            this.loading.set(
              false,
            );
          },
        ),
      )
      .subscribe({

        next: (
          response:
            entity.TreasuryReceivableCollectionHistoryResponse,
        ) => {

          this.historyResponse =
            response;


          this.timelineEvents =
            this.buildTimeline();
        },


        error: (
          error:
            unknown,
        ) => {

          this.historyResponse =
            null;


          this.timelineEvents =
            [];


          console.error(
            'Error al cargar el historial de la cuenta por cobrar:',
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


  // =======================================================
  // ERROR
  // =======================================================

  private getErrorMessage(
    error:
      unknown,
  ): string {

    const httpError =
      error as {
        error?: {
          message?:
          | string
          | string[];
        };
        message?:
        string;
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

      return (
        backendMessage
          .filter(
            Boolean,
          )
          .join(
            ' ',
          ) ||
        'Ocurrió un error al consultar el historial.'
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


    return (
      'Ocurrió un error al consultar el historial.'
    );
  }


  // =======================================================
  // REVERSA
  // =======================================================

  canReverseCollection(
    item:
      entity.TreasuryReceivableHistoryApplication,
  ): boolean {

    return (
      this.permissionsService.isAdmin() &&

      item.application_status ===
      'active' &&

      item.collection.status ===
      'active' &&

      Boolean(
        item.collection.id,
      ) &&

      Number(
        item.applied_amount ??
        0,
      ) > 0
    );
  }


  openReverseCollection(
    item:
      entity.TreasuryReceivableHistoryApplication,
  ): void {

    const receivable =
      this.receivable;


    if (
      !receivable ||
      !this.canReverseCollection(
        item,
      )
    ) {

      return;
    }


    const modalData:
      ReverseCollectionDialogData = {

        receivable,

        item,
      };


    this.dialogService
      .open(
        ModalReverseCollection,
        modalData,
        'medium',
      )
      .afterClosed()
      .subscribe(
        (
          response:
            | entity.TreasuryReverseCollectionResponse
            | null,
        ) => {

          if (
            !response?.success
          ) {

            return;
          }


          this.historyChanged.set(
            true,
          );


          this.loadHistory();
        },
      );
  }
}