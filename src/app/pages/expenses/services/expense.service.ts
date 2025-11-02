import { HttpClient } from '@angular/common/http';
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

    return this.http.get<PaginatedResponse<entity.ExpenseResponseDto>>(url).pipe(
      map((response) => {
        return Mapper.mapToExpenseList(response);
      })
    )
  }



  //   // const params = new HttpParams()
  //   //   .set('pageSize', filters.pageSize)
  //   //   .set('page', filters.page)
  //   //   .set('startDate', filters.startDate)
  //   //   .set('endDate', filters.endDate!);
}
