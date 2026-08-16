import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as entity from '../interfaces/employees-interfaces';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ApiSuccess, Catalog, PaginatedResponse } from '../../../../shared/interfaces/general-interfaces';
import { setScalar } from '../../../../shared/helpers/general-helpers';

@Injectable({
  providedIn: 'root',
})
export class EmployeesService {
  private apiUrl = `${environment.apiUrl}/employees`;
  private employeeAreasApiUrl = `${environment.apiUrl}/employee-areas`;

  constructor(private readonly http: HttpClient) {}

  getEmployees(
    filters?: entity.FiltersEmployees,
  ): Observable<PaginatedResponse<entity.EmployeeResponseDto>> {
    const url = `${this.apiUrl}`;
    let params = new HttpParams();

    if (filters) {
      params = setScalar(params, 'page', filters.page);
      params = setScalar(params, 'limit', filters.limit);
      params = setScalar(params, 'full_name', filters.full_name?.trim());
      params = setScalar(params, 'curp', filters.curp?.trim());
      params = setScalar(params, 'employee_area_id', filters.employee_area_id);
      params = setScalar(params, 'employment_status', filters.employment_status);
    }

    return this.http.get<PaginatedResponse<entity.EmployeeResponseDto>>(url, { params });
  }

  getById(id: number): Observable<entity.EmployeeResponseDto> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<entity.EmployeeResponseDto>(url);
  }

  create(formData: entity.CreateEmployee): Observable<ApiSuccess> {
    const url = `${this.apiUrl}`;
    return this.http.post<ApiSuccess>(url, formData);
  }

  update(id: number, formData: entity.PatchEmployee): Observable<ApiSuccess> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.patch<ApiSuccess>(url, formData);
  }

  remove(id: number): Observable<ApiSuccess> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete<ApiSuccess>(url);
  }

  getCatalog(search?: string): Observable<Catalog[]> {
    const url = `${this.apiUrl}/catalog`;
    let params = new HttpParams();

    params = setScalar(params, 'search', search?.trim());

    return this.http.get<Catalog[]>(url, { params });
  }

  getEmployeeAreasCatalog(search?: string): Observable<Catalog[]> {
    const url = `${this.employeeAreasApiUrl}/catalog`;
    let params = new HttpParams();

    params = setScalar(params, 'search', search?.trim());

    return this.http.get<Catalog[]>(url, { params });
  }
}