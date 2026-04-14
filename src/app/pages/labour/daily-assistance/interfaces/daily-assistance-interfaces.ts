export type EmployeeAttendanceStatus = 'assigned' | 'cancelled';

/**
 * Vista UI del módulo.
 * "unassigned" no viene del backend de asistencias como status real;
 * se usa solo para la pestaña/vista del frontend.
 */
export type DailyAssistanceView = 'unassigned' | 'assigned' | 'cancelled';

export interface EmployeeAttendanceRow {
  id: number;
  employee_id: number;
  employee_name?: string | null;

  project_id: number;
  project_name?: string | null;

  work_date: string;
  status: EmployeeAttendanceStatus;

  weekly_salary_snapshot: number;
  daily_salary_snapshot: number;

  cancelled_at: string | null;
  cancelled_by_user_id: number | null;
  cancellation_reason: string | null;

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

/**
 * Estado UI del módulo.
 * Esto no necesariamente coincide 1:1 con backend,
 * pero nos sirve para la pantalla principal.
 */
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
}

export interface UpdateEmployeeAttendance {
  project_id: number | string;
}

export interface CancelEmployeeAttendance {
  cancellation_reason: string;
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
  employment_status: string;
}