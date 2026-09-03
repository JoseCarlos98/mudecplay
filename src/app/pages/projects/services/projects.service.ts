import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import * as entity from '../interfaces/project-interfaces';

import { environment } from '../../../../environments/environment';

import {
  ApiSuccess,
  PaginatedResponse,
} from '../../../shared/interfaces/general-interfaces';

import {
  appendArray,
  setScalar,
} from '../../../shared/helpers/general-helpers';


@Injectable({
  providedIn: 'root',
})
export class ProjectService {

  private apiUrl = `${environment.apiUrl}/projects`;

  constructor(
    private readonly http: HttpClient,
  ) {}


  // ======================================================
  // PROYECTOS
  // ======================================================

  getProjects(
    filters?: entity.FiltersProject,
  ): Observable<PaginatedResponse<entity.ProjectResponseDto>> {

    const url = `${this.apiUrl}`;

    let params = new HttpParams();

    if (filters) {

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

      params = appendArray(
        params,
        'clientsIds',
        filters.clientsIds ?? [],
      );

      params = appendArray(
        params,
        'responsibleIds',
        filters.responsibleIds ?? [],
      );

      params = setScalar(
        params,
        'name',
        filters.name?.trim(),
      );

      params = setScalar(
        params,
        'phone',
        filters.phone?.trim(),
      );

      params = setScalar(
        params,
        'email',
        filters.email?.trim(),
      );

      params = setScalar(
        params,
        'statusProject',
        filters.statusProject?.trim(),
      );

    }

    return this.http.get<
      PaginatedResponse<entity.ProjectResponseDto>
    >(
      url,
      {
        params,
      },
    );
  }


  create(
    formData: entity.CreateProject,
  ): Observable<entity.CreateProjectResponse> {

    const url = `${this.apiUrl}`;

    return this.http.post<entity.CreateProjectResponse>(
      url,
      formData,
    );
  }


  update(
    id: number,
    formData: entity.PatchProject,
  ): Observable<ApiSuccess> {

    const url = `${this.apiUrl}/${id}`;

    return this.http.patch<ApiSuccess>(
      url,
      formData,
    );
  }


  remove(
    id: number,
  ): Observable<ApiSuccess> {

    const url = `${this.apiUrl}/${id}`;

    return this.http.delete<ApiSuccess>(
      url,
    );
  }


  // ======================================================
  // COBROS EN EFECTIVO
  // ======================================================

  getCashCollections(
    projectId: number,
  ): Observable<entity.ProjectCashCollectionsResponse> {

    const url =
      `${this.apiUrl}/${projectId}/cash-collections`;

    return this.http.get<
      entity.ProjectCashCollectionsResponse
    >(url);
  }


  createCashCollection(
    projectId: number,
    payload: entity.CreateProjectCashCollection,
  ): Observable<entity.ProjectCashCollection> {

    const url =
      `${this.apiUrl}/${projectId}/cash-collections`;

    return this.http.post<
      entity.ProjectCashCollection
    >(
      url,
      payload,
    );
  }

}