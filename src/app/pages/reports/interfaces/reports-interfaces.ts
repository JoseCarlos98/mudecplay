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

// ============================================================
// ANÁLISIS DE GASTOS
// ============================================================

export type ExpenseAnalysisOrigin =
  | 'direct'
  | 'warehouse'
  | 'purchase_order'
  | 'labor';


export type ExpenseAnalysisClassificationState =
  | 'classified'
  | 'unclassified';


export type ExpenseAnalysisGroupState =
  | 'assigned'
  | 'unassigned';


export type ExpenseAnalysisPaymentSource =
  | 'treasury'
  | 'legacy'
  | 'none';


export type ExpenseAnalysisClassificationKind =
  | 'catalog'
  | 'labor'
  | 'unclassified';


// ============================================================
// FILTROS
// ============================================================

export interface ExpenseAnalysisFilters {

  startDate?: string;

  endDate?: string;

  projectId?: number;

  supplierId?: number;

  productId?: number;

  classificationId?: number;

  classificationState?:
    ExpenseAnalysisClassificationState;

  groupId?: number;

  groupState?:
    ExpenseAnalysisGroupState;

  registeredName?: string;

  amountMin?: number;

  amountMax?: number;

  origin?:
    ExpenseAnalysisOrigin;

  isExtraWork?: boolean;

  search?: string;

  page?: number;

  limit?: number;
}


// ============================================================
// RESUMEN MONETARIO
// ============================================================

export interface ExpenseAnalysisSummary {

  expenseAmount:
    number;

  paidAmount:
    number;

  cxpBalance:
    number;

  purchaseOrderCommitment:
    number;
}


// ============================================================
// FILA DETALLE
// ============================================================

export interface ExpenseAnalysisRow {

  key:
    string;

  source:
    ExpenseAnalysisOrigin;

  date:
    string | null;

  folio:
    string | null;

  cfdiUuid:
    string | null;


  projectId:
    number | null;

  projectName:
    string | null;


  supplierId:
    number | null;

  supplierName:
    string | null;


  productId:
    number | null;

  productName:
    string | null;


  registeredName:
    string;


  laborEmployeeName:
    string | null;


  classificationId:
    number | null;

  classificationName:
    string;

  classificationKind:
    ExpenseAnalysisClassificationKind;


  groupId:
    number | null;

  groupName:
    string | null;


  expenseAmount:
    number;

  paidAmount:
    number | null;

  cxpBalance:
    number | null;

  purchaseOrderCommitment:
    number;


  isExtraWork:
    boolean;


  paymentSource:
    ExpenseAnalysisPaymentSource | null;

  paymentDate:
    string | null;


  expenseId:
    number | null;

  expenseItemId:
    number | null;

  warehouseMovementId:
    number | null;

  purchaseOrderId:
    number | null;
}


// ============================================================
// DRILL-DOWN
// ============================================================

export type ExpenseAnalysisBreakdownLevel =
  | 'classification'
  | 'group'
  | 'registered_name'
  | 'transaction';


// ============================================================
// INFORMACIÓN DE TRANSACCIÓN
// ============================================================

export interface ExpenseAnalysisBreakdownTransaction {

  rowKey:
    string;

  source:
    ExpenseAnalysisOrigin;

  date:
    string | null;

  folio:
    string | null;


  projectId:
    number | null;

  projectName:
    string | null;


  supplierId:
    number | null;

  supplierName:
    string | null;


  isExtraWork:
    boolean;


  expenseId:
    number | null;

  expenseItemId:
    number | null;

  warehouseMovementId:
    number | null;

  purchaseOrderId:
    number | null;
}


// ============================================================
// NODO DEL ÁRBOL
// ============================================================

export interface ExpenseAnalysisBreakdownNode {

  key:
    string;

  level:
    ExpenseAnalysisBreakdownLevel;

  label:
    string;


  classificationId:
    number | null;

  groupId:
    number | null;


  summary:
    ExpenseAnalysisSummary;


  children:
    ExpenseAnalysisBreakdownNode[];


  transaction:
    ExpenseAnalysisBreakdownTransaction | null;
}


// ============================================================
// PAGINACIÓN
// ============================================================

export interface ExpenseAnalysisPagination {

  page:
    number;

  limit:
    number;

  total:
    number;

  totalPages:
    number;
}


// ============================================================
// RESPONSE
// ============================================================

export interface ExpenseAnalysisResponse {

  summary:
    ExpenseAnalysisSummary;

  breakdown:
    ExpenseAnalysisBreakdownNode[];

  rows:
    ExpenseAnalysisRow[];

  pagination:
    ExpenseAnalysisPagination;
}



  // ==========================================================
  // REPORTE DE ASISTENCIA DE MANO DE OBRA
  // ==========================================================

  export type AttendanceReportPeriod =
    | 'monthly'
    | 'annual';

  export interface AttendanceReportFilters {
    period: AttendanceReportPeriod;
    year: number;
    month?: number;
  }

  export interface AttendanceReportMonth {
    month: number;
    worked_days: number;
    absences: number;
    vacations: number;
  }

  export interface AttendanceReportEmployee {
    employee_id: number;
    employee_name: string;

    worked_days: number;
    absences: number;
    vacations: number;

    months: AttendanceReportMonth[];
  }

  export interface AttendanceReportSummary {
    employees_count: number;
    worked_days: number;
    absences: number;
    vacations: number;
  }

  export interface AttendanceReportData {
    period: AttendanceReportPeriod;
    year: number;
    month: number | null;

    summary: AttendanceReportSummary;
    employees: AttendanceReportEmployee[];
  }


  
export interface LaborHoursReportFilters {
  startDate: string;
  endDate: string;
  employeeIds: number[];
}

export interface LaborHoursProjectRow {
  project_id: number;
  project_name: string;
  hours: number;
  amount: number;
}

export interface LaborHoursEmployeeGroup {
  employee_id: number;
  employee_name: string;
  projects: LaborHoursProjectRow[];
  total_hours: number;
  total_amount: number;
}

export interface LaborHoursReportData {
  startDate: string;
  endDate: string;
  employees: LaborHoursEmployeeGroup[];
  summary_by_project: LaborHoursProjectRow[];
  total_employees: number;
  total_hours: number;
  total_amount: number;
}
