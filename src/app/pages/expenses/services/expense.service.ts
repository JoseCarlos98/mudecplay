import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as entity from '../interfaces/expense-interfaces';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccess, PaginatedResponse } from '../../../shared/interfaces/general-interfaces';
import { appendArray, setScalar } from '../../../shared/helpers/general-helpers';

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private apiUrl = `${environment.apiUrl}/expenses`;
  private xmlDraftToImport: entity.XmlExpenseDraftDto | null = null;

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
      params = appendArray(params, 'providerIds', filters.suppliersIds ?? []);
      params = appendArray(params, 'projectIds', filters.projectIds ?? []);
      params = setScalar(params, 'statusId', filters.status_id);
      params = setScalar(params, 'paymentStatus', filters.paymentStatus?.trim());
    }

    return this.http.get<PaginatedResponse<entity.ExpenseResponseDto>>(url, { params });
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

  remove(id: number): Observable<ApiSuccess> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete<ApiSuccess>(url);
  }

  // ==========================
  // MANEJO DE XML DRAFT ÚNICO
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

  private xmlDraftQueue: entity.XmlExpenseDraftDto[] = [];
  private xmlDraftQueueIndex = 0;

  /**
   * Recibe todos los drafts válidos y prepara la cola.
   */
  setXmlQueueToImport(drafts: entity.XmlExpenseDraftDto[]): void {
    this.xmlDraftQueue = drafts ?? [];
    this.xmlDraftQueueIndex = 0;
  }

  /**
   * Devuelve el siguiente draft de la cola y avanza el índice.
   * Si se acaba la cola, la limpia.
   */
  consumeNextXmlDraft(): entity.XmlExpenseDraftDto | null {
    if (!this.xmlDraftQueue.length) return null;

    const draft = this.xmlDraftQueue[this.xmlDraftQueueIndex];
    this.xmlDraftQueueIndex++;

    if (this.xmlDraftQueueIndex >= this.xmlDraftQueue.length) {
      this.xmlDraftQueue = [];
      this.xmlDraftQueueIndex = 0;
    }

    return draft;
  }

  /**
   * Para saber si, después de guardar, hay más XML en cola.
   */
  hasMoreXmlDrafts(): boolean {
    return this.xmlDraftQueueIndex < this.xmlDraftQueue.length;
  }
}