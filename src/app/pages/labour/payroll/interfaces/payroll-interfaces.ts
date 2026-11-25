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
