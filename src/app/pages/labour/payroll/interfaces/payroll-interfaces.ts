/** GET /payroll/periods paginado y POST /payroll/periods (NestJS). */
export type PayrollPeriodStatus = 'open' | 'closed';

export type PayrollPeriodSortKey = 'id' | 'week_start' | 'pay_date' | 'status';
export type PayrollSortDirection = 'asc' | 'desc';

export interface PayrollPeriodDto {
  /** BIGINT MySQL serializado como string. */
  id: string;
  week_start: string;
  week_end: string;
  overtime_start: string;
  overtime_end: string;
  pay_date: string;
  status: PayrollPeriodStatus;
  created_by_user_id: number;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollPeriodFilters {
  page: number;
  limit: number;
  week_from?: string;
  week_to?: string;
  status?: PayrollPeriodStatus;
  period_id?: string;
  sort?: PayrollPeriodSortKey;
  direction?: PayrollSortDirection;
}

export interface PayrollPeriodSort {
  key: PayrollPeriodSortKey;
  direction: PayrollSortDirection;
}

export interface PayrollPeriodSummary {
  open_count: number;
  closed_count: number;
}

export interface PayrollPeriodsPagedResponse {
  data: PayrollPeriodDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
  summary: PayrollPeriodSummary;
}

/** Registrar un periodo NO genera un borrador, autorización o pago. */
export interface CreatePayrollPeriodResponse {
  id: string;
  week_start: string;
  week_end: string;
  overtime_start: string;
  overtime_end: string;
  pay_date: string;
  status: 'open';
}

/** POST /payroll/periods/:id/calculate: genera/actualiza un borrador; no paga. */
export interface PayrollCalculationResponse {
  run_id: string;
  period_id: string;
  status: 'draft';
  version: number;
  employees: number;
  warnings: unknown;
  total_net: string;
  message: string;
}


/** Consultar ejecuciones de un período: GET /payroll/periods/:id/runs. */
export type PayrollRunStatus = 'draft' | 'approved' | 'closed' | 'voided';

export interface PayrollRunListItem {
  id: string;
  period_id: string;
  version: number;
  status: PayrollRunStatus;
  created_at: string;
  approved_at: string | null;
  closed_at: string | null;
}

/** Contrato existente de GET /payroll/runs/:id/preview. */
export interface PayrollRunPreview {
  run: {
    id: string;
    version: number;
    status: PayrollRunStatus;
    approved_by_user_id: number | null;
    closed_at: string | null;
  };
  period: PayrollPeriodDto;
  summary: {
    employees: number;
    earnings: string;
    deductions: string;
    net: string;
    warnings: number;
    loan_deductions_are_provisional: boolean;
  };
  employees: PayrollPreviewEmployee[];
}

export interface PayrollPreviewEmployee {
  id: number;
  name: string;
  weekly_salary: string;
  paid_days: number | string;
  earnings: string;
  deductions: string;
  net: string;
  warnings: unknown[];
  concepts: PayrollPreviewConcept[];
}

export interface PayrollPreviewConcept {
  code: string;
  direction: string;
  amount: string;
  source_module: string | null;
  source_record_id: string | null;
  source_date: string | null;
  description: string | null;
  quantity: number | string | null;
  line_key: string;
}
