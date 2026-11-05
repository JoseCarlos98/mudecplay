import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ClockEmployeeMapping,
  ClockImportPreviewResponse,
  ClockImportReconcileResult,
  ClockImportStageResult,
  ClockMappingSaveResult,
  ClockStagedRowsResult,
  ClockSaveDecisionPayload,
  ClockDecisionResult,
  ClockApplyPreflightResult,
  ClockApplyRowResult,
  ClockBulkResult,
  ClockImportHistoryResult,
} from '../interfaces/attendance-clock-import.interfaces';
import { environment } from '../../../../../../../environments/environment';

/** Servicio del importador. Independiente del registro manual de llegadas. */
@Injectable({ providedIn: 'root' })
export class AttendanceClockImportService {
  private readonly http = inject(HttpClient);
  private readonly attendancesUrl = `${environment.apiUrl}/employee-attendances`;
  private readonly importsUrl = `${this.attendancesUrl}/imports`;

  /** Solo lectura. */
  preview(file: File): Observable<ClockImportPreviewResponse> {
    return this.http.post<ClockImportPreviewResponse>(
      `${this.importsUrl}/preview`, this.buildFileFormData(file),
    );
  }

  /** Lista las vinculaciones guardadas permanentemente. */
  getMappings(): Observable<ClockEmployeeMapping[]> {
    return this.http.get<ClockEmployeeMapping[]>(`${this.attendancesUrl}/clock-mappings`);
  }

  /** Guardar UNA vinculación verificada manualmente. */
  saveMapping(employeeId: number, clockNumber: string): Observable<ClockMappingSaveResult> {
    return this.http.post<ClockMappingSaveResult>(`${this.attendancesUrl}/clock-mappings`, {
      employee_id: employeeId,
      clock_employee_number: clockNumber,
    });
  }

  /** Guarda un lote para revisión, sin aplicar ninguna asistencia. Rechaza SHA duplicado. */
  stage(file: File): Observable<ClockImportStageResult> {
    return this.http.post<ClockImportStageResult>(
      `${this.importsUrl}/stage`, this.buildFileFormData(file),
    );
  }

  /** Historial paginado: conserva nombre original y fecha de cada carga. */
  getHistory(page: number, limit: number): Observable<ClockImportHistoryResult> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));
    return this.http.get<ClockImportHistoryResult>(this.importsUrl, { params });
  }

  /** Abre un lote ya guardado, con paginación del backend. */
  getRows(importId: number, page: number, limit: number): Observable<ClockStagedRowsResult> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));
    return this.http.get<ClockStagedRowsResult>(`${this.importsUrl}/${importId}/rows`, { params });
  }

  /** Recalcula únicamente filas sin decisión, tras vincular trabajadores. */
  reconcile(importId: number): Observable<ClockImportReconcileResult> {
    return this.http.post<ClockImportReconcileResult>(`${this.importsUrl}/${importId}/reconcile`, {});
  }

  /** Guardar UNA decisión humana en staging. No modifica la asistencia. */
  saveDecision(importId: number, rowId: number, payload: ClockSaveDecisionPayload): Observable<ClockDecisionResult> {
    return this.http.patch<ClockDecisionResult>(
      `${this.importsUrl}/${importId}/rows/${rowId}/decision`, payload,
    );
  }

  /** Verifica todas las decisiones guardadas; no modifica la asistencia. */
  getApplyPreview(importId: number): Observable<ClockApplyPreflightResult> {
    return this.http.get<ClockApplyPreflightResult>(`${this.importsUrl}/${importId}/apply-preview`);
  }

  /** Aplica UNA decisión autorizada después de la prevalidación; el servidor revalida. */
  applyDecision(importId: number, rowId: number): Observable<ClockApplyRowResult> {
    return this.http.post<ClockApplyRowResult>(`${this.importsUrl}/${importId}/rows/${rowId}/apply`, {});
  }

  /** Aprueba llegadas estándar seleccionadas; no crea ni modifica asistencias. */
  bulkApproveArrivals(importId: number, rowIds: number[]): Observable<ClockBulkResult> {
    return this.http.post<ClockBulkResult>(
      `${this.importsUrl}/${importId}/bulk/approve-arrivals`, { row_ids: rowIds },
    );
  }

  /** Aplica llegadas estándar aprobadas tras una prevalidación y confirmación. */
  bulkApplyArrivals(importId: number, rowIds: number[]): Observable<ClockBulkResult> {
    return this.http.post<ClockBulkResult>(
      `${this.importsUrl}/${importId}/bulk/apply-arrivals`, { row_ids: rowIds },
    );
  }

  private buildFileFormData(file: File): FormData {
    const data = new FormData();
    data.append('file', file, file.name);
    return data;
  }



  /** Corrige una vinculación existente del reloj checador. */
  correctMapping(
    employeeId: number,
    clockNumber: string,
  ): Observable<ClockMappingSaveResult> {
    return this.http.patch<ClockMappingSaveResult>(
      `${this.attendancesUrl}/clock-mappings`,
      {
        employee_id: employeeId,
        clock_employee_number: clockNumber,
      },
    );
  }

}
