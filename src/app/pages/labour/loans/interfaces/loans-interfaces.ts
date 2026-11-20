/** Contratos correspondientes a src/modules/employee-finance (NestJS). */
export type LoanStatus = 'pending' | 'active' | 'settled' | 'cancelled';
export type RepaymentStatus = 'applied' | 'reversed';
export type RepaymentSource = 'manual' | 'payroll';

export interface FinanceSortItem {
  key: string;
  direction: 'asc' | 'desc';
}
export interface LoansFilters {
  page: number;
  limit: number;
  employee_ids?: number[];
  employee_name?: string;
  status?: LoanStatus;
  requested_from?: string;
  requested_to?: string;
  sorts?: FinanceSortItem[];
}
export interface RepaymentsFilters {
  page: number;
  limit: number;
  status?: RepaymentStatus;
  source?: RepaymentSource;
  applied_from?: string;
  applied_to?: string;
  sorts?: FinanceSortItem[];
}
export interface FinancePagedResponse<T, S> {
  data: T[];
  meta: { total: number; page: number; limit: number };
  summary: S;
}
export interface EmployeeLoanDto {
  /** Clave BIGINT: jamás convertir a number. */
  id: string;
  employee_id: number;
  employee_name: string | null;
  requested_on: string;
  disbursed_on: string | null;
  principal_amount: string; // DECIMAL(12,2) proveniente de TypeORM
  remaining_balance: string;
  reason: string;
  status: LoanStatus;
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
export interface LoanRepaymentDto {
  id: string;
  loan_id: string;
  amount: string;
  applied_on: string;
  source: RepaymentSource;
  source_reference: string | null;
  status: RepaymentStatus;
  created_by_user_id: number;
  reversed_by_user_id: number | null;
  reversed_at: string | null;
  reversal_reason: string | null;
  created_at: string;
}
export interface LoansSummary {
  pending_count: number;
  active_count: number;
  settled_count: number;
  cancelled_count: number;
  disbursed_principal_total: number;
  remaining_balance_total: number;
}
export interface RepaymentsSummary {
  applied_count: number;
  reversed_count: number;
  applied_amount_total: number;
}
export interface CreateLoanDto {
  employee_id: number;
  requested_on: string;
  principal_amount: number;
  reason: string;
}
export interface DisburseLoanDto {
  disbursed_on: string;
  confirmed_disbursement: true;
}
export interface CreateLoanRepaymentDto {
  amount: number;
  applied_on: string;
  source_reference: string;
}
export interface FinanceActionResponse {
  id: string;
  status: string;
  message: string;
  remaining_balance?: string;
  loan_status?: LoanStatus;
  repeated?: boolean;
}
export type LoansPagedResponse = FinancePagedResponse<EmployeeLoanDto, LoansSummary>;
export type RepaymentsPagedResponse = FinancePagedResponse<LoanRepaymentDto, RepaymentsSummary>;
