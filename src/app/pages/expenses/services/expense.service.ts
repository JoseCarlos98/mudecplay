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
  private xmlQueueTotal = 0;
  private xmlQueueIndex = 0; // cuántos se han consumido

  /**
   * Recibe todos los drafts válidos y prepara la cola.
   */
  setXmlQueueToImport(drafts: entity.XmlExpenseDraftDto[]): void {
    this.xmlDraftQueue = drafts ?? [];
    this.xmlQueueTotal = this.xmlDraftQueue.length;
    this.xmlQueueIndex = 0;
  }

  /**
   * Devuelve el siguiente draft de la cola y avanza el índice.
   * Si ya no hay más, devuelve null.
   */
  consumeNextXmlDraft(): entity.XmlExpenseDraftDto | null {
    if (!this.xmlDraftQueue.length) return null;
    if (this.xmlQueueIndex >= this.xmlQueueTotal) return null;

    const draft = this.xmlDraftQueue[this.xmlQueueIndex];
    this.xmlQueueIndex++;

    // Cuando ya se consumieron todos, limpiamos la cola
    if (this.xmlQueueIndex >= this.xmlQueueTotal) {
      this.xmlDraftQueue = [];
    }

    return draft;
  }

  /**
   * Para saber si, después de guardar, hay más XML en cola.
   */
  hasMoreXmlDrafts(): boolean {
    return this.xmlQueueIndex < this.xmlQueueTotal;
  }

  /**
   * Info para el contador visual en el formulario.
   */
  getXmlQueueStatus(): { total: number; processed: number; pending: number } {
    const total = this.xmlQueueTotal;
    const processed = Math.min(this.xmlQueueIndex, total);
    const pending = Math.max(total - processed, 0);
    return { total, processed, pending };
  }

  /**
   * Limpia la cola (por ejemplo al cancelar el flujo de importación).
   */
  clearXmlQueue(): void {
    this.xmlDraftQueue = [];
    this.xmlQueueTotal = 0;
    this.xmlQueueIndex = 0;
  }
}
