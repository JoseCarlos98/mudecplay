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


export interface ProjectClassificationPreviewPayload {
  projectId: number;
}


@Injectable({
  providedIn: 'root',
})
export class ProjectClassificationReportService {

  private readonly http =
    inject(HttpClient);

  private readonly reportsUrl =
    `${environment.apiUrl}/reports`;


  // ======================================================
  // CATÁLOGO DE PROYECTOS
  //
  // Reutilizamos el catálogo actual de Project ALL.
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
      `${this.reportsUrl}/project-all/projects`,
      {
        params,
      },
    );

  }


  // ======================================================
  // GENERAR PDF
  // ======================================================

  preview(
    payload:
      ProjectClassificationPreviewPayload,
  ): Observable<Blob> {

    return this.http.post(
      `${this.reportsUrl}/project-classification/preview`,
      payload,
      {
        responseType:
          'blob',
      },
    );

  }

}