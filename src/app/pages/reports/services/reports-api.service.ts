// src/app/pages/reports/services/reports-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface ProjectDetailPreviewPayload {
  startDate: string;     // YYYY-MM-DD
  endDate: string;       // YYYY-MM-DD
  suppliersIds?: number[];
  projectId: number;     // UNO
}

@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  previewProjectDetail(payload: ProjectDetailPreviewPayload) {
    return this.http.post(`${this.baseUrl}/reports/project-detail/preview`, payload, {
      responseType: 'blob',
    });
  }

  // luego: history (lo dejamos para después)
  // saveProjectDetailHistory(payload: ProjectDetailPreviewPayload) {
  //   return this.http.post(`${this.baseUrl}/reports/project-detail/history`, payload);
  // }
}
