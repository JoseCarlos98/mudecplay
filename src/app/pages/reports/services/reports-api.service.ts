import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ApiSuccess } from '../../../shared/interfaces/general-interfaces';
import {
  ProjectsByStatusPreviewPayload,
  AccountsReceivablePreviewPayload,
} from '../interfaces/reports-interfaces';

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

export interface ProjectPayablesPreviewPayload {
  startDate?: string | null;
  endDate?: string | null;
  projectId: number;
  suppliersIds?: number[];
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

  saveProjectDetailHistory(payload: ProjectDetailPreviewPayload) {
    return this.http.post<ApiSuccess>(`${this.baseUrl}/reports/project-detail/history`, payload);
  }

  previewProjectBySupplier(payload: ProjectBySupplierPreviewPayload) {
    return this.http.post(`${this.baseUrl}/reports/project-by-supplier/preview`, payload, {
      responseType: 'blob',
    });
  }

  saveProjectBySupplierHistory(payload: ProjectBySupplierPreviewPayload) {
    return this.http.post<ApiSuccess>(`${this.baseUrl}/reports/project-by-supplier/history`, payload);
  }

  previewByArea(payload: ByAreaPreviewPayload) {
    return this.http.post(`${this.baseUrl}/reports/by-area/preview`, payload, {
      responseType: 'blob',
    });
  }

  saveByAreaHistory(payload: ByAreaPreviewPayload) {
    return this.http.post<ApiSuccess>(`${this.baseUrl}/reports/by-area/history`, payload);
  }

  previewProjectPayables(payload: ProjectPayablesPreviewPayload) {
    return this.http.post(`${this.baseUrl}/reports/project-payables/preview`, payload, {
      responseType: 'blob',
    });
  }

  saveProjectPayablesHistory(payload: ProjectPayablesPreviewPayload) {
    return this.http.post<ApiSuccess>(`${this.baseUrl}/reports/project-payables/history`, payload);
  }

  previewProjectsByStatus(payload: ProjectsByStatusPreviewPayload) {
    return this.http.post(`${this.baseUrl}/reports/projects-by-status/preview`, payload, {
      responseType: 'blob',
    });
  }

  saveProjectsByStatusHistory(payload: ProjectsByStatusPreviewPayload) {
    return this.http.post<ApiSuccess>(`${this.baseUrl}/reports/projects-by-status/history`, payload);
  }

  previewAccountsReceivable(payload: AccountsReceivablePreviewPayload) {
    return this.http.post(`${this.baseUrl}/reports/accounts-receivable/preview`, payload, {
      responseType: 'blob',
    });
  }

  saveAccountsReceivableHistory(payload: AccountsReceivablePreviewPayload) {
    return this.http.post<ApiSuccess>(`${this.baseUrl}/reports/accounts-receivable/history`, payload);
  }
}