import { Catalog } from '../../../shared/interfaces/general-interfaces';

// tipos de reporte (igual que backend)
export type ReportType =
  | 'project_detail'
  | 'project_by_supplier'
  | 'by_area'
  | 'project_payables';

// filtros del preview “Detalle de gastos por proyecto”
export interface ProjectDetailReportFilters {
  // dateRange: {
    startDate: string; // 'YYYY-MM-DD'
    endDate: string;   // 'YYYY-MM-DD'
  // };
  suppliersIds?: Catalog[]; // tu autocomplete manda objetos {id,name}
  projectIds?: Catalog[];
}
