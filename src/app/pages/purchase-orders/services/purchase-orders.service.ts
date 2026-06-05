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

  getPurchaseOrderAuthorizers(): Observable<entity.PurchaseOrderAuthorizerDto[]> {
    return this.http.get<entity.PurchaseOrderAuthorizerDto[]>(
      `${this.apiUrl}/authorizers`,
    );
  }

  createPurchaseOrderAuthorizer(
    payload: entity.CreatePurchaseOrderAuthorizerDto,
  ): Observable<entity.PurchaseOrderAuthorizerSaveResponse> {
    return this.http.post<entity.PurchaseOrderAuthorizerSaveResponse>(
      `${this.apiUrl}/authorizers`,
      payload,
    );
  }

  deactivatePurchaseOrderAuthorizer(id: number | string): Observable<ApiSuccess> {
    return this.http.patch<ApiSuccess>(
      `${this.apiUrl}/authorizers/${id}/deactivate`,
      {},
    );
  }

  getTicketPhotoUploadUrl(
    payload: entity.GetTicketPhotoUploadUrlDto,
  ): Observable<entity.TicketPhotoUploadUrlResponse> {
    return this.http.post<entity.TicketPhotoUploadUrlResponse>(
      `${this.apiUrl}/ticket-photos/upload-url`,
      payload,
    );
  }

  uploadTicketPhotoToStorage(
    uploadUrl: string,
    file: File,
  ): Observable<void> {
    return this.http.put<void>(uploadUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
    });
  }

  createTicketPhoto(
    payload: entity.CreateTicketPhotoDto,
  ): Observable<entity.CreateTicketPhotoResponse> {
    return this.http.post<entity.CreateTicketPhotoResponse>(
      `${this.apiUrl}/ticket-photos`,
      payload,
    );
  }

  getPendingTicketPhotos(
    filters?: entity.FiltersTicketPhotos,
  ): Observable<entity.PendingTicketPhotosPaginatedResponse> {
    let params = new HttpParams();

    if (filters) {
      params = params.set('page', String(filters.page));
      params = params.set('limit', String(filters.limit));

      if (filters.project_id) {
        params = params.set('project_id', String(filters.project_id));
      }
    }

    return this.http.get<entity.PendingTicketPhotosPaginatedResponse>(
      `${this.apiUrl}/ticket-photos/pending`,
      { params },
    );
  }

  getTicketPhotoViewUrl(
    photoId: number,
  ): Observable<entity.TicketPhotoViewUrlResponse> {
    return this.http.get<entity.TicketPhotoViewUrlResponse>(
      `${this.apiUrl}/ticket-photos/${photoId}/view-url`,
    );
  }

  reconcileTicketPhoto(
    photoId: number,
    payload: entity.ReconcileTicketPhotoDto,
  ): Observable<entity.ReconcileTicketPhotoResponse> {
    return this.http.patch<entity.ReconcileTicketPhotoResponse>(
      `${this.apiUrl}/ticket-photos/${photoId}/reconcile`,
      payload,
    );
  }

  getTicketPhotoById(
    photoId: number,
  ): Observable<entity.PurchaseOrderTicketPhotoDto> {
    return this.http.get<entity.PurchaseOrderTicketPhotoDto>(
      `${this.apiUrl}/ticket-photos/${photoId}`,
    );
  }

  createDirectExpenseFromTicketPhoto(
    photoId: number,
    payload: entity.CreateDirectExpenseFromTicketDto,
  ): Observable<entity.CreateDirectExpenseFromTicketResponse> {
    return this.http.post<entity.CreateDirectExpenseFromTicketResponse>(
      `${this.apiUrl}/ticket-photos/${photoId}/direct-expense`,
      payload,
    );
  }

  createDirectXmlExpenseFromTicketPhoto(
  photoId: number,
  payload: entity.CreateDirectXmlExpenseFromTicketDto,
): Observable<entity.CreateDirectXmlExpenseFromTicketResponse> {
  return this.http.post<entity.CreateDirectXmlExpenseFromTicketResponse>(
    `${this.apiUrl}/ticket-photos/${photoId}/direct-xml-expense`,
    payload,
  );
}
}