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
  ): Observable<entity.PurchaseOrdersPaginatedResponse> {
    let params = new HttpParams();

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
        'search',
        filters.search?.trim(),
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
    filters: PurchaseOrderFilters,
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

}
import { Catalog } from '../../../shared/interfaces/general-interfaces';

export type PurchaseOrderStatus =
  | 'in_review'
  | 'authorized'
  | 'not_authorized'
  | 'cancelled';

export type PurchaseOrderDestinationType = 'direct' | 'warehouse';

export type PurchaseOrderTrackingStatus =
  | 'created'
  | 'authorized'
  | 'ticket_uploaded'
  | 'ticket_reconciled'
  | 'expense_registered'
  | 'payment_completed'
  | 'not_authorized'
  | 'cancelled';

export type PurchaseOrderTrackingVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'primary';

export type PurchaseOrderHistoryEventType =
  | 'created'
  | 'updated'
  | 'authorized'
  | 'not_authorized'
  | 'cancelled'
  | 'ticket_uploaded'
  | 'ticket_reconciled'
  | 'expense_linked';

export type PurchaseOrderHistoryTagVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'primary';

export interface PurchaseOrderUserDto {
  id: number;
  name: string;
}

export interface PurchaseOrderProjectDto {
  id: number;
  name: string;
}

export interface PurchaseOrderEmployeeDto {
  id: number;
  name: string;
}

export interface PurchaseOrderHistoryEventDto {
  id: number;
  event_type: PurchaseOrderHistoryEventType | string;
  title: string;
  description: string | null;

  performed_by_user: PurchaseOrderUserDto | null;
  performed_by_name: string | null;

  tag: string;
  tag_variant: PurchaseOrderHistoryTagVariant;
  icon: string;

  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface PurchaseOrderTicketPhotoDto {
  id: number;
  file_name?: string | null;
  fileName?: string | null;
  filename?: string | null;

  status?: string | null;

  purchase_order?: TicketPhotoPurchaseOrderMiniDto | null;
  purchaseOrder?: TicketPhotoPurchaseOrderMiniDto | null;

  public_url?: string | null;
  publicUrl?: string | null;
  preview_url?: string | null;
  previewUrl?: string | null;
  url?: string | null;

  uploaded_by_user?: PurchaseOrderUserDto | null;
  uploadedByUser?: PurchaseOrderUserDto | null;
  user?: PurchaseOrderUserDto | null;

  uploaded_at?: string | null;
  created_at?: string | null;
  createdAt?: string | null;

  reconciled_by_user?: PurchaseOrderUserDto | null;
  reconciled_at?: string | null;

  project?: PurchaseOrderProjectDto | null;
  notes?: string | null;
}

export interface PurchaseOrderExpenseLinkDto {
  id: number;
  expense_id?: number | null;
  purchase_order_id?: number | null;
  ticket_photo_id?: number | null;

  registration_type?: 'manual' | 'xml' | string | null;
  registration_type_label?: string | null;

  amount_snapshot?: number | string | null;
  notes?: string | null;
  created_at?: string | null;

  expense?: {
    id: number;

    folio?: string | null;
    internal_folio?: string | null;

    date?: string | null;

    total?: number | string | null;
    amount?: number | string | null;
    total_amount?: number | string | null;

    paid_amount?: number | string | null;
    total_paid?: number | string | null;
    payment_amount?: number | string | null;

    cfdi_uuid?: string | null;

    origin_type?: string | null;
    source_module?: string | null;
    source_record_id?: number | string | null;

    supplier?: {
      id: number;
      company_name?: string | null;
      name?: string | null;
    } | null;

    status?: {
      id: number;
      name: string;
    } | null;

    items?: PurchaseOrderExpenseItemDetailDto[];
  } | null;

  linked_items?: PurchaseOrderExpenseLinkedItemDto[];
  linked_item_ids?: number[];

  ticketPhoto?: PurchaseOrderTicketPhotoDto | null;
  ticket_photo?: PurchaseOrderTicketPhotoDto | null;

  linkedByUser?: PurchaseOrderUserDto | null;
  linked_by_user?: PurchaseOrderUserDto | null;
}

export interface PurchaseOrderResponseDto {
  id: number;

  folio: string;

  project: PurchaseOrderProjectDto | null;

  tracking_status?: PurchaseOrderTrackingStatus | string | null;
  tracking_status_label?: string | null;
  tracking_status_detail?: string | null;
  tracking_status_icon?: string | null;
  tracking_status_variant?: PurchaseOrderTrackingVariant | string | null;
  tracking_step?: number | null;

  requested_by_employee?: PurchaseOrderEmployeeDto | null;

  destination_type: PurchaseOrderDestinationType;
  destination_type_label: string;

