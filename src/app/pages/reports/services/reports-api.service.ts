import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface ProjectDetailPreviewPayload {
  startDate: string;
  endDate: string;
  suppliersIds?: number[];
  projectId: number;
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
}
