import { Catalog } from '../../../shared/interfaces/general-interfaces';

export type ReportType =
  | 'project_detail'
  | 'project_by_supplier'
  | 'by_area'
  | 'project_payables'
  | 'projects_by_status'
  | 'accounts_receivable_report';

export interface ProjectDetailReportFilters {
  startDate?: string | null;
  endDate?: string | null;
  suppliersIds?: Catalog[];
  projectId?: Catalog[];
}

export interface ProjectsByStatusPreviewPayload {
  startDate?: string | null;
  endDate?: string | null;
  projectIds?: number[];
  statusProject: 'open' | 'close';
}

export interface AccountsReceivablePreviewPayload {
  startDate?: string | null;
  endDate?: string | null;
  companyCodes?: string[] | null;
  status?: 'pending' | 'collected' | null;
  receiverRfc?: string | null;
}