  will_have_invoice: boolean;
  will_have_invoice_label: string;

  concept: string;
  requested_amount: number;
  is_zero_amount_invoice: boolean;
  zero_amount_reason: string | null;

  status: PurchaseOrderStatus;
  status_label: string;

  requested_by_user?: PurchaseOrderUserDto | null;
  requested_by_name: string | null;

  created_by_user: PurchaseOrderUserDto | null;

  authorized_by_employee?: PurchaseOrderEmployeeDto | null;
  authorized_by_name: string | null;
  authorization_registered_by_user: PurchaseOrderUserDto | null;
  authorized_at: string | null;

  notes: string | null;

  created_at: string;
  updated_at: string;

  // Campos solo cuando venga detalle / flow-detail
  ticket_photos_count?: number;
  expense_links_count?: number;
  ticket_photos?: PurchaseOrderTicketPhotoDto[];
  expense_links?: PurchaseOrderExpenseLinkDto[];
  history?: PurchaseOrderHistoryEventDto[];

  // Campos UI
  project_name?: string;
  requested_by_display?: string;
  destination_name?: string;
  invoice_name?: string;
  status_name?: string;
  created_at_date?: string;
  authorized_at_date?: string | null;
}

export interface PurchaseOrderFlowDetailResponse extends PurchaseOrderResponseDto {
  ticket_photos_count: number;
  expense_links_count: number;
  ticket_photos: PurchaseOrderTicketPhotoDto[];
  expense_links: PurchaseOrderExpenseLinkDto[];
  history: PurchaseOrderHistoryEventDto[];
}

export interface PurchaseOrdersPaginatedResponse {
  data: PurchaseOrderResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PurchaseOrderFilters {
  page: number;
  limit: number;

  search?: string | null;
  requested_amount?: number | null;
  status?: PurchaseOrderStatus | null;
  destination_type?: PurchaseOrderDestinationType | null;
  will_have_invoice?: boolean | null;
  project_id?: number | null;
  ticket_filter?: 'all' | 'with_photo' | 'without_photo';
  tracking_status?: PurchaseOrderTrackingStatus | string | null;
}

export interface PurchaseOrderUiFilters {
  page: number;
  limit: number;

  search?: string | null;
  requested_amount: number | null;
  tracking_status: PurchaseOrderTrackingStatus | string | '';
  destination_type?: PurchaseOrderDestinationType | '' | null;
  will_have_invoice?: 'true' | 'false' | '' | null;
  projects?: Catalog[];
}

export interface CreatePurchaseOrderDto {
  project_id?: number | null;
  destination_type: PurchaseOrderDestinationType;
  will_have_invoice: boolean;
  concept: string;
  requested_amount: number;
  is_zero_amount_invoice?: boolean;
  zero_amount_reason?: string | null;
  requested_by_employee_id: number;
  notes?: string | null;
}

export interface UpdatePurchaseOrderDto {
  project_id?: number | null;
  destination_type?: PurchaseOrderDestinationType;
  will_have_invoice?: boolean;
  concept?: string;
  requested_amount?: number;
  is_zero_amount_invoice?: boolean;
  zero_amount_reason?: string | null;
  requested_by_employee_id?: number | null;
  notes?: string | null;
}

export interface AuthorizePurchaseOrderDto {
  authorized_by_employee_id: number;
  notes?: string | null;
}

export interface RejectPurchaseOrderDto {
  reason: string;
}

export interface CancelPurchaseOrderDto {
  reason: string;
}

export interface UnreconcileTicketPhotoDto {
  reason?: string | null;
}

export interface UnreconcileTicketPhotoResponse {
  success: boolean;
  message: string;
  data: PurchaseOrderTicketPhotoDto;
}

export interface UnlinkPurchaseOrderExpenseDto {
  reason?: string | null;
}

export type PurchaseOrderExpenseRelationAction =
  | 'expense_deleted'
  | 'link_removed';

export interface UnlinkPurchaseOrderExpenseResponseData {
  purchase_order_id: number;
  purchase_order_folio: string;

  expense_link_id: number;

  expense_id: number | null;
  expense_folio: string | null;

  ticket_photo_id: number | null;

  unlinked: boolean;

  /**
   * true:
   * - El gasto fue creado desde O.C. sin XML.
   * - Se eliminó/soft-deleteó del módulo Gastos.
   *
   * false:
   * - Era XML existente o gasto externo.
   * - Solo se quitó la relación con la O.C.
   */
  expense_deleted: boolean;

