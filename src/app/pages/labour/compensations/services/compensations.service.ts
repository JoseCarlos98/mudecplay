import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import {
  CompensationActionResponse,
  CompensationsFilters,
  CompensationsPagedResponse,
  CreateCompensationDto,
} from '../interfaces/compensations-interfaces';

@Injectable({ providedIn: 'root' })
export class CompensationsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/employee-finance/compensations`;

  /** Listado, indicadores, filtros y paginación son propiedad del backend. */
  getCompensations(filters: CompensationsFilters): Observable<CompensationsPagedResponse> {
    let params = new HttpParams()
      .set('page', String(filters.page))
      .set('limit', String(filters.limit));

    if (filters.employee_ids?.length) {
      params = params.set('employee_ids', filters.employee_ids.join(','));
    }
    if (filters.employee_name?.trim()) {
      params = params.set('employee_name', filters.employee_name.trim());
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    if (filters.effective_from) {
      params = params.set('effective_from', filters.effective_from);
    }
    if (filters.effective_to) {
      params = params.set('effective_to', filters.effective_to);
    }
    if (filters.sorts?.length) {
      params = params.set(
        'sort',
        filters.sorts.map(({ key, direction }) => `${key}:${direction}`).join(','),
      );
    }

    return this.http.get<CompensationsPagedResponse>(this.url, { params });
  }

  /** La creación deja la compensación pendiente; no paga automáticamente. */
  createCompensation(body: CreateCompensationDto): Observable<CompensationActionResponse> {
    return this.http.post<CompensationActionResponse>(this.url, body);
  }

  /** Solo una compensación pendiente puede aprobarse. */
  approveCompensation(id: string): Observable<CompensationActionResponse> {
    return this.http.patch<CompensationActionResponse>(
      `${this.url}/${encodeURIComponent(id)}/approve`,
      {},
    );
  }

  /** Solo una compensación pendiente puede cancelarse, con motivo. */
  cancelCompensation(
    id: string,
    cancellationReason: string,
  ): Observable<CompensationActionResponse> {
    return this.http.patch<CompensationActionResponse>(
      `${this.url}/${encodeURIComponent(id)}/cancel`,
      { cancellation_reason: cancellationReason },
    );
  }
}
