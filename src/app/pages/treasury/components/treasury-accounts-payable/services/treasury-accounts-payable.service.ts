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
    filters?: entity.TreasuryPendingExpenseItemFilters,
  ): Observable<entity.TreasuryPendingExpenseItemsResponse> {
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

      if (filters.item_type) {
        params = params.set(
          'item_type',
          filters.item_type,
        );
      }

      if (filters.origin_type?.trim()) {
        params = params.set(
          'origin_type',
          filters.origin_type.trim(),
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
}