import {
  HttpClient,
} from '@angular/common/http';

import {
  inject,
  Injectable,
} from '@angular/core';

import {
  Observable,
} from 'rxjs';

import {
  environment,
} from '../../../../environments/environment';

import * as entity from '../interfaces/reports-interfaces';


@Injectable({
  providedIn:
    'root',
})
export class ExpenseAnalysisService {


  // ==========================================================
  // INYECCIONES
  // ==========================================================

  private readonly http =
    inject(
      HttpClient,
    );


  // ==========================================================
  // URL BASE
  // ==========================================================

  private readonly apiUrl =
    `${environment.apiUrl}/reports`;


  // ==========================================================
  // ANÁLISIS DE GASTOS - DATA
  // ==========================================================

  getExpenseAnalysisData(
    filters:
      entity.ExpenseAnalysisFilters,
  ):
    Observable<
      entity.ExpenseAnalysisResponse
    > {

    return this.http.post<
      entity.ExpenseAnalysisResponse
    >(
      `${this.apiUrl}/expense-analysis/data`,
      filters,
    );
  }


  // ==========================================================
  // ANÁLISIS DE GASTOS - EXCEL
  // ==========================================================

  exportExpenseAnalysisExcel(
    filters:
      entity.ExpenseAnalysisFilters,
  ):
    Observable<Blob> {

    return this.http.post(
      `${this.apiUrl}/expense-analysis/export-excel`,
      filters,
      {
        responseType:
          'blob',
      },
    );
  }
}