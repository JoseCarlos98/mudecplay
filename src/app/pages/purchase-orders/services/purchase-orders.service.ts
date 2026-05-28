import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiSuccess } from '../../../shared/interfaces/general-interfaces';

import * as entity from '../interfaces/purchase-orders.interfaces';

@Injectable({
  providedIn: 'root',
})
export class PurchaseOrdersService {
  private readonly apiUrl = `${environment.apiUrl}/purchase-orders`;
  private readonly http = inject(HttpClient);

  getPurchaseOrders(
    filters?: entity.PurchaseOrderFilters,
  ): Observable<entity.PurchaseOrdersPaginatedResponse> {
    let params = new HttpParams();

    if (filters) {
      params = params.set('page', String(filters.page));
      params = params.set('limit', String(filters.limit));

      if (filters.search?.trim()) {
        params = params.set('search', filters.search.trim());
      }

      if (filters.status) {
        params = params.set('status', filters.status);
      }

      if (filters.destination_type) {
        params = params.set('destination_type', filters.destination_type);
      }

      if (
        filters.will_have_invoice !== undefined &&
        filters.will_have_invoice !== null
      ) {
        params = params.set(
          'will_have_invoice',
          String(filters.will_have_invoice),
        );
      }

      if (filters.project_id) {
        params = params.set('project_id', String(filters.project_id));
      }
    }

    return this.http.get<entity.PurchaseOrdersPaginatedResponse>(
      this.apiUrl,
      { params },
    );
  }

  getPurchaseOrderById(
    id: number | string,
  ): Observable<entity.PurchaseOrderResponseDto> {
    return this.http.get<entity.PurchaseOrderResponseDto>(
      `${this.apiUrl}/${id}`,
    );
  }

  createPurchaseOrder(
    payload: entity.CreatePurchaseOrderDto,
  ): Observable<ApiSuccess> {
    return this.http.post<ApiSuccess>(this.apiUrl, payload);
  }

  updatePurchaseOrder(
    id: number | string,
    payload: entity.UpdatePurchaseOrderDto,
  ): Observable<ApiSuccess> {
    return this.http.patch<ApiSuccess>(`${this.apiUrl}/${id}`, payload);
  }

  authorizePurchaseOrder(
    id: number | string,
    payload: entity.AuthorizePurchaseOrderDto,
  ): Observable<ApiSuccess> {
    return this.http.patch<ApiSuccess>(
      `${this.apiUrl}/${id}/authorize`,
      payload,
    );
  }

  rejectPurchaseOrder(
    id: number | string,
    payload: entity.RejectPurchaseOrderDto,
  ): Observable<ApiSuccess> {
    return this.http.patch<ApiSuccess>(
      `${this.apiUrl}/${id}/reject`,
      payload,
    );
  }

  cancelPurchaseOrder(
    id: number | string,
    payload: entity.CancelPurchaseOrderDto,
  ): Observable<ApiSuccess> {
    return this.http.patch<ApiSuccess>(
      `${this.apiUrl}/${id}/cancel`,
      payload,
    );
  }

  getAvailableForReconciliation(
    filters?: entity.PurchaseOrderFilters,
  ): Observable<entity.PurchaseOrdersPaginatedResponse> {
    let params = new HttpParams();

    if (filters) {
      params = params.set('page', String(filters.page));
      params = params.set('limit', String(filters.limit));

      if (filters.search?.trim()) {
        params = params.set('search', filters.search.trim());
      }

      if (filters.destination_type) {
        params = params.set('destination_type', filters.destination_type);
      }

      if (
        filters.will_have_invoice !== undefined &&
        filters.will_have_invoice !== null
      ) {
        params = params.set(
          'will_have_invoice',
          String(filters.will_have_invoice),
        );
      }

      if (filters.project_id) {
        params = params.set('project_id', String(filters.project_id));
      }
    }

    return this.http.get<entity.PurchaseOrdersPaginatedResponse>(
      `${this.apiUrl}/available-for-reconciliation`,
      { params },
    );
  }

  getFlowDetail(id: number | string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}/flow-detail`);
  }

  getExpenseLinks(id: number | string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/expense-links`);
  }


  getPurchaseOrderRequesters(): Observable<entity.PurchaseOrderRequesterDto[]> {
    return this.http.get<entity.PurchaseOrderRequesterDto[]>(
      `${this.apiUrl}/requesters`,
    );
  }

  createPurchaseOrderRequester(
    payload: entity.CreatePurchaseOrderRequesterDto,
  ): Observable<entity.PurchaseOrderRequesterSaveResponse> {
    return this.http.post<entity.PurchaseOrderRequesterSaveResponse>(
      `${this.apiUrl}/requesters`,
      payload,
    );
  }

  deactivatePurchaseOrderRequester(
    id: number | string,
  ): Observable<ApiSuccess> {
    return this.http.patch<ApiSuccess>(
      `${this.apiUrl}/requesters/${id}/deactivate`,
      {},
    );
  }
}