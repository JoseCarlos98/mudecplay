import {
  CommonModule,
} from '@angular/common';

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
import { PermissionsService } from '../../../../../../auth/services/permissions.service';
import { ModalReverseCollection, ReverseCollectionDialogData } from '../modal-reverse-collection/modal-reverse-collection';


// =========================================================
// CONFIGURACIÓN
// =========================================================

const HEADER_CONFIG:
  ModuleHeaderConfig = {
  modal: true,
};


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


  // =======================================================
  // CICLO DE VIDA
  // =======================================================

  ngOnInit(): void {

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


  // =======================================================
  // HISTORIAL
  // =======================================================

  getApplicationStatusLabel(
    item:
      entity.TreasuryReceivableHistoryApplication,
  ): string {

    return item
      .application_status ===
      'reversed'
      ? 'Revertido'
      : 'Activo';
  }


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


    return (
      account.alias ||
      account.account_identifier ||
      'Sin cuenta'
    );
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


  closeModal(): void {

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
        },


        error: (
          error:
            unknown,
        ) => {

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


    const modalData: ReverseCollectionDialogData = {

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