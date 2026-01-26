import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiSuccess } from '../../../shared/interfaces/general-interfaces';
import * as entity from '../interfaces/reports-interfaces';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly apiUrl = `${environment.apiUrl}/reports`;

  constructor(private readonly http: HttpClient) {}

  previewProjectDetail(payload: entity.ProjectDetailReportFilters): Observable<ApiSuccess> {
    return this.http.post<ApiSuccess>(`${this.apiUrl}/project-detail/preview`, payload);
  }
}
