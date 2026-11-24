/** Contrato de Compensaciones: NestJS /employee-finance/compensations. */
export type CompensationStatus = 'pending' | 'approved' | 'cancelled';

export type CompensationSortKey =
  | 'employee_name'
  | 'effective_date'
  | 'amount'
  | 'status'
  | 'created_at'
  | 'id';

export interface CompensationSortItem {
  key: CompensationSortKey;
  direction: 'asc' | 'desc';
}

export interface CompensationsFilters {
  page: number;
  limit: number;
  employee_ids?: number[];
  /** Filtro textual alternativo del backend; en UI se prioriza el selector por IDs. */
  employee_name?: string;
  status?: CompensationStatus;
  effective_from?: string;
  effective_to?: string;
  sorts?: CompensationSortItem[];
}

export interface EmployeeCompensationDto {
  /** ID BIGINT: se preserva como string. */
  id: string;
  employee_id: number;
  employee_name: string | null;
  effective_date: string;
  /** DECIMAL de MySQL serializado como string por TypeORM. */
  amount: string;
  reason: string;
  status: CompensationStatus;
  approved_by_user_id: number | null;
  approved_at: string | null;
  cancelled_by_user_id: number | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_by_user_id: number;
  updated_by_user_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CompensationsSummary {
  pending_count: number;
  approved_count: number;
  cancelled_count: number;
  /** Total aprobado en el universo filtrado; no implica dinero entregado. */
  approved_amount_total: number;
}

export interface CompensationsPagedResponse {
  data: EmployeeCompensationDto[];
  meta: { total: number; page: number; limit: number };
  summary: CompensationsSummary;
}

export interface CreateCompensationDto {
  employee_id: number;
  effective_date: string;
  amount: number;
  reason: string;
}

export interface CompensationActionResponse {
  id: string;
  status: CompensationStatus;
  message: string;
  amount?: string;
  approved_by_user_id?: number;
}