  action: PurchaseOrderExpenseRelationAction;
}

export interface UnlinkPurchaseOrderExpenseResponse {
  success: boolean;
  message: string;
  data: UnlinkPurchaseOrderExpenseResponseData;
}

export interface PurchaseOrderRequesterEmployeeDto {
  id: number;
  name: string;
  full_name?: string;
  position?: string | null;
  employee_area?: {
    id: number;
    name: string;
  } | null;
}

export interface PurchaseOrderRequesterDto {
  id: number;
  employee: PurchaseOrderRequesterEmployeeDto | null;
  employee_id: number | null;
  employee_name: string | null;
  is_active: boolean;
  created_by_user: PurchaseOrderUserDto | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseOrderRequesterDto {
  employee_id: number;
}

export interface PurchaseOrderRequesterSaveResponse {
  success: boolean;
  message: string;
  data: PurchaseOrderRequesterDto;
}

export interface PurchaseOrderAuthorizerEmployeeDto {
  id: number;
  name: string;
  full_name?: string;
  position?: string | null;
  employee_area?: {
    id: number;
    name: string;
  } | null;
}

export interface PurchaseOrderAuthorizerDto {
  id: number;
  employee: PurchaseOrderAuthorizerEmployeeDto | null;
  employee_id: number | null;
  employee_name: string | null;
  is_active: boolean;
  created_by_user: PurchaseOrderUserDto | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseOrderAuthorizerDto {
  employee_id: number;
}

export interface PurchaseOrderAuthorizerSaveResponse {
  success: boolean;
  message: string;
  data: PurchaseOrderAuthorizerDto;
}



export interface GetTicketPhotoUploadUrlDto {
  fileName: string;
  fileType: string;
}

export interface TicketPhotoUploadUrlResponse {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

export interface CreateTicketPhotoDto {
  purchase_order_id?: number | null;
  project_id?: number | null;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  s3_key: string;
  public_url: string;
  notes?: string | null;
}

export interface CreateTicketPhotoResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    purchase_order_id: number | null;
    project_id: number | null;
    file_name: string | null;
    mime_type: string | null;
    size_bytes: number | null;
    s3_key: string;
    public_url: string;
    status: string;
    notes: string | null;
    created_at: string;
  };
}

export interface FiltersTicketPhotos {
  page: number;
  limit: number;
  project_id?: number | null;
}

export interface PendingTicketPhotosPaginatedResponse {
  data: PurchaseOrderTicketPhotoDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PendingTicketPhotoRow {
  id: number;
  project_id: number | null;
  preview_url: string | null;
  file_name: string;
  project_name: string;
  uploaded_by_name: string;
  status: string;
  status_label: string;
  created_at: string;
  created_at_date: string;
  public_url: string | null;
  purchase_order?: TicketPhotoPurchaseOrderMiniDto | null;
  uploaded_by_user_id?: number | null;
}

export interface TicketPhotoViewUrlResponse {
  id: number;
  file_name: string | null;
  url: string;
  expiresIn: number;
}

export interface ReconcileTicketPhotoDto {
  purchase_order_id: number;
  notes?: string | null;
}

export interface ReconcileTicketPhotoResponse {
  success: boolean;
  message: string;
  data: PurchaseOrderTicketPhotoDto;
}

export interface TicketPhotoPurchaseOrderMiniDto {
  id: number;
  folio: string;
  concept: string;
  requested_amount: number;
  status: PurchaseOrderStatus | string;
}

export interface CreateDirectExpenseFromTicketItemDto {
  product_id: number;
  concept?: string | null;
  amount: number;
  payment_amount?: number | null;
  payment_date?: string | null;
}

export interface CreateDirectExpenseFromTicketDto {
  date: string;
  supplier_id?: number | null;
  items: CreateDirectExpenseFromTicketItemDto[];
  notes?: string | null;
}

export interface CreateDirectExpenseFromTicketResponse {
  success: boolean;
  message: string;
  data: {
    purchase_order_id: number;
    purchase_order_folio: string;
    ticket_photo_id: number;
    expense_id: number;
    total_amount: number;
  };
}


export interface CreateDirectXmlExpenseFromTicketItemDto {
  product_id: number;
  concept?: string | null;

  quantity?: number | null;
  unit?: string | null;
  unit_price?: number | null;

  base_amount?: number | null;
  discount_amount?: number | null;
  tax_amount?: number | null;
  withheld_amount?: number | null;

  amount: number;

