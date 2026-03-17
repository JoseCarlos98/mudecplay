import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ApiSuccess } from '../../../shared/interfaces/general-interfaces';
import { ProjectsByStatusPreviewPayload } from '../interfaces/reports-interfaces';

export interface ProjectDetailPreviewPayload {
  startDate?: string | null;
  endDate?: string | null;
  suppliersIds?: number[];
  projectId: number;
}

export interface ProjectBySupplierPreviewPayload {
  startDate?: string | null;
  endDate?: string | null;
  suppliersIds?: number[];
  projectId: number;
}

export interface ByAreaPreviewPayload {
  startDate: string;
  endDate: string;
  areaIds?: number[];
}

//  NUEVO: Payables (Resumen)
export interface ProjectPayablesPreviewPayload {
  startDate?: string | null;
  endDate?: string | null;
  projectId: number;
  suppliersIds?: number[]; // opcional
}

@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // Detalle por proyecto
  previewProjectDetail(payload: ProjectDetailPreviewPayload) {
    return this.http.post(`${this.baseUrl}/reports/project-detail/preview`, payload, {
      responseType: 'blob',
    });
  }
  saveProjectDetailHistory(payload: ProjectDetailPreviewPayload) {
    return this.http.post<ApiSuccess>(`${this.baseUrl}/reports/project-detail/history`, payload);
  }

  // Por proveedor (en proyecto)
  previewProjectBySupplier(payload: ProjectBySupplierPreviewPayload) {
    return this.http.post(`${this.baseUrl}/reports/project-by-supplier/preview`, payload, {
      responseType: 'blob',
    });
  }
  saveProjectBySupplierHistory(payload: ProjectBySupplierPreviewPayload) {
    return this.http.post<ApiSuccess>(`${this.baseUrl}/reports/project-by-supplier/history`, payload);
  }

  // Por área
  previewByArea(payload: ByAreaPreviewPayload) {
    return this.http.post(`${this.baseUrl}/reports/by-area/preview`, payload, {
      responseType: 'blob',
    });
  }
  saveByAreaHistory(payload: ByAreaPreviewPayload) {
    return this.http.post<ApiSuccess>(`${this.baseUrl}/reports/by-area/history`, payload);
  }

  //  NUEVO: Payables (Resumen)
  previewProjectPayables(payload: ProjectPayablesPreviewPayload) {
    return this.http.post(`${this.baseUrl}/reports/project-payables/preview`, payload, {
      responseType: 'blob',
    });
  }

  saveProjectPayablesHistory(payload: ProjectPayablesPreviewPayload) {
    return this.http.post<ApiSuccess>(`${this.baseUrl}/reports/project-payables/history`, payload);
  }

  // Projects by status (cotizado e invertido)
  previewProjectsByStatus(payload: ProjectsByStatusPreviewPayload) {
    return this.http.post(`${this.baseUrl}/reports/projects-by-status/preview`, payload, {
      responseType: 'blob',
    });
  }

  saveProjectsByStatusHistory(payload: ProjectsByStatusPreviewPayload) {
    return this.http.post<ApiSuccess>(`${this.baseUrl}/reports/projects-by-status/history`, payload);
  }
}
