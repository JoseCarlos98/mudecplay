import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as entity from '../interfaces/products-interfaces';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccess, PaginatedResponse } from '../../../shared/interfaces/general-interfaces';
import { setScalar } from '../../../shared/helpers/general-helpers';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private apiUrl = `${environment.apiUrl}/products`;

  constructor(private readonly http: HttpClient) { }

  getProducts(filters?: entity.FiltersProducts) {
    const url = `${this.apiUrl}`;
    let params = new HttpParams();

    if (filters) {
      params = setScalar(params, 'page', filters.page);
      params = setScalar(params, 'limit', filters.limit);
      params = setScalar(params, 'name', filters.name?.trim());
    }

    return this.http.get<PaginatedResponse<entity.ProductResponseDto>>(url, { params });
  }


  create(formData: entity.CreateProduct): Observable<ApiSuccess> {
    const url = `${this.apiUrl}`;

    return this.http.post<ApiSuccess>(url, formData)
  }

  update(id: number, formData: entity.PatchProduct): Observable<ApiSuccess> {
    const url = `${this.apiUrl}/${id}`;

    return this.http.patch<ApiSuccess>(url, formData)
  }

  remove(id: number): Observable<ApiSuccess> {
    const url = `${this.apiUrl}/${id}`;

    return this.http.delete<ApiSuccess>(url)
  }
}
