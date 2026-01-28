// src/app/pages/reports/services/reports-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ApiSuccess } from '../../../shared/interfaces/general-interfaces';

export interface ProjectDetailPreviewPayload {
  startDate: string;     // YYYY-MM-DD
  endDate: string;       // YYYY-MM-DD
  suppliersIds?: number[];
  projectId: number;     // UNO
}

// NUEVO: payload para "por proveedor" (en proyecto)
// (misma estructura, pero lo dejamos separado por claridad)
export interface ProjectBySupplierPreviewPayload {
  startDate: string;
  endDate: string;
  suppliersIds?: number[];
  projectId: number;
}

@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // =======================
  // Detalle por proyecto
  // =======================
  previewProjectDetail(payload: ProjectDetailPreviewPayload) {
    return this.http.post(`${this.baseUrl}/reports/project-detail/preview`, payload, {
      responseType: 'blob',
    });
  }

  saveProjectDetailHistory(payload: ProjectDetailPreviewPayload) {
    return this.http.post<ApiSuccess>(`${this.baseUrl}/reports/project-detail/history`, payload);
  }

  // =======================
  // Gasto por proveedor (en proyecto)
  // =======================
  previewProjectBySupplier(payload: ProjectBySupplierPreviewPayload) {
    return this.http.post(`${this.baseUrl}/reports/project-by-supplier/preview`, payload, {
      responseType: 'blob',
    });
  }

  saveProjectBySupplierHistory(payload: ProjectBySupplierPreviewPayload) {
    return this.http.post<ApiSuccess>(`${this.baseUrl}/reports/project-by-supplier/history`, payload);
  }
}
