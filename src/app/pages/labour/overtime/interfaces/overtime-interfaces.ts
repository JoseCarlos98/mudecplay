/** Contratos HTTP de src/modules/labour-extra (NestJS). */
export type LabourExtraKind = 'overtime' | 'sunday';
export type LabourExtraStatus = 'pending' | 'authorized' | 'cancelled';

/**
 * GET /labour-extra/overtime y GET /labour-extra/sunday.
 * El backend devuelve un ARREGLO simple (no PaginatedResponse), con máximo 100 registros.
 * El id es string porque proviene de BIGINT.
 */
export interface LabourExtraRecordDto {
  id: string;
  kind: LabourExtraKind;
  employee_id: number;
  project_id: number;
  attendance_id: number | null;
  work_date: string; // YYYY-MM-DD
  status: LabourExtraStatus;
  worked_until: string | null; // HH:mm:ss, para domingo
  extra_days_snapshot: number | string | null;
  overtime_hours: number | null;
  overtime_minutes: number | null;
  amount_snapshot: number; // ya calculado por el backend
  generated_expense_id: number | null;
  created_by_user_id: number;
  authorized_by_user_id: number | null;
  authorized_at: string | null;
}

/** POST /labour-extra/overtime. No se envían importes ni salarios desde Angular. */
export interface CreateLabourOvertimeDto {
  employee_id: number;
  project_id: number;
  work_date: string; // YYYY-MM-DD
  overtime_hours: number;
  overtime_minutes?: number; // 0..59, 0 por defecto en backend
}

/** POST /labour-extra/sunday. El backend determina el importe y las fracciones. */
export interface CreateLabourSundayDto {
  employee_id: number;
  project_id: number;
  work_date: string; // domingo, YYYY-MM-DD
  worked_until: string; // HH:mm (ej. 16:30)
}

export interface CreatedLabourOvertimeDto {
  id: string;
  employee_id: number;
  project_id: number;
  attendance_id: number | null;
  work_date: string;
  overtime_hours: number;
  overtime_minutes: number;
  weekly_salary_snapshot: number;
  daily_salary_snapshot: number;
  hourly_salary_snapshot: number;
  amount_snapshot: number;
  status: LabourExtraStatus;
  generated_expense_id: number | null;
  message: string;
}

export interface CreatedLabourSundayDto {
  id: string;
  kind: LabourExtraKind;
  employee_id: number;
  project_id: number;
  attendance_id: number | null;
  work_date: string;
  worked_until: string;
  extra_days_snapshot: number | string | null;
  extra_minutes: number;
  amount_snapshot: number;
  status: LabourExtraStatus;
  generated_expense_id: null;
  message: string;
}

/** PATCH /labour-extra/{overtime|sunday}/:id/authorize. */
export interface AuthorizedLabourExtraDto {
  id: string;
  status: LabourExtraStatus;
  authorized_by_user_id: number;
  authorized_at: string;
  generated_expense_id: number;
  amount_snapshot: number;
  message: string;
}

export interface CancelLabourExtraDto {
  cancellation_reason: string; // entre 5 y 255 caracteres
}

/** PATCH /labour-extra/{overtime|sunday}/:id/cancel (solo PENDING). */
export interface CancelledLabourExtraDto {
  id: string;
  status: LabourExtraStatus;
  message: string;
}

/** PATCH /labour-extra/{overtime|sunday}/:id/reverse (solo AUTHORIZED, sujeto a bloqueos). */
export interface ReversedLabourExtraDto {
  id: string;
  status: LabourExtraStatus;
  generated_expense_id: number;
  expense_is_deleted: boolean;
  cancelled_by_user_id: number;
  cancelled_at: string;
  cancellation_reason: string;
  message: string;
}
