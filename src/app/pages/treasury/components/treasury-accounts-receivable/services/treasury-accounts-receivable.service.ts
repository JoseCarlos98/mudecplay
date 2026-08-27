import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';

import {
  inject,
  Injectable,
} from '@angular/core';

import {
  Observable,
} from 'rxjs';

import {
  environment,
} from '../../../../../../environments/environment';

import * as entity
  from '../interfaces/treasury-accounts-receivable.interfaces';


@Injectable({
  providedIn: 'root',
})
export class TreasuryAccountsReceivableService {

  private readonly apiUrl =
    `${environment.apiUrl}/treasury/accounts-receivable`;

  private readonly treasuryApiUrl =
    `${environment.apiUrl}/treasury`;

  private readonly http =
    inject(HttpClient);


  // =========================================================
  // CUENTAS POR COBRAR:
  // ENTRADAS BANCARIAS DISPONIBLES
  // =========================================================

  getAvailableInflows(
    filters?:
      entity.TreasuryAvailableInflowFilters,
  ): Observable<
    entity.TreasuryAvailableInflowsResponse
  > {

    let params =
      new HttpParams();

    if (filters) {

      params =
        params.set(
          'page',
          String(
            filters.page,
          ),
        );

      params =
        params.set(
          'limit',
          String(
            filters.limit,
          ),
        );


      if (
        filters.search?.trim()
      ) {

        params =
          params.set(
            'search',
            filters.search.trim(),
          );
      }


      if (
        filters.company_id !==
        undefined &&
        filters.company_id !==
        null
      ) {

        params =
          params.set(
            'company_id',
            String(
              filters.company_id,
            ),
          );
      }


      if (
        filters.bank_id !==
        undefined &&
        filters.bank_id !==
        null
      ) {

        params =
          params.set(
            'bank_id',
            String(
              filters.bank_id,
            ),
          );
      }


      if (
        filters.bank_account_id !==
        undefined &&
        filters.bank_account_id !==
        null
      ) {

        params =
          params.set(
            'bank_account_id',
            String(
              filters.bank_account_id,
            ),
          );
      }


      if (
        filters.date_from?.trim()
      ) {

        params =
          params.set(
            'date_from',
            filters.date_from.trim(),
          );
      }


      if (
        filters.date_to?.trim()
      ) {

        params =
          params.set(
            'date_to',
            filters.date_to.trim(),
          );
      }
    }


    return this.http.get<
      entity.TreasuryAvailableInflowsResponse
    >(
      `${this.apiUrl}/available-inflows`,
      {
        params,
      },
    );
  }


  // =========================================================
  // CUENTAS POR COBRAR:
  // OBLIGACIONES CON SALDO PENDIENTE
  // =========================================================

  getPendingReceivables(
    filters?:
      entity.TreasuryPendingReceivableFilters,
  ): Observable<
    entity.TreasuryPendingReceivablesResponse
  > {

    let params =
      new HttpParams();

    if (filters) {

      params =
        params.set(
          'page',
          String(
            filters.page,
          ),
        );

      params =
        params.set(
          'limit',
          String(
            filters.limit,
          ),
        );


      if (
        filters.search?.trim()
      ) {

        params =
          params.set(
            'search',
            filters.search.trim(),
          );
      }


      if (
        filters.project_id !==
        undefined &&
        filters.project_id !==
        null
      ) {

        params =
          params.set(
            'project_id',
            String(
              filters.project_id,
            ),
          );
      }


      if (
        filters.company_code
          ?.trim()
      ) {

        params =
          params.set(
            'company_code',
            filters.company_code.trim(),
          );
      }


      if (
        filters.date_from
          ?.trim()
      ) {

        params =
          params.set(
            'date_from',
            filters.date_from.trim(),
          );
      }


      if (
        filters.date_to
          ?.trim()
      ) {

        params =
          params.set(
            'date_to',
            filters.date_to.trim(),
          );
      }
    }


    return this.http.get<
      entity.TreasuryPendingReceivablesResponse
    >(
      `${this.apiUrl}/pending-receivables`,
      {
        params,
      },
    );
  }


