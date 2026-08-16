import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiSuccess } from '../../../shared/interfaces/general-interfaces';

import * as entity from '../interfaces/purchase-orders.interfaces';
import { setScalar } from '../../../shared/helpers/general-helpers';

@Injectable({
  providedIn: 'root',
})
export class PurchaseOrdersService {
  private readonly apiUrl = `${environment.apiUrl}/purchase-orders`;

  private readonly http = inject(HttpClient);

  getPurchaseOrders(
    filters?: entity.PurchaseOrderFilters,
  ): Observable<
    entity.PurchaseOrdersPaginatedResponse
  > {

    let params =
      new HttpParams();


    if (filters) {

      params = setScalar(
        params,
        'page',
        filters.page,
      );


      params = setScalar(
        params,
        'limit',
        filters.limit,
      );


      params = setScalar(
        params,
        'startDate',
        filters.startDate,
      );


      params = setScalar(
        params,
        'endDate',
        filters.endDate,
      );


      params = setScalar(
        params,
        'requested_amount',
        filters.requested_amount,
      );


      params = setScalar(
        params,
        'related_expense_amount',
        filters.related_expense_amount,
      );


      params = setScalar(
        params,
        'tracking_status',
        filters.tracking_status,
      );


      params = setScalar(
        params,
        'destination_type',
        filters.destination_type,
      );


      params = setScalar(
        params,
        'will_have_invoice',
        filters.will_have_invoice,
      );


      params = setScalar(
        params,
        'project_id',
        filters.project_id,
      );
    }


    return this.http.get<
      entity.PurchaseOrdersPaginatedResponse
    >(
      this.apiUrl,
      {
        params,
      },
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
    filters: entity.PurchaseOrderFilters,
  ): Observable<entity.AvailableForReconciliationResponse> {
    let params = new HttpParams()
      .set('page', filters.page)
      .set('limit', filters.limit);

    if (filters.project_id) {
      params = params.set(
        'project_id',
        filters.project_id,
      );
    }

    if (filters.ticket_filter) {
      params = params.set(
        'ticket_filter',
        filters.ticket_filter,
      );
    }

    if (filters.search?.trim()) {
      params = params.set(
        'search',
        filters.search.trim(),
      );
    }

    return this.http.get<entity.AvailableForReconciliationResponse>(
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

  getAvailableXmlExpensesForPurchaseOrder(
    purchaseOrderId: number | string,
    filters?: entity.FiltersAvailableXmlExpenses,
  ): Observable<entity.AvailableXmlExpensesResponse> {
    let params = new HttpParams();

    if (filters) {
      if (filters.search?.trim()) {
        params = params.set(
          'search',
          filters.search.trim(),
        );
      }

      const supplierIds = (
        filters.supplierIds ?? []
      )
        .map(Number)
        .filter(
          (id) =>
            Number.isInteger(id) &&
            id > 0,
        );

      if (supplierIds.length > 0) {
        params = params.set(
          'supplierIds',
          supplierIds.join(','),
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
        filters.amount !== undefined &&
        filters.amount !== null &&
        String(filters.amount).trim() !== ''
      ) {
        params = params.set(
          'amount',
          String(filters.amount),
        );
      }
    }

    return this.http.get<entity.AvailableXmlExpensesResponse>(
      `${this.apiUrl}/${purchaseOrderId}/available-xml-expenses`,
      { params },
    );
  }

  linkExistingXmlExpenseToTicketPhoto(
    photoId: number | string,
    payload: entity.LinkExistingXmlExpenseDto,
  ): Observable<entity.LinkExistingXmlExpenseResponse> {
    return this.http.post<entity.LinkExistingXmlExpenseResponse>(
      `${this.apiUrl}/ticket-photos/${photoId}/link-existing-xml-expense`,
      payload,
    );
  }

  createWarehouseExpenseFromTicketPhoto(
    photoId: number | string,
    payload: entity.CreateWarehouseExpenseFromTicketDto,
  ): Observable<entity.CreateWarehouseExpenseFromTicketResponse> {
    return this.http.post<entity.CreateWarehouseExpenseFromTicketResponse>(
      `${this.apiUrl}/ticket-photos/${photoId}/warehouse-expense`,
      payload,
    );
  }

  getAvailableWarehouseXmlExpensesForPurchaseOrder(
    purchaseOrderId: number | string,
    filters?: entity.FiltersAvailableWarehouseXmlExpenses,
  ): Observable<entity.AvailableWarehouseXmlExpensesResponse> {
    let params = new HttpParams();

    if (filters) {
      if (filters.search?.trim()) {
        params = params.set(
          'search',
          filters.search.trim(),
        );
      }

      const supplierIds = (
        filters.supplierIds ?? []
      )
        .map(Number)
        .filter(
          (id) =>
            Number.isInteger(id) &&
            id > 0,
        );

      if (supplierIds.length > 0) {
        params = params.set(
          'supplierIds',
          supplierIds.join(','),
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
        filters.amount !== undefined &&
        filters.amount !== null &&
        String(filters.amount).trim() !== ''
      ) {
        params = params.set(
          'amount',
          String(filters.amount),
        );
      }
    }

    return this.http.get<entity.AvailableWarehouseXmlExpensesResponse>(
      `${this.apiUrl}/${purchaseOrderId}/available-warehouse-xml-expenses`,
      { params },
    );
  }

  linkExistingWarehouseXmlExpenseToTicketPhoto(
    photoId: number | string,
    payload: entity.LinkExistingWarehouseXmlExpenseDto,
  ): Observable<entity.LinkExistingWarehouseXmlExpenseResponse> {
    return this.http.post<entity.LinkExistingWarehouseXmlExpenseResponse>(
      `${this.apiUrl}/ticket-photos/${photoId}/link-existing-warehouse-xml-expense`,
      payload,
    );
  }

  unreconcileTicketPhoto(
    photoId: number | string,
    payload: entity.UnreconcileTicketPhotoDto,
  ): Observable<entity.UnreconcileTicketPhotoResponse> {
    return this.http.patch<entity.UnreconcileTicketPhotoResponse>(
      `${this.apiUrl}/ticket-photos/${photoId}/unreconcile`,
      payload,
    );
  }

  unlinkExpenseFromPurchaseOrder(
    purchaseOrderId: number | string,
    linkId: number | string,
    payload: entity.UnlinkPurchaseOrderExpenseDto,
  ): Observable<entity.UnlinkPurchaseOrderExpenseResponse> {
    return this.http.patch<entity.UnlinkPurchaseOrderExpenseResponse>(
      `${this.apiUrl}/${purchaseOrderId}/expense-links/${linkId}/unlink`,
      payload,
    );
  }

  updateTicketPhotoProject(
    photoId: number | string,
    payload: entity.UpdateTicketPhotoProjectDto,
  ): Observable<entity.UpdateTicketPhotoProjectResponse> {
    return this.http.patch<entity.UpdateTicketPhotoProjectResponse>(
      `${this.apiUrl}/ticket-photos/${photoId}/project`,
      payload,
    );
  }

  deleteTicketPhoto(
    photoId: number | string,
  ): Observable<entity.DeleteTicketPhotoResponse> {
    return this.http.delete<entity.DeleteTicketPhotoResponse>(
      `${this.apiUrl}/ticket-photos/${photoId}`,
    );
  }

  // =========================================================
  // REPORTES - CORTE OPERATIVO
  // =========================================================

  getPurchaseOrderOperationalSummary():
    Observable<
      entity.PurchaseOrderOperationalSummaryResponse
    > {

    return this.http.get<
      entity.PurchaseOrderOperationalSummaryResponse
    >(
      `${this.apiUrl}/reports/operational-summary`,
    );
  }


  // =========================================================
  // REPORTES - DETALLE DE PENDIENTES
  // =========================================================

  getPurchaseOrderPendingDetails(
    filters?:
      entity.PurchaseOrderPendingDetailFilters,
  ): Observable<
    | entity.PurchaseOrderPendingDetailAllResponse
    | entity.PurchaseOrderPendingDetailPaginatedResponse
  > {

    let params =
      new HttpParams();

    if (filters) {

      params =
        setScalar(
          params,
          'category',
          filters.category,
        );

      params =
        setScalar(
          params,
          'search',
          filters.search?.trim(),
        );

      params =
        setScalar(
          params,
          'page',
          filters.page,
        );

      params =
        setScalar(
          params,
          'limit',
          filters.limit,
        );
    }

    return this.http.get<
      | entity.PurchaseOrderPendingDetailAllResponse
      | entity.PurchaseOrderPendingDetailPaginatedResponse
    >(
      `${this.apiUrl}/reports/pending-details`,
      {
        params,
      },
    );
  }

  reprintPurchaseOrder(
    id: number | string,
  ): Observable<
    entity.ReprintPurchaseOrderResponse
  > {
    return this.http.post<
      entity.ReprintPurchaseOrderResponse
    >(
      `${this.apiUrl}/${id}/reprint`,
      {},
    );
  }

}