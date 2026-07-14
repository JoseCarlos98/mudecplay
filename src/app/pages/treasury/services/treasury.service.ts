import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import * as entity from '../interfaces/treasury.interfaces';

@Injectable({
  providedIn: 'root',
})
export class TreasuryService {
  private readonly apiUrl = `${environment.apiUrl}/treasury`;
  private readonly http = inject(HttpClient);

  // =========================================================
  // TESORERÍA: CUENTAS BANCARIAS
  // =========================================================

  getBankAccounts(
    filters?: entity.TreasuryBankAccountFilters,
  ): Observable<entity.TreasuryBankAccount[]> {
    let params = new HttpParams();

    if (filters) {
      if (filters.company_id) {
        params = params.set('company_id', String(filters.company_id));
      }

      if (filters.bank_id) {
        params = params.set('bank_id', String(filters.bank_id));
      }

      if (filters.search?.trim()) {
        params = params.set('search', filters.search.trim());
      }

      if (
        filters.is_active !== undefined &&
        filters.is_active !== null
      ) {
        params = params.set('is_active', String(filters.is_active));
      }
    }

    return this.http.get<entity.TreasuryBankAccount[]>(
      `${this.apiUrl}/bank-accounts`,
      { params },
    );
  }

  createBankAccount(
    payload: entity.CreateTreasuryBankAccountPayload,
  ): Observable<entity.TreasuryBankAccountSaveResponse> {
    return this.http.post<entity.TreasuryBankAccountSaveResponse>(
      `${this.apiUrl}/bank-accounts`,
      payload,
    );
  }

  updateBankAccount(
    id: number | string,
    payload: entity.UpdateTreasuryBankAccountPayload,
  ): Observable<entity.TreasuryBankAccountSaveResponse> {
    return this.http.patch<entity.TreasuryBankAccountSaveResponse>(
      `${this.apiUrl}/bank-accounts/${id}`,
      payload,
    );
  }

  deactivateBankAccount(
    id: number | string,
  ): Observable<entity.TreasuryBankAccountSaveResponse> {
    return this.http.patch<entity.TreasuryBankAccountSaveResponse>(
      `${this.apiUrl}/bank-accounts/${id}/deactivate`,
      {},
    );
  }

  // =========================================================
  // TESORERÍA: CUENTAS BANCARIAS - ELIMINAR
  // =========================================================

  deleteBankAccount(
    id: number | string,
  ): Observable<entity.TreasuryBankAccountSaveResponse> {
    return this.http.delete<entity.TreasuryBankAccountSaveResponse>(
      `${this.apiUrl}/bank-accounts/${id}`,
    );
  }

}



