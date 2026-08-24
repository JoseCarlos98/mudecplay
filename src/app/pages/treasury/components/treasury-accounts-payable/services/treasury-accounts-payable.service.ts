import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';

import {
  inject,
  Injectable,
} from '@angular/core';

import { Observable } from 'rxjs';

import {
  environment,
} from '../../../../../../environments/environment';

import * as entity
  from '../interfaces/treasury-accounts-payable.interfaces';

@Injectable({
  providedIn: 'root',
})
export class TreasuryAccountsPayableService {
  private readonly apiUrl =
    `${environment.apiUrl}/treasury/accounts-payable`;

  private readonly treasuryApiUrl =
    `${environment.apiUrl}/treasury`;

  private readonly http =
    inject(HttpClient);

  // =========================================================
  // CUENTAS POR PAGAR:
  // SALIDAS BANCARIAS DISPONIBLES
  // =========================================================

  getAvailableOutflows(
    filters?: entity.TreasuryAvailableOutflowFilters,
  ): Observable<entity.TreasuryAvailableOutflowsResponse> {
    let params = new HttpParams();

    if (filters) {
      params = params.set(
        'page',
        String(filters.page),
      );

      params = params.set(
        'limit',
        String(filters.limit),
      );

      if (filters.search?.trim()) {
        params = params.set(
          'search',
          filters.search.trim(),
        );
      }

      if (
        filters.amount !== undefined &&
        filters.amount !== null
      ) {
        params = params.set(
          'amount',
          String(filters.amount),
        );
      }

      if (
        filters.minimum_available_amount !== undefined &&
        filters.minimum_available_amount !== null
      ) {
        params = params.set(
          'minimum_available_amount',
          String(
            filters.minimum_available_amount,
          ),
        );
      }

      if (
        filters.company_id !== undefined &&
        filters.company_id !== null
      ) {
        params = params.set(
          'company_id',
          String(filters.company_id),
        );
      }

      if (
        filters.bank_id !== undefined &&
        filters.bank_id !== null
      ) {
        params = params.set(
          'bank_id',
          String(filters.bank_id),
        );
      }

      if (
        filters.bank_account_id !== undefined &&
        filters.bank_account_id !== null
      ) {
        params = params.set(
          'bank_account_id',
          String(filters.bank_account_id),
        );
      }

      if (filters.date_from?.trim()) {
        params = params.set(
          'date_from',
          filters.date_from.trim(),
        );
      }

      if (filters.date_to?.trim()) {
        params = params.set(
          'date_to',
          filters.date_to.trim(),
        );
      }
    }

    return this.http.get<
      entity.TreasuryAvailableOutflowsResponse
    >(
      `${this.apiUrl}/available-outflows`,
      {
        params,
      },
    );
  }

  // =========================================================
  // CUENTAS POR PAGAR:
  // CONCEPTOS PENDIENTES
  // =========================================================

  getPendingExpenseItems(
    filters?:
      entity.TreasuryPendingExpenseItemFilters,
  ): Observable<
    entity.TreasuryPendingExpenseItemsResponse
  > {
    let params =
      new HttpParams();

    if (filters) {
      params = params.set(
        'page',
        String(
          filters.page,
        ),
      );

      params = params.set(
        'limit',
        String(
          filters.limit,
        ),
      );

      if (
        filters.search?.trim()
      ) {
        params = params.set(
          'search',
          filters.search.trim(),
        );
      }

      if (
        filters.amount !== undefined &&
        filters.amount !== null
      ) {
        params = params.set(
          'amount',
          String(
            filters.amount,
          ),
        );
      }

      /*
       * Proveedores múltiples.
       *
       * Angular genera:
       *
       * ?supplier_ids=3&supplier_ids=8
       */
      for (
        const supplierId of
        filters.supplier_ids ??
        []
      ) {
        if (
          Number.isInteger(
            Number(
              supplierId,
            ),
          ) &&
          Number(
            supplierId,
          ) > 0
        ) {
          params = params.append(
            'supplier_ids',
            String(
              supplierId,
            ),
          );
        }
      }

      /*
       * Compatibilidad temporal.
       * Puede eliminarse cuando confirmemos
       * que ningún otro flujo usa supplier_id.
       */
      if (
        filters.supplier_id !==
        undefined &&
        filters.supplier_id !==
        null
      ) {
        params = params.set(
          'supplier_id',
          String(
            filters.supplier_id,
          ),
        );
      }

      if (
        filters.project_id !==
        undefined &&
        filters.project_id !==
        null
      ) {
        params = params.set(
          'project_id',
          String(
            filters.project_id,
          ),
        );
      }

      if (
        filters.item_type
      ) {
        params = params.set(
          'item_type',
          filters.item_type,
        );
      }

      if (
        filters.date_from
          ?.trim()
      ) {
        params = params.set(
          'date_from',
          filters.date_from.trim(),
        );
      }

      if (
        filters.date_to
          ?.trim()
      ) {
        params = params.set(
          'date_to',
          filters.date_to.trim(),
        );
      }
    }

    return this.http.get<
      entity.TreasuryPendingExpenseItemsResponse
    >(
      `${this.apiUrl}/pending-expense-items`,
      {
        params,
      },
    );
  }

