import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';


import * as entity from '../interfaces/attendance-tardiness.interfaces';
import { environment } from '../../../../../environments/environment';
import { ApiSuccess, Catalog, PaginatedResponse } from '../../../../shared/interfaces/general-interfaces';

@Injectable({
  providedIn: 'root',
})
export class AttendanceTardinessService {
  private readonly apiUrl = `${environment.apiUrl}/employee-attendances`;
  private readonly employeeAreasApiUrl = `${environment.apiUrl}/employee-areas`;

  constructor(private readonly http: HttpClient) { }

  getAttendances(
    filters?: entity.AttendanceTardinessFilters,
  ): Observable<PaginatedResponse<entity.EmployeeAttendanceResponseDto>> {
    let params = new HttpParams();

    if (filters) {
      if (filters.page != null) {
        params = params.set('page', String(filters.page));
      }

      if (filters.limit != null) {
        params = params.set('limit', String(filters.limit));
      }

      if (filters.work_date) {
        params = params.set('work_date', filters.work_date);
      }

      if (filters.employee_name?.trim()) {
        params = params.set('employee_name', filters.employee_name.trim());
      }

      if (filters.employee_area_id != null) {
        params = params.set('employee_area_id', String(filters.employee_area_id));
      }

      if (filters.arrival_status) {
        params = params.set('arrival_status', filters.arrival_status);
      }

      if (filters.status) {
        params = params.set('status', filters.status);
      }
    }

    return this.http.get<PaginatedResponse<entity.EmployeeAttendanceResponseDto>>(
      this.apiUrl,
      { params },
    );
  }

  upsertArrival(
    id: number,
    payload: entity.UpsertEmployeeAttendanceArrivalDto,
  ): Observable<ApiSuccess> {
    return this.http.patch<ApiSuccess>(`${this.apiUrl}/${id}/arrival`, payload);
  }

  getEmployeeAreasCatalog(search?: string): Observable<Catalog[]> {
    let params = new HttpParams();

    if (search?.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<Catalog[]>(
      `${this.employeeAreasApiUrl}/catalog`,
      { params },
    );
  }
}