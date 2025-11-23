import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as entity from '../interfaces/supplier-interfaces';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccess, PaginatedResponse } from '../../../shared/interfaces/general-interfaces';
import { appendArray, setScalar } from '../../../shared/helpers/general-helpers';

@Injectable({
  providedIn: 'root'
})
export class SupplierService {
  private apiUrl = `${environment.apiUrl}/suppliers`;

  constructor(private readonly http: HttpClient) { }

  getSuppliers(filters?: entity.FiltersSupplier) {
    const url = `${this.apiUrl}`;
    let params = new HttpParams();

    console.log(filters);
    
    if (filters) {
      params = setScalar(params, 'page', filters.page);
      params = setScalar(params, 'limit', filters.limit);
      params = appendArray(params, 'suppliersIds', filters.suppliersIds ?? []);
      params = appendArray(params, 'areasIds', filters.areasIds ?? []);
      params = setScalar(params, 'email', filters.email?.trim());
      params = setScalar(params, 'phone', filters.phone?.trim());
    }

    return this.http.get<PaginatedResponse<entity.SupplierResponseDto>>(url, { params });
  }

  getById(id: number): Observable<entity.SupplierDetail> {
    const url = `${this.apiUrl}/${id}`;

    return this.http.get<entity.SupplierDetail>(url);
  }

  create(formData: entity.CreateSupplier): Observable<ApiSuccess> {
    const url = `${this.apiUrl}`;

    return this.http.post<ApiSuccess>(url, formData)
  }

  update(id: number, formData: entity.PatchSupplier): Observable<ApiSuccess> {
    const url = `${this.apiUrl}/${id}`;

    return this.http.patch<ApiSuccess>(url, formData)
  }

  remove(id: number): Observable<ApiSuccess> {
    const url = `${this.apiUrl}/${id}`;

    return this.http.delete<ApiSuccess>(url)
  }
}
