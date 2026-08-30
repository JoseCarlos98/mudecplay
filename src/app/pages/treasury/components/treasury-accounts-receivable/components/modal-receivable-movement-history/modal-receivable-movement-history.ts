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
// UI
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
// CxC
// =========================================================

import * as entity
  from '../../interfaces/treasury-accounts-receivable.interfaces';

import {
  TreasuryAccountsReceivableService,
} from '../../services/treasury-accounts-receivable.service';


const HEADER_CONFIG:
  ModuleHeaderConfig = {
  modal: true,
};


@Component({
  selector:
    'app-modal-receivable-movement-history',

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
    './modal-receivable-movement-history.html',

  styleUrl:
    './modal-receivable-movement-history.scss',
})
export class ModalReceivableMovementHistory
  implements OnInit {

  // =========================================================
  // INYECCIONES
  // =========================================================

  readonly data =
    inject<
      entity.TreasuryReceivableBankMovementHistoryModalData
    >(
      MAT_DIALOG_DATA,
    );


  private readonly dialogRef =
    inject(
      MatDialogRef<
        ModalReceivableMovementHistory
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


  // =========================================================
  // UI
  // =========================================================

  readonly headerConfig =
    HEADER_CONFIG;


  readonly loading =
    signal(
      false,
    );


  // =========================================================
  // DATA
  // =========================================================

  historyResponse:
    entity.TreasuryReceivableBankMovementHistoryResponse |
    null =
    null;


  ngOnInit():
    void {

    this.loadHistory();
  }


  get movement():
    entity.TreasuryReceivableBankMovementHistoryMovement |
    null {

    return (
      this.historyResponse
        ?.bank_movement ??
      null
    );
  }


  get collections():
    entity.TreasuryReceivableBankMovementHistoryCollection[] {

    return (
      this.historyResponse
        ?.collections ??
      []
    );
  }


  get actions():
    entity.TreasuryReceivableBankMovementHistoryAction[] {

    return (
      this.historyResponse
        ?.movement_actions ??
      []
    );
  }


  get referenceDisplay():
    string {

    const movement =
      this.movement;


    if (!movement) {

      return (
        `Movimiento ${this.data.movement_id}`
      );
    }


    return (
      movement.tracking_key
        ?.trim() ||

      movement.bank_reference
        ?.trim() ||

      movement.receipt_number
        ?.trim() ||

      `Movimiento ${movement.id}`
    );
  }


  get accountDisplay():
    string {

    const account =
      this.movement
        ?.bank_account;


    if (!account) {

      return 'Sin cuenta';
    }


    const alias =
      account.alias
        ?.trim();


    const identifier =
      account.account_identifier
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


  // =========================================================
  // LABELS
  // =========================================================

  getMovementStatusLabel(
    status:
      entity.TreasuryAccountsReceivableBankMovementStatus,
  ): string {

    switch (status) {

      case 'unmatched':
        return 'Disponible';

      case 'partially_matched':
        return 'Parcial';

      case 'matched':
        return 'Conciliado';

      case 'manually_closed':
        return 'Cerrado manualmente';

      case 'cancelled':
        return 'Cancelado';

      default:
        return status;
    }
  }


  getCollectionStatusLabel(
    status:
      entity.TreasuryAccountsReceivableCollectionStatus,
  ): string {

    switch (status) {

      case 'active':
        return 'Activo';

      case 'reversed':
        return 'Revertido';

      default:
        return status;
    }
  }


  getActionLabel(
    action:
      entity.TreasuryReceivableBankMovementHistoryAction,
  ): string {

    switch (
      action.action_type
    ) {

      case 'manual_close':
        return 'Cierre manual';

      case 'manual_reopen':
        return 'Reapertura manual';

      case 'classification_change':
        return 'Cambio de clasificación';

      default:
        return action.action_type;
    }
  }


  getOriginLabel(
    origin:
      entity.TreasuryAccountsReceivableCollectionOrigin,
  ): string {

    return (
      origin ===
        'historical_migration'
        ? 'Migración histórica'
        : 'Nuevo'
    );
  }


  // =========================================================
  // LOAD
  // =========================================================

  private loadHistory():
    void {

    const movementId =
      String(
        this.data
          .movement_id ??
        '',
      ).trim();


    if (!movementId) {

      return;
    }


    this.loading.set(
      true,
    );


    this.accountsReceivableService
      .getBankMovementHistory(
        movementId,
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
            entity.TreasuryReceivableBankMovementHistoryResponse,
        ) => {

          this.historyResponse =
            response;
        },


        error: (
          error:
            unknown,
        ) => {

          console.error(
            'Error cargando historial bancario CxC:',
            error,
          );


          this.dialogService
            .confirm({

              title:
                'No se pudo cargar el historial',

              message:
                'No fue posible consultar el historial CxC del movimiento bancario.',

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

    this.dialogRef.close();
  }
}