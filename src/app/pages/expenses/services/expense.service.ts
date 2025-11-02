import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as entity from '../interfaces/expense-interfaces';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Mapper } from '../mapper/expense-mapper';
import { PaginatedResponse } from '../../../shared/general-interfaces/general-interfaces';

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {

  private apiUrl = `${environment.apiUrl}/expenses`;


  constructor(
    private readonly http: HttpClient
  ) { }

  getExpenses(filters?: entity.FiltersExpenses) {
    const url = `${this.apiUrl}`;
    let params = new HttpParams();

    if (filters) {
      if (filters.page) params = params.set('page', String(filters.page));
      if (filters.limit) params = params.set('limit', String(filters.limit));
    }

    return this.http.get<PaginatedResponse<entity.ExpenseResponseDto>>(url, { params }).pipe(
      map((response) => {
        return Mapper.mapToExpenseList(response);
      })
    )
  }
}
