import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as entity from '../interfaces/expense-interfaces';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiSuccess,
  PaginatedResponse,
} from '../../../shared/interfaces/general-interfaces';
import { appendArray, setScalar } from '../../../shared/helpers/general-helpers';

@Injectable({
  providedIn: 'root',
})
export class ExpenseService {
  private apiUrl = `${environment.apiUrl}/expenses`;

  // draft viejo (por si aún lo usas en otra parte)
  private xmlDraftToImport: entity.XmlExpenseDraftDto | null = null;

  // ==========================
  //  COLA DE XML
  // ==========================
  private xmlDraftQueue: entity.XmlExpenseDraftDto[] = [];
  private xmlDraftQueueIndex = 0;

  constructor(private readonly http: HttpClient) {}

  // ==========================
  // CRUD DE EXPENSES
  // ==========================

  getExpenses(filters?: entity.FiltersExpenses) {
    const url = `${this.apiUrl}`;
    let params = new HttpParams();

    if (filters) {
      params = setScalar(params, 'page', filters.page);
      params = setScalar(params, 'limit', filters.limit);
      params = setScalar(params, 'startDate', filters.startDate);
      params = setScalar(params, 'endDate', filters.endDate);
      params = appendArray(params, 'suppliersIds', filters.suppliersIds ?? []);
      params = appendArray(params, 'projectIds', filters.projectIds ?? []);
      params = setScalar(params, 'statusId', filters.status_id);
      params = setScalar(params, 'paymentStatus', filters.paymentStatus?.trim());
    }

    return this.http.get<PaginatedResponse<entity.ExpenseResponseDto>>(url, {
      params,
    });
  }

  getById(id: number): Observable<entity.ExpenseDetail> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<entity.ExpenseDetail>(url);
  }

  create(formData: entity.CreateExpense): Observable<ApiSuccess> {
    const url = `${this.apiUrl}`;
    return this.http.post<ApiSuccess>(url, formData);
  }

  update(id: number, formData: entity.UpdateExpense): Observable<ApiSuccess> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.patch<ApiSuccess>(url, formData);
  }

  updateWarehouseExpenseSafe(
    id: number,
    formData: entity.UpdateWarehouseExpenseSafe,
  ): Observable<ApiSuccess> {
    const url = `${this.apiUrl}/${id}/warehouse-safe-update`;
    return this.http.patch<ApiSuccess>(url, formData);
  }

  remove(id: number): Observable<ApiSuccess> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete<ApiSuccess>(url);
  }

  // ==========================
  // MANEJO DE XML DRAFT ÚNICO (legacy)
  // ==========================

  setXmlDraftToImport(draft: entity.XmlExpenseDraftDto) {
    this.xmlDraftToImport = draft;
  }

  consumeXmlDraftToImport(): entity.XmlExpenseDraftDto | null {
    const tmp = this.xmlDraftToImport;
    this.xmlDraftToImport = null;
    return tmp;
  }

  // ==========================
  // SUBIDA DE XML
  // ==========================

  uploadXml(files: File[]): Observable<entity.XmlPreviewResponseDto> {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));

    return this.http.post<entity.XmlPreviewResponseDto>(
      `${this.apiUrl}/xml/preview`,
      formData,
    );
  }

  // ==========================
  // COLA DE DRAFTS DESDE XML
  // ==========================

  setXmlQueueToImport(drafts: entity.XmlExpenseDraftDto[]): void {
    this.xmlDraftQueue = drafts ?? [];
    this.xmlDraftQueueIndex = 0;
  }

  consumeNextXmlDraft(): entity.XmlExpenseDraftDto | null {
    if (!this.xmlDraftQueue.length) return null;
    if (this.xmlDraftQueueIndex >= this.xmlDraftQueue.length) return null;

    const draft = this.xmlDraftQueue[this.xmlDraftQueueIndex];
    this.xmlDraftQueueIndex++;
    return draft;
  }

  hasMoreXmlDrafts(): boolean {
    return this.xmlDraftQueueIndex < this.xmlDraftQueue.length;
  }

  getXmlQueueStatus(): { total: number; pending: number } {
    const total = this.xmlDraftQueue.length;
    const pending = Math.max(total - this.xmlDraftQueueIndex, 0);
    return { total, pending };
  }

  clearXmlQueue(): void {
    this.xmlDraftQueue = [];
    this.xmlDraftQueueIndex = 0;
  }

  // ==========================
  // PDF / ARCHIVO
  // ==========================

  downloadReceiptPdf(id: number): Observable<Blob> {
    const url = `${this.apiUrl}/${id}/receipt-pdf`;
    return this.http.get(url, { responseType: 'blob' });
  }

  archive(id: number): Observable<ApiSuccess> {
    const url = `${this.apiUrl}/${id}/archive`;
    return this.http.patch<ApiSuccess>(url, {});
  }

  // =====================================================
  //  ALMACÉN - EXISTENCIAS
  // =====================================================

  getWarehouseLots(
    filters?: entity.WarehouseLotFilters,
  ): Observable<PaginatedResponse<entity.WarehouseLotResponseDto>> {
    const url = `${this.apiUrl}/warehouse/lots`;
    let params = new HttpParams();

    if (filters) {
      params = setScalar(params, 'page', filters.page);
      params = setScalar(params, 'limit', filters.limit);
      params = setScalar(params, 'productId', filters.productId);
      params = setScalar(params, 'status', filters.status);
      params = setScalar(params, 'search', filters.search?.trim());
    }

    return this.http.get<PaginatedResponse<entity.WarehouseLotResponseDto>>(
      url,
      { params },
    );
  }

  assignWarehouseLot(
    lotId: number | string,
    payload: entity.AssignWarehouseLotDto,
  ): Observable<ApiSuccess> {
    const url = `${this.apiUrl}/warehouse/lots/${lotId}/assign`;
    return this.http.post<ApiSuccess>(url, payload);
  }

  getWarehouseLotMovements(
    lotId: number | string,
  ): Observable<entity.WarehouseMovementResponseDto[]> {
    const url = `${this.apiUrl}/warehouse/lots/${lotId}/movements`;
    return this.http.get<entity.WarehouseMovementResponseDto[]>(url);
  }

  returnWarehouseMovement(
    movementId: number | string,
    payload: entity.ReturnWarehouseMovementDto,
  ): Observable<ApiSuccess> {
    const url = `${this.apiUrl}/warehouse/movements/${movementId}/return`;
    return this.http.post<ApiSuccess>(url, payload);
  }
}