  // =========================================================
  // CUENTAS POR PAGAR:
  // PAGOS HISTÓRICOS
  // =========================================================

  getHistoricalPayments(
    filters?: entity.TreasuryHistoricalPaymentFilters,
  ): Observable<entity.TreasuryHistoricalPaymentsResponse> {
    let params = new HttpParams();

    if (filters) {
      params = params.set(
        'page',
        String(filters.page),
      );

      params = params.set(
        'limit',
        String(filters.limit),
      );

      if (filters.search?.trim()) {
        params = params.set(
          'search',
          filters.search.trim(),
        );
      }

      if (filters.date_from?.trim()) {
        params = params.set(
          'date_from',
          filters.date_from.trim(),
        );
      }

      if (filters.date_to?.trim()) {
        params = params.set(
          'date_to',
          filters.date_to.trim(),
        );
      }

      if (
        filters.supplier_id !== undefined &&
        filters.supplier_id !== null
      ) {
        params = params.set(
          'supplier_id',
          String(filters.supplier_id),
        );
      }

      if (
        filters.project_id !== undefined &&
        filters.project_id !== null
      ) {
        params = params.set(
          'project_id',
          String(filters.project_id),
        );
      }

      if (filters.regularization_status) {
        params = params.set(
          'regularization_status',
          filters.regularization_status,
        );
      }

      if (filters.regularization_type) {
        params = params.set(
          'regularization_type',
          filters.regularization_type,
        );
      }

      /*
       * Aquí sí se valida explícitamente contra null y
       * undefined, porque false también es un valor válido.
       */
      if (
        filters.missing_payment_date !== undefined &&
        filters.missing_payment_date !== null
      ) {
        params = params.set(
          'missing_payment_date',
          String(
            filters.missing_payment_date,
          ),
        );
      }
    }

    return this.http.get<
      entity.TreasuryHistoricalPaymentsResponse
    >(
      `${this.apiUrl}/historical-payments`,
      {
        params,
      },
    );
  }

  // =========================================================
  // CUENTAS POR PAGAR:
  // HISTORIAL DE REGULARIZACIÓN
  // =========================================================

  getHistoricalPaymentHistory(
    paymentId: number | string,
  ): Observable<entity.TreasuryHistoricalPaymentHistoryResponse> {
    return this.http.get<
      entity.TreasuryHistoricalPaymentHistoryResponse
    >(
      `${this.apiUrl}/historical-payments/${paymentId}/history`,
    );
  }


  // =========================================================
  // CUENTAS POR PAGAR: APLICAR MOVIMIENTO BANCARIO
  // =========================================================

  applyBankMovement(
    payload: entity.TreasuryApplyBankMovementPayload,
  ) {
    return this.http.post<
      entity.TreasuryApplyBankMovementResponse
    >(
      `${this.apiUrl}/apply-bank-movement`,
      payload,
    );
  }

  // =========================================================
  // CUENTAS POR PAGAR:
  // HISTORIAL DE MOVIMIENTO BANCARIO
  // =========================================================

  getBankMovementHistory(
    movementId: number | string,
  ): Observable<entity.TreasuryBankMovementHistoryResponse> {
    return this.http.get<
      entity.TreasuryBankMovementHistoryResponse
    >(
      `${this.apiUrl}/bank-movements/${movementId}/history`,
    );
  }


  // =========================================================
  // CERRAR MOVIMIENTO BANCARIO MANUALMENTE
  // =========================================================

  manualCloseBankMovement(
    movementId: string | number,
    payload:
      entity.TreasuryManualCloseBankMovementPayload,
  ): Observable<
    entity.TreasuryManualCloseBankMovementResponse
  > {
    return this.http.patch<
      entity.TreasuryManualCloseBankMovementResponse
    >(
      `${this.apiUrl}/bank-movements/${movementId}/manual-close`,
      payload,
    );
  }

  // =========================================================
  // REABRIR MOVIMIENTO CERRADO MANUALMENTE
  // =========================================================