  // =========================================================
  // CUENTAS POR COBRAR:
  // APLICAR MOVIMIENTO BANCARIO
  // =========================================================

  applyBankMovement(
    payload:
      entity.TreasuryApplyBankMovementReceivablePayload,
  ): Observable<
    entity.TreasuryApplyBankMovementReceivableResponse
  > {

    return this.http.post<
      entity.TreasuryApplyBankMovementReceivableResponse
    >(
      `${this.apiUrl}/apply-bank-movement`,
      payload,
    );
  }


  // =========================================================
  // CUENTAS POR COBRAR:
  // REVERTIR COLLECTION
  // =========================================================

  reverseCollection(
    collectionId:
      string,

    payload:
      entity.TreasuryReverseCollectionPayload,
  ): Observable<
    entity.TreasuryReverseCollectionResponse
  > {

    return this.http.patch<
      entity.TreasuryReverseCollectionResponse
    >(
      `${this.apiUrl}/collections/${collectionId}/reverse`,
      payload,
    );
  }


  // =========================================================
  // CUENTAS POR COBRAR:
  // CERRAR RESIDUAL DEL MOVIMIENTO
  // =========================================================

  manualCloseBankMovement(
    movementId:
      string,

    payload:
      entity.TreasuryReceivableManualClosePayload,
  ): Observable<
    entity.TreasuryReceivableMovementMutationResponse
  > {

    return this.http.patch<
      entity.TreasuryReceivableMovementMutationResponse
    >(
      `${this.apiUrl}/bank-movements/${movementId}/manual-close`,
      payload,
    );
  }


  // =========================================================
  // CUENTAS POR COBRAR:
  // REABRIR CIERRE MANUAL
  // =========================================================

  manualReopenBankMovement(
    movementId:
      string,

    payload:
      entity.TreasuryReceivableManualReopenPayload,
  ): Observable<
    entity.TreasuryReceivableMovementMutationResponse
  > {

    return this.http.patch<
      entity.TreasuryReceivableMovementMutationResponse
    >(
      `${this.apiUrl}/bank-movements/${movementId}/manual-reopen`,
      payload,
    );
  }


  // =========================================================
  // CUENTAS POR COBRAR:
  // HISTORIAL FINANCIERO DE UNA CxC
  // =========================================================

  getReceivableCollectionHistory(
    receivableId:
      number,
  ): Observable<
    entity.TreasuryReceivableCollectionHistoryResponse
  > {

    return this.http.get<
      entity.TreasuryReceivableCollectionHistoryResponse
    >(
      `${this.apiUrl}/receivables/${receivableId}/collection-history`,
    );
  }


  // =========================================================
  // CUENTAS POR COBRAR:
  // HISTORIAL DEL MOVIMIENTO BANCARIO
  // =========================================================

  getBankMovementHistory(
    movementId:
      string,
  ): Observable<
    entity.TreasuryReceivableBankMovementHistoryResponse
  > {

    return this.http.get<
      entity.TreasuryReceivableBankMovementHistoryResponse
    >(
      `${this.apiUrl}/bank-movements/${movementId}/history`,
    );
  }

  // =========================================================
  // MOVIMIENTOS BANCARIOS:
  // CONFIRMAR / CAMBIAR CLASIFICACIÓN
  // =========================================================

  updateBankMovementClassification(
    movementId: string,
    payload:
      entity.TreasuryUpdateBankMovementClassificationPayload,
  ): Observable<
    entity.TreasuryUpdateBankMovementClassificationResponse
  > {

    return this.http.patch<
      entity.TreasuryUpdateBankMovementClassificationResponse
    >(
      `${this.treasuryApiUrl}/bank-movements/${movementId}/classification`,
      payload,
    );
  }
  
}

