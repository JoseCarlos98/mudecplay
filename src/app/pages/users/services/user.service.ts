import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiSuccess, PaginatedResponse, Catalog } from '../../../shared/interfaces/general-interfaces';
import { setScalar } from '../../../shared/helpers/general-helpers';
import * as entity from '../interfaces/users-interfaces';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly apiUrl = `${environment.apiUrl}/users`;
  private readonly rolesUrl = `${environment.apiUrl}/roles/catalog`;

  constructor(private readonly http: HttpClient) {}

  // paginado con filtros SOLO name/email (más page/limit)
  getPaginated(
    filters: entity.FiltersUsers,
  ): Observable<PaginatedResponse<entity.UserResponseDto>> {
    let params = new HttpParams();
    params = setScalar(params, 'page', filters.page);
    params = setScalar(params, 'limit', filters.limit);
    params = setScalar(params, 'name', filters.name?.trim());
    params = setScalar(params, 'email', filters.email?.trim());

    return this.http.get<PaginatedResponse<entity.UserResponseDto>>(this.apiUrl, { params });
  }

  create(payload: entity.CreateUserPayload): Observable<ApiSuccess> {
    return this.http.post<ApiSuccess>(this.apiUrl, payload);
  }

  update(id: number, payload: entity.UpdateUserPayload): Observable<ApiSuccess> {
    return this.http.patch<ApiSuccess>(`${this.apiUrl}/${id}`, payload);
  }

  remove(id: number): Observable<ApiSuccess> {
    return this.http.delete<ApiSuccess>(`${this.apiUrl}/${id}`);
  }

  // catálogo filtrable por search (por si lo ocupas en autocomplete)
  rolesCatalog(search?: string): Observable<Catalog[]> {
    let params = new HttpParams();
    params = setScalar(params, 'search', search?.trim());
    return this.http.get<Catalog[]>(this.rolesUrl, { params });
  }

  // catálogo completo (sin search)
  // Backend esperado: GET /roles/catalog -> retorna todos si no hay ?search=
  rolesCatalogAll(): Observable<Catalog[]> {
    return this.http.get<Catalog[]>(this.rolesUrl);
  }
}
