import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiSuccess, PaginatedResponse } from '../../../shared/interfaces/general-interfaces';
import { setScalar } from '../../../shared/helpers/general-helpers';
import * as entity from '../interfaces/employee-area-interfaces';

@Injectable({
  providedIn: 'root',
})
export class EmployeeAreasService {
  private apiUrl = `${environment.apiUrl}/employee-areas`;

  constructor(private readonly http: HttpClient) {}

  getEmployeeAreas(
    filters?: entity.FiltersEmployeeArea,
  ): Observable<PaginatedResponse<entity.EmployeeAreaResponseDto>> {
    const url = `${this.apiUrl}`;
    let params = new HttpParams();

    if (filters) {
      params = setScalar(params, 'page', filters.page);
      params = setScalar(params, 'limit', filters.limit);
      params = setScalar(params, 'name', filters.name?.trim());
    }

    return this.http.get<PaginatedResponse<entity.EmployeeAreaResponseDto>>(url, { params });
  }

  create(formData: entity.CreateEmployeeArea): Observable<ApiSuccess> {
    const url = `${this.apiUrl}`;
    return this.http.post<ApiSuccess>(url, formData);
  }

  update(id: number, formData: entity.PatchEmployeeArea): Observable<ApiSuccess> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.patch<ApiSuccess>(url, formData);
  }

  remove(id: number): Observable<ApiSuccess> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete<ApiSuccess>(url);
  }
}