  manualReopenBankMovement(
    movementId: string | number,
    payload:
      entity.TreasuryManualReopenBankMovementPayload,
  ): Observable<
    entity.TreasuryManualReopenBankMovementResponse
  > {
    return this.http.patch<
      entity.TreasuryManualReopenBankMovementResponse
    >(
      `${this.apiUrl}/bank-movements/${movementId}/manual-reopen`,
      payload,
    );
  }
  // =========================================================
  // REVERTIR PAGO BANCARIO
  // =========================================================

  reversePayment(
    paymentId: string | number,
    payload: entity.TreasuryReversePaymentPayload,
  ): Observable<entity.TreasuryReversePaymentResponse> {
    return this.http.patch<entity.TreasuryReversePaymentResponse>(
      `${this.apiUrl}/payments/${paymentId}/reverse`,
      payload,
    );
  }
  // =========================================================
  // REGULARIZAR PAGO HISTÓRICO
  // =========================================================

  regularizeHistoricalPayment(
    paymentId: string | number,
    payload:
      entity.TreasuryRegularizeHistoricalPaymentPayload,
  ): Observable<
    entity.TreasuryRegularizeHistoricalPaymentResponse
  > {
    return this.http.patch<
      entity.TreasuryRegularizeHistoricalPaymentResponse
    >(
      `${this.apiUrl}/historical-payments/${paymentId}/regularize`,
      payload,
    );
  }


  // =========================================================
  // REABRIR REGULARIZACIÓN HISTÓRICA
  // =========================================================

  reopenHistoricalPaymentRegularization(
    paymentId:
      string | number,

    payload:
      entity.TreasuryReopenHistoricalRegularizationPayload,
  ): Observable<
    entity.TreasuryReopenHistoricalRegularizationResponse
  > {
    return this.http.patch<
      entity.TreasuryReopenHistoricalRegularizationResponse
    >(
      `${this.apiUrl}/historical-payments/${paymentId}/reopen-regularization`,
      payload,
    );
  }

  // =========================================================
  // HISTORIAL DE PAGOS POR CONCEPTO
  // =========================================================

  getExpenseItemPaymentHistory(
    expenseItemId: number | string,
  ): Observable<
    entity.TreasuryExpenseItemPaymentHistoryResponse
  > {
    return this.http.get<
      entity.TreasuryExpenseItemPaymentHistoryResponse
    >(
      `${this.apiUrl}/expense-items/${expenseItemId}/payment-history`,
    );
  }

  // =========================================================
  // CUENTAS POR PAGAR:
  // REGISTRAR PAGO ACTUAL EN EFECTIVO
  // =========================================================

  applyCashPayment(
    payload:
      entity.TreasuryApplyCashPaymentPayload,
  ): Observable<
    entity.TreasuryApplyCashPaymentResponse
  > {
    return this.http.post<
      entity.TreasuryApplyCashPaymentResponse
    >(
      `${this.apiUrl}/apply-cash-payment`,
      payload,
    );
  }


  // =========================================================
  // MOVIMIENTOS BANCARIOS:
  // CONFIRMAR / CAMBIAR CLASIFICACIÓN INDIVIDUAL
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

  // =========================================================
  // MOVIMIENTOS BANCARIOS:
  // CLASIFICACIÓN MASIVA
  // =========================================================

  updateBankMovementsClassification(
    payload:
      entity.TreasuryUpdateBankMovementsClassificationPayload,
  ): Observable<
    entity.TreasuryUpdateBankMovementsClassificationResponse
  > {
    return this.http.patch<
      entity.TreasuryUpdateBankMovementsClassificationResponse
    >(
      `${this.treasuryApiUrl}/bank-movements/classification/bulk`,
      payload,
    );
  }


  // =========================================================
  // MOVIMIENTOS BANCARIOS:
  // CONFIRMAR CLASIFICACIONES MASIVAS
  // =========================================================

  confirmBankMovementsClassification(
    payload:
      entity.TreasuryConfirmBankMovementsClassificationPayload,
  ): Observable<
    entity.TreasuryConfirmBankMovementsClassificationResponse
  > {
    return this.http.patch<
      entity.TreasuryConfirmBankMovementsClassificationResponse
    >(
      `${this.treasuryApiUrl}/bank-movements/classification/confirm-bulk`,
      payload,
    );
  }


  // =========================================================
  // CUENTAS POR PAGAR:
  // EFECTIVO MASIVO
  // =========================================================

  bulkApplyCashPayments(
    payload:
      entity.TreasuryBulkApplyCashPaymentsPayload,
  ): Observable<
    entity.TreasuryBulkApplyCashPaymentsResponse
  > {
    return this.http.post<
      entity.TreasuryBulkApplyCashPaymentsResponse
    >(
      `${this.apiUrl}/apply-cash-payments/bulk`,
      payload,
    );
  }
}


