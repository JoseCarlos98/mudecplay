import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';

import {
  inject,
  Injectable,
} from '@angular/core';

import {
  Observable,
} from 'rxjs';



import * as entity
  from '../interfaces/expense-classifications.interfaces';
import { environment } from '../../../../environments/environment';
import { setScalar } from '../../../shared/helpers/general-helpers';


@Injectable({
  providedIn: 'root',
})
export class ExpenseClassificationsService {

  private readonly apiUrl =
    `${environment.apiUrl}/expense-classifications`;

  private readonly http =
    inject(HttpClient);


  // =========================================================
  // CLASIFICACIONES
  // =========================================================

  getClassifications(
    filters?:
      entity.ExpenseReportClassificationFilters,
  ): Observable<
    entity.ExpenseReportClassification[]
  > {

    let params =
      new HttpParams();

    if (filters) {

      params = setScalar(
        params,
        'search',
        filters.search?.trim(),
      );

      params = setScalar(
        params,
        'status',
        filters.status,
      );
    }

    return this.http.get<
      entity.ExpenseReportClassification[]
    >(
      `${this.apiUrl}/classifications`,
      {
        params,
      },
    );
  }


  createClassification(
    payload:
      entity.CreateExpenseReportClassificationPayload,
  ): Observable<
    entity.ExpenseReportClassification
  > {

    return this.http.post<
      entity.ExpenseReportClassification
    >(
      `${this.apiUrl}/classifications`,
      payload,
    );
  }


  updateClassification(
    classificationId: number,
    payload:
      entity.UpdateExpenseReportClassificationPayload,
  ): Observable<
    entity.ExpenseReportClassification
  > {

    return this.http.patch<
      entity.ExpenseReportClassification
    >(
      `${this.apiUrl}/classifications/${classificationId}`,
      payload,
    );
  }


  deactivateClassification(
    classificationId: number,
  ): Observable<
    entity.ExpenseReportClassification
  > {

    return this.http.patch<
      entity.ExpenseReportClassification
    >(
      `${this.apiUrl}/classifications/${classificationId}/deactivate`,
      {},
    );
  }


  reactivateClassification(
    classificationId: number,
  ): Observable<
    entity.ExpenseReportClassification
  > {

    return this.http.patch<
      entity.ExpenseReportClassification
    >(
      `${this.apiUrl}/classifications/${classificationId}/reactivate`,
      {},
    );
  }


  // =========================================================
  // PENDIENTES
  // =========================================================

  getPendingClassifications(
    filters?:
      entity.ExpenseClassificationPendingFilters,
  ): Observable<
    entity.ExpenseClassificationPendingResponse
  > {

    let params =
      new HttpParams();

    if (filters) {

      params = setScalar(
        params,
        'search',
        filters.search?.trim(),
      );

      params = setScalar(
        params,
        'sourceType',
        filters.sourceType,
      );

      params = setScalar(
        params,
        'page',
        filters.page,
      );

      params = setScalar(
        params,
        'limit',
        filters.limit,
      );
    }

    return this.http.get<
      entity.ExpenseClassificationPendingResponse
    >(
      `${this.apiUrl}/pending`,
      {
        params,
      },
    );
  }


  // =========================================================
  // HOMOLOGAR PENDIENTES
  // =========================================================

  classifyPending(
    payload:
      entity.BulkClassifyExpensePendingPayload,
  ): Observable<
    entity.BulkClassifyExpensePendingResponse
  > {

    return this.http.post<
      entity.BulkClassifyExpensePendingResponse
    >(
      `${this.apiUrl}/classify`,
      payload,
    );
  }


  // =========================================================
  // HOMOLOGACIONES EXISTENTES
  // =========================================================

  getMappings(
    filters:
      entity.ExpenseClassificationMappingFilters,
  ): Observable<
    entity.ExpenseClassificationMappingsResponse
  > {

    let params =
      new HttpParams();

    params = setScalar(
      params,
      'search',
      filters.search?.trim(),
    );

    params = setScalar(
      params,
      'sourceType',
      filters.sourceType,
    );

    params = setScalar(
      params,
      'status',
      filters.status,
    );

    params = setScalar(
      params,
      'classificationId',
      filters.classificationId,
    );

    params = setScalar(
      params,
      'page',
      filters.page,
    );

    params = setScalar(
      params,
      'limit',
      filters.limit,
    );

    return this.http.get<
      entity.ExpenseClassificationMappingsResponse
    >(
      `${this.apiUrl}/mappings`,
      {
        params,
      },
    );
  }


  // =========================================================
  // REASIGNAR HOMOLOGACIÓN
  // =========================================================

  reassignMapping(
    payload:
      entity.ReassignExpenseClassificationPayload,
  ): Observable<unknown> {

    return this.http.patch<unknown>(
      `${this.apiUrl}/mappings/reassign`,
      payload,
    );
  }


  // =========================================================
  // DESACTIVAR HOMOLOGACIÓN
  // =========================================================

  deactivateMapping(
    payload:
      entity.ChangeExpenseClassificationMappingStatusPayload,
  ): Observable<unknown> {

    return this.http.patch<unknown>(
      `${this.apiUrl}/mappings/deactivate`,
      payload,
    );
  }


  // =========================================================
  // REACTIVAR HOMOLOGACIÓN
  // =========================================================

  reactivateMapping(
    payload:
      entity.ChangeExpenseClassificationMappingStatusPayload,
  ): Observable<unknown> {

    return this.http.patch<unknown>(
      `${this.apiUrl}/mappings/reactivate`,
      payload,
    );
  }
}