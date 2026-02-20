import { Catalog } from '../../../shared/interfaces/general-interfaces';

// tipos de reporte (igual que backend)
export type ReportType =
  | 'project_detail'
  | 'project_by_supplier'
  | 'by_area'
  | 'project_payables';

// filtros del preview “Detalle de gastos por proyecto”
export interface ProjectDetailReportFilters {
  startDate?: string | null; // 'YYYY-MM-DD'
  endDate?: string | null;   // 'YYYY-MM-DD'
  suppliersIds?: Catalog[]; // tu autocomplete manda objetos {id,name}
  projectId?: Catalog[];
}
