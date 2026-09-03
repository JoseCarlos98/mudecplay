import {
  Injectable,
  inject,
} from '@angular/core';

import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';

import {
  Observable,
} from 'rxjs';

import {
  environment,
} from '../../../../environments/environment';

import {
  Catalog,
} from '../../../shared/interfaces/general-interfaces';


export interface ProjectAllPreviewPayload {
  projectId: number;
}


@Injectable({
  providedIn: 'root',
})
export class ProjectAllReportService {

  private readonly http =
    inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/reports/project-all`;


  // ======================================================
  // CATÁLOGO DE PROYECTOS
  //
  // Abiertos + cerrados
  // ======================================================

  getProjects(
    search: string = '',
  ): Observable<Catalog[]> {

    let params =
      new HttpParams();


    if (search.trim()) {

      params =
        params.set(
          'search',
          search.trim(),
        );

    }


    return this.http.get<Catalog[]>(
      `${this.apiUrl}/projects`,
      {
        params,
      },
    );

  }


  // ======================================================
  // GENERAR PDF
  // ======================================================

  preview(
    payload: ProjectAllPreviewPayload,
  ): Observable<Blob> {

    return this.http.post(
      `${this.apiUrl}/preview`,
      payload,
      {
        responseType:
          'blob',
      },
    );

  }

}