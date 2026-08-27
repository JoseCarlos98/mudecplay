import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';

import {
  Injectable,
} from '@angular/core';

import {
  Observable,
} from 'rxjs';

import {
  environment,
} from '../../../../environments/environment';

import {
  ApiSuccess,
  PaginatedResponse,
} from '../../../shared/interfaces/general-interfaces';

import * as entity
  from '../interfaces/accounts-receivable-interfaces';


@Injectable({
  providedIn: 'root',
})
export class AccountsReceivableService {

  private readonly apiUrl =
    `${environment.apiUrl}/accounts-receivable`;

  private xmlDraftQueue:
    entity.XmlAccountReceivableDraftDto[] = [];

  private xmlDraftQueueIndex = 0;


  // =========================================================
  // LISTADO
  // =========================================================

  getAccountsReceivable(
    filters?:
      entity.FiltersAccountsReceivable,
  ): Observable<
    PaginatedResponse<
      entity.AccountReceivableResponseDto
    >
  > {

    let params =
      new HttpParams();

    if (filters) {

      if (
        filters.page !==
        undefined
      ) {
        params =
          params.set(
            'page',
            String(filters.page),
          );
      }

      if (
        filters.limit !==
        undefined
      ) {
        params =
          params.set(
            'limit',
            String(filters.limit),
          );
      }

      if (filters.startDate) {
        params =
          params.set(
            'startDate',
            filters.startDate,
          );
      }

      if (filters.endDate) {
        params =
          params.set(
            'endDate',
            filters.endDate,
          );
      }

      if (
        filters.folio?.trim()
      ) {
        params =
          params.set(
            'folio',
            filters.folio.trim(),
          );
      }

      if (
        filters.companyCode?.trim()
      ) {
        params =
          params.set(
            'companyCode',
            filters.companyCode.trim(),
          );
      }

      if (
        filters.clientQuery?.trim()
      ) {
        params =
          params.set(
            'clientQuery',
            filters.clientQuery.trim(),
          );
      }

      if (filters.status) {
        params =
          params.set(
            'status',
            filters.status,
          );
      }
    }

    return this.http.get<
      PaginatedResponse<
        entity.AccountReceivableResponseDto
      >
    >(
      this.apiUrl,
      {
        params,
      },
    );
  }


  // =========================================================
  // DETALLE
  // =========================================================

  getById(
    id: number,
  ): Observable<
    entity.AccountReceivableDetail
  > {

    return this.http.get<
      entity.AccountReceivableDetail
    >(
      `${this.apiUrl}/${id}`,
    );
  }


  // =========================================================
  // CREATE
  // =========================================================

  create(
    payload:
      entity.CreateAccountReceivable,
  ): Observable<ApiSuccess> {

    return this.http.post<
      ApiSuccess
    >(
      this.apiUrl,
      payload,
    );
  }


  // =========================================================
  // UPDATE
  // =========================================================

  update(
    id: number,
    payload:
      entity.UpdateAccountReceivable,
  ): Observable<ApiSuccess> {

    return this.http.patch<
      ApiSuccess
    >(
      `${this.apiUrl}/${id}`,
      payload,
    );
  }


  // =========================================================
  // DELETE
  // =========================================================

  remove(
    id: number,
  ): Observable<ApiSuccess> {

    return this.http.delete<
      ApiSuccess
    >(
      `${this.apiUrl}/${id}`,
    );
  }


  // =========================================================
  // ANTICIPOS LEGACY
  // =========================================================

  /**
   * Se conserva temporalmente hasta el cutover.
   *
   * No utilizar para el nuevo flujo financiero
   * de Tesorería CxC.
   */
  addAdvance(
    id: number,
    payload:
      entity.CreateAccountReceivableAdvance,
  ): Observable<ApiSuccess> {

    return this.http.post<
      ApiSuccess
    >(
      `${this.apiUrl}/${id}/advances`,
      payload,
    );
  }


  // =========================================================
  // XML PREVIEW
  // =========================================================

  uploadXml(
    files: File[],
  ): Observable<
    entity.XmlImportAccountReceivableResponseDto
  > {

    const formData =
      new FormData();

    files.forEach(
      (file) =>
        formData.append(
          'files',
          file,
        ),
    );

    return this.http.post<
      entity.XmlImportAccountReceivableResponseDto
    >(
      `${this.apiUrl}/xml/preview`,
      formData,
    );
  }


  // =========================================================
  // COLA XML
  // =========================================================

  setXmlQueueToImport(
    drafts:
      entity.XmlAccountReceivableDraftDto[],
  ): void {

    this.xmlDraftQueue =
      drafts ?? [];

    this.xmlDraftQueueIndex =
      0;
  }


  consumeNextXmlDraft():
    entity.XmlAccountReceivableDraftDto |
    null {

    if (
      !this.xmlDraftQueue.length
    ) {
      return null;
    }

    if (
      this.xmlDraftQueueIndex >=
      this.xmlDraftQueue.length
    ) {
      return null;
    }

    const draft =
      this.xmlDraftQueue[
        this.xmlDraftQueueIndex
      ];

    this.xmlDraftQueueIndex++;

    return draft;
  }


  hasMoreXmlDrafts(): boolean {

    return (
      this.xmlDraftQueueIndex <
      this.xmlDraftQueue.length
    );
  }


  getXmlQueueStatus():
    entity.XmlQueueState {

    const total =
      this.xmlDraftQueue.length;

    const pending =
      Math.max(
        total -
        this.xmlDraftQueueIndex,
        0,
      );

    return {
      total,
      pending,
    };
  }


  clearXmlQueue(): void {

    this.xmlDraftQueue = [];

    this.xmlDraftQueueIndex =
      0;
  }


  constructor(
    private readonly http:
      HttpClient,
  ) {}
}