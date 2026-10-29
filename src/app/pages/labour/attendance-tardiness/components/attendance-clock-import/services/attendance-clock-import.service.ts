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

  private buildFileFormData(file: File): FormData {
    const data = new FormData();
    data.append('file', file, file.name);
    return data;
  }
}
