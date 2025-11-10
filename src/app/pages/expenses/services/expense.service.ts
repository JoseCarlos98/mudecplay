import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as entity from '../interfaces/expense-interfaces';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccess, PaginatedResponse } from '../../../shared/interfaces/general-interfaces';

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private apiUrl = `${environment.apiUrl}/expenses`;

  constructor(private readonly http: HttpClient) { }

  getExpenses(filters?: entity.FiltersExpenses) {
    const url = `${this.apiUrl}`;
    let params = new HttpParams();

    if (filters) {
      // paginación
      if (filters.page) params = params.set('page', String(filters.page));
      if (filters.limit) params = params.set('limit', String(filters.limit));

      // fechas
      if (filters.startDate) params = params.set('startDate', filters.startDate);

      if (filters.endDate) params = params.set('endDate', filters.endDate);

      // relaciones
      if (filters.supplier_id) params = params.set('supplier_id', String(filters.supplier_id));
      if (filters.project_id) params = params.set('project_id', String(filters.project_id));

      // estatus
      if (filters.status_id) params = params.set('status_id', filters.status_id);

      // texto
      if (filters.concept && filters.concept.trim() !== '') params = params.set('concept', filters.concept.trim());
    }

    return this.http.get<PaginatedResponse<entity.ExpenseResponseDto>>(url, { params });
  }

  create(formData: entity.CreateExpense): Observable<ApiSuccess> {
    const url = `${this.apiUrl}`;

    return this.http.post<ApiSuccess>(url, formData)
  }

  update(id: number, formData: entity.PatchExpense): Observable<ApiSuccess> {
    const url = `${this.apiUrl}/${id}`;

    return this.http.patch<ApiSuccess>(url, formData)
  }

  remove(id: number): Observable<ApiSuccess> {
    const url = `${this.apiUrl}/${id}`;

    return this.http.delete<ApiSuccess>(url)
  }
}
