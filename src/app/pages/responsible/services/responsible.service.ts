import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as entity from '../interfaces/responsible-interfaces';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccess, PaginatedResponse } from '../../../shared/interfaces/general-interfaces';
import { appendArray, setScalar } from '../../../shared/helpers/general-helpers';

@Injectable({
  providedIn: 'root'
})
export class ResponsibleService {
  private apiUrl = `${environment.apiUrl}/responsibles`;

  constructor(private readonly http: HttpClient) { }

  getResposible(filters?: entity.FiltersResponsible) {
    const url = `${this.apiUrl}`;
    let params = new HttpParams();

    if (filters) {
      params = setScalar(params, 'page', filters.page);
      params = setScalar(params, 'limit', filters.limit);
      params = appendArray(params, 'clientsIds', filters.clientsIds ?? []);
      params = setScalar(params, 'name', filters.name?.trim());
      params = setScalar(params, 'phone', filters.phone?.trim());
      params = setScalar(params, 'email', filters.email?.trim());
    }

    return this.http.get<PaginatedResponse<entity.ResponsibleResponseDto>>(url, { params });
  }

  // getById(id: number): Observable<entity.ProjectDetail> {
  //   const url = `${this.apiUrl}/${id}`;

  //   return this.http.get<entity.ProjectDetail>(url);
  // }

  create(formData: entity.CreateResponsible): Observable<ApiSuccess> {
    const url = `${this.apiUrl}`;

    return this.http.post<ApiSuccess>(url, formData)
  }

  update(id: number, formData: entity.PatchResponsible): Observable<ApiSuccess> {
    const url = `${this.apiUrl}/${id}`;

    return this.http.patch<ApiSuccess>(url, formData)
  }

  remove(id: number): Observable<ApiSuccess> {
    const url = `${this.apiUrl}/${id}`;

    return this.http.delete<ApiSuccess>(url)
  }
}
