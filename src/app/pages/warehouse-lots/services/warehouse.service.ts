import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  ApiSuccess,
  PaginatedResponse,
} from '../../../shared/interfaces/general-interfaces';

import * as entity from '../interfaces/warehouse-interfaces';

@Injectable({
  providedIn: 'root',
})
export class WarehouseService {
  private readonly apiUrl = `${environment.apiUrl}/expenses/warehouse`;
  private readonly http = inject(HttpClient);

  getWarehouseLots(
    filters?: entity.WarehouseLotFilters,
  ): Observable<PaginatedResponse<entity.WarehouseLotResponseDto>> {
    const url = `${this.apiUrl}/lots`;
    let params = new HttpParams();

    if (filters) {
      params = params.set('page', String(filters.page));
      params = params.set('limit', String(filters.limit));

      if (filters.search?.trim()) {
        params = params.set('search', filters.search.trim());
      }

      if (filters.productSearch?.trim()) {
        params = params.set('productSearch', filters.productSearch.trim());
      }

      if (filters.supplierIds?.length) {
        params = params.set('supplierIds', filters.supplierIds.join(','));
      }

      if (filters.stockView) {
        params = params.set('stockView', filters.stockView);
      }

      if (filters.status) {
        params = params.set('status', String(filters.status));
      }
    }

    return this.http.get<PaginatedResponse<entity.WarehouseLotResponseDto>>(
      url,
      { params },
    );
  }

  assignWarehouseLot(
    lotId: number | string,
    formData: entity.AssignWarehouseLotDto,
  ): Observable<ApiSuccess> {
    const url = `${this.apiUrl}/lots/${lotId}/assign`;

    return this.http.post<ApiSuccess>(url, formData);
  }

  getWarehouseLotMovements(
    lotId: number | string,
  ): Observable<entity.WarehouseMovementResponseDto[]> {
    const url = `${this.apiUrl}/lots/${lotId}/movements`;

    return this.http.get<entity.WarehouseMovementResponseDto[]>(url);
  }

  returnWarehouseMovement(
    movementId: number | string,
    formData: entity.ReturnWarehouseMovementDto,
  ): Observable<ApiSuccess> {
    const url = `${this.apiUrl}/movements/${movementId}/return`;

    return this.http.post<ApiSuccess>(url, formData);
  }

  getWarehouseCancelPreview(
    expenseId: number,
  ): Observable<entity.WarehouseCancelPreviewDto> {
    return this.http.get<entity.WarehouseCancelPreviewDto>(
      `${environment.apiUrl}/expenses/${expenseId}/warehouse-cancel-preview`,
    );
  }

  cancelWarehouseExpense(
    expenseId: number,
    payload: entity.CancelWarehouseExpenseDto,
  ): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${environment.apiUrl}/expenses/${expenseId}/cancel-warehouse`,
      payload,
    );
  }
}