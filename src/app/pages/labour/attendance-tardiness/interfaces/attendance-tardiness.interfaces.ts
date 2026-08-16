export type AttendanceArrivalStatus = 'pending' | 'on_time' | 'tardy';
export type EmployeeAttendanceStatus = 'present' | 'absent' | 'cancelled';

export interface AttendanceTardinessRow {
  id: number;
  employee_id: number;
  employee_name: string | null;

  employee_area_id: number | null;
  area_name: string | null;

  work_date: string;
  arrival_time: string | null;

  arrival_status: AttendanceArrivalStatus;
  arrival_status_label: string;

  tardiness_minutes: number | null;
  tardiness_discount: number | null;
  tardiness_reason: string | null;

  daily_salary: number;
}

export interface AttendanceTardinessUiFilters {
  workDate: string | null;
  employeeName: string;
  employeeAreaId: number | null;
  status: AttendanceArrivalStatus | null;
  page: number;
  limit: number;
}


export interface AttendanceTardinessFilters {
  page: number;
  limit: number;
  work_date: string | null;
  employee_name: string | null;
  employee_area_id: number | null;

  status: EmployeeAttendanceStatus | null;

  arrival_status: AttendanceArrivalStatus | null;
}

export interface EmployeeAttendanceResponseDto {
  id: number;
  employee_id: number;
  employee_name: string | null;

  employee_area_id: number | null;
  employee_area_name: string | null;

  project_id: number;
  project_name: string | null;

  work_date: string;
  status: 'assigned' | 'cancelled';

  arrival_time: string | null;
  arrival_status: AttendanceArrivalStatus;
  arrival_status_label: string;
  tardiness_minutes: number | null;
  tardiness_discount: number | null;
  tardiness_reason: string | null;

  weekly_salary_snapshot: number;
  daily_salary_snapshot: number;

  cancelled_at: string | null;
  cancelled_by_user_id: number | null;
  cancellation_reason: string | null;

  created_at: string;
  updated_at: string;
}

export interface UpsertEmployeeAttendanceArrivalDto {
  arrival_time: string;
  tardiness_reason?: string | null;
}