  payment_amount?: number | null;
  payment_date?: string | null;
}

export interface CreateDirectXmlExpenseFromTicketDto {
  date: string;
  supplier_id: number;
  cfdi_uuid: string;
  notes?: string | null;
  items: CreateDirectXmlExpenseFromTicketItemDto[];
}

export interface CreateDirectXmlExpenseFromTicketResponse {
  success: boolean;
  message: string;
  data: {
    purchase_order_id: number;
    purchase_order_folio: string;
    ticket_photo_id: number;
    expense_id: number;
    cfdi_uuid: string;
    total_amount: number;
  };
}

export interface PurchaseOrderExpenseItemDetailDto {
  id: number;
  item_type?: string | null;
  product?: {
    id: number;
    name: string;
  } | null;
  project?: PurchaseOrderProjectDto | null;
  concept?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  unit_id?: number | null;
  unit_name?: string | null;
  unit_price?: number | string | null;
  amount?: number | string | null;
  payment_amount?: number | string | null;
  payment_date?: string | null;
}

export interface PurchaseOrderExpenseLinkedItemDto
  extends PurchaseOrderExpenseItemDetailDto {
  link_item_id?: number | null;
  expense_item_id: number;
  amount_snapshot?: number | string | null;
  linked_at?: string | null;
}

export interface AvailableXmlExpenseItemDto extends PurchaseOrderExpenseItemDetailDto {
  id: number;
}

export interface AvailableXmlExpenseDto {
  id: number;
  date: string;
  internal_folio: string;
  total_amount: number | string;
  cfdi_uuid: string | null;
  supplier: {
    id: number;
    company_name: string;
  } | null;
  status: {
    id: number;
    name: string;
  } | null;
  available_items: AvailableXmlExpenseItemDto[];
  available_item_ids: number[];
  available_items_count: number;
  available_amount: number;
  available_paid_amount: number;
  available_balance: number;
  can_select: boolean;
}

export interface AvailableXmlExpensesResponse {
  data: AvailableXmlExpenseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FiltersAvailableXmlExpenses {
  // page: number;
  // limit: number;
  search?: string | null;
  supplier_id?: number | string | null;
  date_from?: string | null;
  date_to?: string | null;
  amount?: number | string | null;
}

export interface LinkExistingXmlExpenseDto {
  expense_id: number;
  expense_item_ids: number[];
  notes?: string | null;
}

export interface LinkExistingXmlExpenseResponse {
  success: boolean;
  message: string;
  data: {
    purchase_order_id: number;
    purchase_order_folio: string;
    ticket_photo_id: number;
    expense_id: number;
    expense_folio: string;
    cfdi_uuid: string;
    selected_item_ids: number[];
    amount_snapshot: number;
  };
}

export interface CreateWarehouseExpenseFromTicketItemDto {
  product_id: number;
  concept?: string | null;

  quantity: number;
  unit_id: number | null;
  unit_price: number;

  payment_amount?: number | null;
  payment_date?: string | null;
}

export interface CreateWarehouseExpenseFromTicketDto {
  date: string;
  supplier_id?: number | null;
  notes?: string | null;
  items: CreateWarehouseExpenseFromTicketItemDto[];
}

export interface CreateWarehouseExpenseFromTicketResponse {
  success: boolean;
  message: string;
  data: {
    purchase_order_id: number;
    purchase_order_folio: string;
    ticket_photo_id: number;
    expense_id: number;
    total_amount: number;
  };
}

export interface AvailableWarehouseXmlExpenseItemDto extends PurchaseOrderExpenseItemDetailDto {
  id: number;
}

export interface AvailableWarehouseXmlExpenseDto {
  id: number;
  date: string;
  internal_folio: string;
  total_amount: number | string;
  cfdi_uuid: string | null;

  supplier: {
    id: number;
    company_name: string;
  } | null;

  status: {
    id: number;
    name: string;
  } | null;

  available_items: AvailableWarehouseXmlExpenseItemDto[];
  available_item_ids: number[];
  available_items_count: number;

  available_amount: number;
  available_paid_amount: number;
  available_balance: number;

  can_select: boolean;
}

export interface AvailableWarehouseXmlExpensesResponse {
  data: AvailableWarehouseXmlExpenseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FiltersAvailableWarehouseXmlExpenses {
  // page: number;
  // limit: number;

  search?: string | null;
  supplier_id?: number | string | null;
  date_from?: string | null;
  date_to?: string | null;
  amount?: number | string | null;
}

export interface LinkExistingWarehouseXmlExpenseDto {
  expense_id: number;
  expense_item_ids: number[];
  notes?: string | null;
}

export interface LinkExistingWarehouseXmlExpenseResponse {
  success: boolean;
  message: string;
  data: {
    purchase_order_id: number;
    purchase_order_folio: string;
    ticket_photo_id: number;
    expense_id: number;
    expense_folio: string;
    cfdi_uuid: string;
    selected_item_ids: number[];
    amount_snapshot: number;
  };
}


export interface UpdateTicketPhotoProjectDto {
  project_id: number;
}

export interface UpdateTicketPhotoProjectResponse {
  success: boolean;
  message: string;
  data: PurchaseOrderTicketPhotoDto;
}

export interface DeleteTicketPhotoResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    file_name: string | null;
    deleted: boolean;
  };
}



