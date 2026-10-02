import {
  Injectable,
  inject,
} from '@angular/core';

import {
  HttpClient,
} from '@angular/common/http';

import {
  Observable,
} from 'rxjs';

import {
  environment,
} from '../../../../environments/environment';

import {
  ProjectMonitorResponse,
} from '../interfaces/project-monitor.interfaces';


@Injectable({
  providedIn: 'root',
})
export class ProjectMonitorService {

  // ======================================================
  // INYECCIONES
  // ======================================================

  private readonly http =
    inject(HttpClient);


  private readonly baseUrl =
    environment.apiUrl;


  // ======================================================
  // MONITOR
  // ======================================================

  getMonitor():
    Observable<ProjectMonitorResponse> {

    return this.http.get<ProjectMonitorResponse>(
      `${this.baseUrl}/reports/project-monitor`,
    );

  }

}