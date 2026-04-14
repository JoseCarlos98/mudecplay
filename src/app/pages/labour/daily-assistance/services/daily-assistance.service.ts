import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { PaginatedResponse } from '../../../../shared/interfaces/general-interfaces';
import * as entity from '../interfaces/daily-assistance-interfaces';

@Injectable({
  providedIn: 'root',
})
export class DailyAssistanceService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/employee-attendances`;
  private readonly employeesApiUrl = `${environment.apiUrl}/employees`;

  getAttendances(
    filters: entity.FiltersDailyAssistance,
  ): Observable<PaginatedResponse<entity.EmployeeAttendanceRow>> {
    let params = new HttpParams()
      .set('page', String(filters.page))
      .set('limit', String(filters.limit));

    if (filters.work_date) {
      params = params.set('work_date', filters.work_date);
    }

    if (filters.status) {
      params = params.set('status', filters.status);
    }

    if (filters.employee_id) {
      params = params.set('employee_id', String(filters.employee_id));
    }

    if (filters.project_id) {
      params = params.set('project_id', String(filters.project_id));
    }

    return this.http.get<PaginatedResponse<entity.EmployeeAttendanceRow>>(
      this.apiUrl,
      { params },
    );
  }

  getAttendanceEmployees(
    search?: string,
  ): Observable<entity.EmployeeAttendanceCatalogRow[]> {
    let params = new HttpParams();

    if (search?.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<entity.EmployeeAttendanceCatalogRow[]>(
      `${this.employeesApiUrl}/attendance-catalog`,
      { params },
    );
  }

  create(
    payload: entity.CreateEmployeeAttendance,
  ): Observable<entity.SuccessResponse> {
    return this.http.post<entity.SuccessResponse>(this.apiUrl, payload);
  }

  update(
    id: number,
    payload: entity.UpdateEmployeeAttendance,
  ): Observable<entity.SuccessResponse> {
    return this.http.patch<entity.SuccessResponse>(`${this.apiUrl}/${id}`, payload);
  }

  cancel(
    id: number,
    payload: entity.CancelEmployeeAttendance,
  ): Observable<entity.SuccessResponse> {
    return this.http.patch<entity.SuccessResponse>(
      `${this.apiUrl}/${id}/cancel`,
      payload,
    );
  }
}