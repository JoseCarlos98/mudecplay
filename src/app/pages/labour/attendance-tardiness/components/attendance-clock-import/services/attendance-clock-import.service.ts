import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { ClockImportPreviewResponse } from '../interfaces/attendance-clock-import.interfaces';

/** Servicio exclusivo del flujo del reloj. No modifica el servicio de llegadas manuales. */
@Injectable({ providedIn: 'root' })
export class AttendanceClockImportService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/employee-attendances/imports`;

  /** Solo analiza el .xls: no crea lotes, asistencias, descuentos ni gastos. */
  preview(file: File): Observable<ClockImportPreviewResponse> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<ClockImportPreviewResponse>(
      `${this.apiUrl}/preview`,
      formData,
    );
  }
}
