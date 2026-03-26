import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiSuccess, PaginatedResponse } from '../../../shared/interfaces/general-interfaces';
import { setScalar } from '../../../shared/helpers/general-helpers';
import * as entity from '../interfaces/area-interfaces';

@Injectable({
  providedIn: 'root',
})
export class AreasService {
  private apiUrl = `${environment.apiUrl}/areas`;

  constructor(private readonly http: HttpClient) {}

  getAreas(filters?: entity.FiltersArea): Observable<PaginatedResponse<entity.AreaResponseDto>> {
    const url = `${this.apiUrl}`;
    let params = new HttpParams();

    if (filters) {
      params = setScalar(params, 'page', filters.page);
      params = setScalar(params, 'limit', filters.limit);
      params = setScalar(params, 'name', filters.name?.trim());
    }

    return this.http.get<PaginatedResponse<entity.AreaResponseDto>>(url, { params });
  }

  create(formData: entity.CreateArea): Observable<ApiSuccess> {
    const url = `${this.apiUrl}`;
    return this.http.post<ApiSuccess>(url, formData);
  }

  update(id: number, formData: entity.PatchArea): Observable<ApiSuccess> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.patch<ApiSuccess>(url, formData);
  }

  remove(id: number): Observable<ApiSuccess> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete<ApiSuccess>(url);
  }
}