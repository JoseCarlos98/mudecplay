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
