import { HttpClient, HttpParams } from '@angular/common/http';

import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';

import {

  AuthorizedLabourExtraDto,

  CancelLabourExtraDto,

  CancelledLabourExtraDto,

  CreatedLabourOvertimeDto,

  CreatedLabourSundayDto,

  CreateLabourOvertimeDto,

  CreateLabourSundayDto,

  LabourExtraKind,

  LabourExtraFilters,

  LabourExtraPaginatedResponse,

  ReversedLabourExtraDto,

} from '../interfaces/overtime-interfaces';

/**
 * Servicio HTTP de horas extra y domingos trabajados.

 * No almacena registros simulados y no calcula salarios ni importes.

 * La UI deberá validar permisos y mostrar errores de API (403, 409, etc.).

 */

@Injectable({ providedIn: 'root' })

export class OvertimeService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/labour-extra`;

  getOvertime(filters: LabourExtraFilters): Observable<LabourExtraPaginatedResponse> {
    return this.list('overtime', filters);

  }

  getSundays(filters: LabourExtraFilters): Observable<LabourExtraPaginatedResponse> {
    return this.list('sunday', filters);

  }

  createOvertime(payload: CreateLabourOvertimeDto): Observable<CreatedLabourOvertimeDto> {

    return this.http.post<CreatedLabourOvertimeDto>(`${this.apiUrl}/overtime`, payload);

  }

  createSunday(payload: CreateLabourSundayDto): Observable<CreatedLabourSundayDto> {

    return this.http.post<CreatedLabourSundayDto>(`${this.apiUrl}/sunday`, payload);

  }

  authorizeOvertime(id: string | number): Observable<AuthorizedLabourExtraDto> {

    return this.authorize('overtime', id);

  }

  authorizeSunday(id: string | number): Observable<AuthorizedLabourExtraDto> {

    return this.authorize('sunday', id);

  }

  /** Cancela únicamente registros pendientes (pending). */

  cancelPendingOvertime(

    id: string | number,

    cancellationReason: string,

  ): Observable<CancelledLabourExtraDto> {

    return this.cancel('overtime', id, { cancellation_reason: cancellationReason });

  }

  cancelPendingSunday(

    id: string | number,

    cancellationReason: string,

  ): Observable<CancelledLabourExtraDto> {

    return this.cancel('sunday', id, { cancellation_reason: cancellationReason });

  }

  /**
   * Reversión de registros autorizados; puede devolver 409 si existe

   * una reserva de Nómina u otras restricciones (Tesorería, gastos, etc.).

   */

  reverseOvertime(

    id: string | number,

    cancellationReason: string,

  ): Observable<ReversedLabourExtraDto> {

    return this.reverse('overtime', id, { cancellation_reason: cancellationReason });

  }

  reverseSunday(

    id: string | number,

    cancellationReason: string,

  ): Observable<ReversedLabourExtraDto> {

    return this.reverse('sunday', id, { cancellation_reason: cancellationReason });

  }

  private list(
    kind: LabourExtraKind,
    filters: LabourExtraFilters,
  ): Observable<LabourExtraPaginatedResponse> {
    let params = new HttpParams()
      .set('page', String(filters.page))
      .set('limit', String(filters.limit));

    if (filters.work_date) params = params.set('work_date', filters.work_date);
    if (filters.employee_name?.trim()) {
      params = params.set('employee_name', filters.employee_name.trim());
    }
    if (filters.employee_ids?.length) {
      params = params.set('employee_ids', filters.employee_ids.join(','));
    }
    if (filters.project_ids?.length) {
      params = params.set('project_ids', filters.project_ids.join(','));
    }
    if (filters.employee_area_id != null) {
      params = params.set('employee_area_id', String(filters.employee_area_id));
    }
    if (filters.project_id != null) {
      params = params.set('project_id', String(filters.project_id));
    }
    if (filters.status) params = params.set('status', filters.status);
    if (filters.sorts?.length) {
      params = params.set('sort', filters.sorts
        .map((item) => `${item.key}:${item.direction}`).join(','));
    }

    return this.http.get<LabourExtraPaginatedResponse>(
      `${this.apiUrl}/${kind}`, { params },
    );
  }

  private authorize(

    kind: LabourExtraKind,

    id: string | number,

  ): Observable<AuthorizedLabourExtraDto> {

    return this.http.patch<AuthorizedLabourExtraDto>(

      `${this.apiUrl}/${kind}/${id}/authorize`,

      {},

    );

  }

  private cancel(

    kind: LabourExtraKind,

    id: string | number,

    payload: CancelLabourExtraDto,

  ): Observable<CancelledLabourExtraDto> {

    return this.http.patch<CancelledLabourExtraDto>(

      `${this.apiUrl}/${kind}/${id}/cancel`,

      payload,

    );

  }

  private reverse(

    kind: LabourExtraKind,

    id: string | number,

    payload: CancelLabourExtraDto,

  ): Observable<ReversedLabourExtraDto> {

    return this.http.patch<ReversedLabourExtraDto>(

      `${this.apiUrl}/${kind}/${id}/reverse`,

      payload,

    );

  }

}
