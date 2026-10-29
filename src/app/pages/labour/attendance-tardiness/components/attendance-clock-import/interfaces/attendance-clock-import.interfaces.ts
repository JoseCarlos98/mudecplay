/** Contratos del endpoint POST /employee-attendances/imports/preview (DEV). */

export type ClockImportReviewStatus =
  | 'blocked'
  | 'manual_review'
  | 'ready_for_approval'
  | 'no_change';

export type ClockMarkIssue =
  | 'missing_marks'
  | 'incomplete_marks'
  | 'multiple_marks'
  | 'sunday_worked'
  | null;

export interface ClockImportReviewSummary {
  blocked: number;
  manual_review: number;
  ready_for_approval: number;
  no_change: number;
}

export interface ClockImportPreviewRow {
  row_index: number;
  source_sheet: string;
  source_row_number: number;
  clock_employee_number: string;
  clock_employee_name: string;
  clock_department: string;
  work_date: string;
  original_marks: string[];
  arrival_time: string | null;
  departure_time: string | null;
  issue: ClockMarkIssue;
  employee_id: number | null;
  employee_name: string | null;
  mapping_status: 'linked' | 'unlinked';
  existing_attendance_id: number | null;
  existing_attendance_status: string | null;
  existing_arrival_time: string | null;
  preview_tardiness_minutes: number | null;
  preview_daily_salary: number | null;
  preview_salary_source: 'attendance_snapshot' | 'current_weekly_salary' | null;
  preview_tardiness_discount: number | null;
  review_status: ClockImportReviewStatus;
  review_code: string;
  review_message: string;
}

export interface ClockImportPreviewResponse {
  period_start: string;
  period_end: string;
  employees_count: number;
  rows_count: number;
  linked_employees_count: number;
  unlinked_employees_count: number;
  review_summary: ClockImportReviewSummary;
  rows: ClockImportPreviewRow[];
}

/** Vinculación permanente obtenida de GET /employee-attendances/clock-mappings. */
export interface ClockEmployeeMapping {
  id: number;
  clock_employee_number: string;
  employee_id: number;
  employee_name: string | null;
}

export interface ClockMappingSaveResult {
  id: number;
  success: boolean;
  message: string;
}

export interface ClockWorkerGroup {
  clock_employee_number: string;
  clock_employee_name: string;
  clock_department: string;
  records: number;
  employee_id: number | null;
  employee_name: string | null;
}

/** POST /employee-attendances/imports/stage. No altera asistencias. */
export interface ClockImportStageResult {
  import_id: number;
  status: string;
  file_sha256: string;
  total_rows: number;
  pending_rows: number;
  skipped_rows: number;
  blocked_rows: number;
  manual_review_rows: number;
  awaiting_approval_rows: number;
  message: string;
}

export interface ClockImportRowIssues {
  issue?: ClockMarkIssue;
  review_status?: ClockImportReviewStatus;
  review_code?: string;
  review_message?: string;
  clock_department?: string;
  preview_tardiness_minutes?: number | null;
  preview_daily_salary?: number | null;
  preview_tardiness_discount?: number | null;
  decision_recorded_at?: string | null;
  [key: string]: unknown;
}

export interface ClockStagedRow {
  id: number;
  row_index: number;
  clock_employee_number: string | null;
  clock_employee_name: string | null;
  employee_id: number | null;
  attendance_id: number | null;
  work_date: string | null;
  original_arrival_time: string | null;
  original_departure_time: string | null;
  original_marks: string[];
  issues: ClockImportRowIssues | null;
  approved_arrival_time: string | null;
  decision: 'import_arrival' | 'confirm_absence' | 'skip' | null;
  status: 'pending' | 'conflict' | 'ready' | 'applied' | 'skipped' | 'error';
  resolution_note: string | null;
  reviewed_by_user_id: number | null;
  decision_recorded_at: string | null;
  processed_at: string | null;
}

/** GET /employee-attendances/imports/:id/rows?page=&limit=. */
export interface ClockStagedRowsResult {
  import_id: number;
  status: string;
  file_name: string;
  total_rows: number;
  pending_rows: number;
  skipped_rows: number;
  applied_rows: number;
  page: number;
  limit: number;
  total: number;
  rows: ClockStagedRow[];
}

export interface ClockImportReconcileResult {
  import_id: number;
  status: string;
  total_rows: number;
  reconciled_rows: number;
  changed_rows: number;
  protected_rows: number;
  pending_rows: number;
  skipped_rows: number;
  message: string;
}

/** Adaptación para el componente app-data-table. */
export interface ClockStagedTableRow extends ClockStagedRow {
  worker_label: string;
  employee_label: string;
  marks_label: string;
  review_label: string;
  status_label: string;
}
