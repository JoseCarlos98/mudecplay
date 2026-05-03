export type EmployeeAttendanceStatus = 'present' | 'absent' | 'cancelled';
export type EmployeeAttendanceAssignmentStatus = 'active' | 'cancelled';

export type DailyAssistanceView = 'unassigned' | 'assigned' | 'absent' | 'cancelled';

export type ArrivalStatus = 'pending' | 'on_time' | 'tardy';

export type SundaySourceType = 'saturday' | 'friday' | null;

export interface EmployeeAttendanceAssignmentRow {
  id: number;
  attendance_id: number;

  project_id: number;
  project_name?: string | null;

  assigned_hours: number;
  hourly_salary_snapshot: number;
  amount_snapshot: number;

  status: EmployeeAttendanceAssignmentStatus;

  generated_expense_id: number | null;

  is_sunday_auto: boolean;
  replicated_from_assignment_id: number | null;
  replicated_from_date: string | null;

  cancelled_at: string | null;
  cancelled_by_user_id: number | null;
  cancellation_reason: string | null;

  created_at: string;
  updated_at: string;
}

export interface EmployeeAttendanceRow {
  id: number;

  employee_id: number;
  employee_name?: string | null;

  employee_area_id?: number | null;
  employee_area_name?: string | null;

  work_date: string;
  status: EmployeeAttendanceStatus;

  arrival_time: string | null;
  arrival_status: ArrivalStatus;
  arrival_status_label: string;
  tardiness_minutes: number | null;
  tardiness_discount: number | null;
  tardiness_reason: string | null;

  weekly_salary_snapshot: number;
  daily_salary_snapshot: number;
  hourly_salary_snapshot: number;

  total_daily_hours: number;
  total_assigned_hours: number;
  available_hours: number;

  absent_at: string | null;
  absent_by_user_id: number | null;
  absence_reason: string | null;

  cancelled_at: string | null;
  cancelled_by_user_id: number | null;
  cancellation_reason: string | null;

  assignments: EmployeeAttendanceAssignmentRow[];

  created_at: string;
  updated_at: string;
}

export interface FiltersDailyAssistance {
  work_date: string | null;
  status: EmployeeAttendanceStatus | null;
  employee_id: number | null;
  project_id: number | null;
  page: number;
  limit: number;
}

export interface DailyAssistanceUiFilters {
  workDate: string | null;
  currentView: DailyAssistanceView;
  employeeId: number | null;
  projectId: number | null;
  page: number;
  limit: number;
}

export interface CreateEmployeeAttendance {
  employee_id: number;
  project_id: number;
  work_date: string;
  assigned_hours: number;
}

export interface UpdateEmployeeAttendanceAssignment {
  project_id?: number | string;
  assigned_hours?: number;
}

export interface CancelEmployeeAttendance {
  cancellation_reason: string;
}

export interface MarkEmployeeAbsence {
  employee_id: number;
  work_date: string;
  absence_reason: string;
}

export interface SuccessResponse {
  id?: number;
  message: string;
  success: boolean;
}

export interface EmployeeAttendanceCatalogRow {
  id: number;
  full_name: string;

  employee_area_id: number | null;
  employee_area_name: string | null;

  position: string | null;

  weekly_salary: number;
  daily_salary: number;
  hourly_salary: number;

  employment_status: string;

  attendance_id: number | null;
  attendance_status: EmployeeAttendanceStatus | null;

  total_daily_hours: number;
  total_assigned_hours: number;
  available_hours: number;

  can_assign: boolean;
  can_mark_absent: boolean;

  absence_reason: string | null;
}

export interface SundayGenerationStatusResponse {
  work_date: string;
  is_sunday: boolean;
  can_generate: boolean;
  already_generated: boolean;
  has_active_assignments: boolean;
  has_manual_assignments: boolean;
  has_absences: boolean;
  source_date: string | null;
  source_type: SundaySourceType;
  source_assignments_count: number;
  message: string;
}

export interface GenerateSundayAttendanceResponse {
  work_date: string;
  source_date: string;
  source_type: Exclude<SundaySourceType, null>;
  attendances_created: number;
  assignments_created: number;
  expenses_created: number;
  message: string;
}