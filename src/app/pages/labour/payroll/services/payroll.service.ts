import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import {
  CreatePayrollPeriodResponse,
  PayrollCalculationResponse,
  PayrollPeriodFilters,
  PayrollPeriodsPagedResponse,
} from '../interfaces/payroll-interfaces';

@Injectable({ providedIn: 'root' })
export class PayrollService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/payroll`;

  /** Filtros, resumen y paginación se resuelven en NestJS. */
  getPeriods(filters: PayrollPeriodFilters): Observable<PayrollPeriodsPagedResponse> {
    let params = new HttpParams()
      .set('page', String(filters.page))
      .set('limit', String(filters.limit));

    if (filters.week_from) params = params.set('week_from', filters.week_from);
    if (filters.week_to) params = params.set('week_to', filters.week_to);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.period_id) params = params.set('period_id', filters.period_id);
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.direction) params = params.set('direction', filters.direction);

    return this.http.get<PayrollPeriodsPagedResponse>(`${this.url}/periods`, { params });
  }

  /** Body autorizado por backend: únicamente week_start (domingo YYYY-MM-DD). */
  createPeriod(week_start: string): Observable<CreatePayrollPeriodResponse> {
    return this.http.post<CreatePayrollPeriodResponse>(`${this.url}/periods`, {
      week_start,
    });
  }

  /** Calcula un borrador; no aprueba, cierra ni registra pagos. */
  calculatePeriod(periodId: string): Observable<PayrollCalculationResponse> {
    return this.http.post<PayrollCalculationResponse>(
      `${this.url}/periods/${encodeURIComponent(periodId)}/calculate`,
      {},
    );
  }
}
