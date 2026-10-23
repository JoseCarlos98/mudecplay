import { Catalog } from '../../../../shared/interfaces/general-interfaces';

export type EmployeeStatus = 'active' | 'inactive' | 'reentry';

export interface EmployeeAreaMiniDto {

  id: number;

  name: string;

}

export interface EmployeeResponseDto {

  id: number;

  full_name: string;

  address: string;

  birth_date: string;

  age: number | null;

  curp: string;

  employee_area_id: number;

  employee_area: EmployeeAreaMiniDto;

  position: string;

  entry_date: string;

  discharge_date: string | null;

  reentry_date: string | null;

  weekly_salary: number;

  daily_salary: number;

  photoUrl: string | null;

  employment_status: EmployeeStatus;

  employment_status_label: string;

}

/** Respuesta de GET /employees/:id/vacation-balance (backend Paso 1). */
export interface EmployeeVacationBalanceDto {
  employee_id: number;
  as_of: string;
  calculated_through: string;
  effective_entry_date: string;
  completed_years: number;
  annual_entitlement_days: number;
  next_anniversary_days: number;
  accrued_days: number;
  period_start: string;
  next_anniversary: string;
  taken_days: number;
  available_days: number;
  historical_records_warning: string;
}

export interface EmployeeRow extends EmployeeResponseDto {

  area_label: string;

}

export type EmployeeSortDirection =

  | 'asc'

  | 'desc';

export interface EmployeeSortItem {

  key:

    string;

  direction:

    EmployeeSortDirection;

}

export interface FiltersEmployees {

  page:

    number;

  limit:

    number;

  full_name:

    string |

    null;

  curp:

    string |

    null;

  employee_area_id:

    number |

    null;

  employment_status:

    EmployeeStatus |

    null;

  sorts?:

    EmployeeSortItem[];

}

export interface CreateEmployee {

  full_name: string;

  address: string;

  birth_date: string;

  curp: string;

  employee_area_id: number;

  position: string;

  entry_date: string;

  discharge_date: string | null;

  reentry_date: string | null;

  weekly_salary: number;

  photo_key?: string | null;

}

export interface PatchEmployee extends Partial<CreateEmployee> {}

export interface EmployeesUiFiltersForm {

  fullName: string;

  curp: string;

  area: number | null;

  employmentStatus: EmployeeStatus | null;

}

export type EmployeeAreaCatalog = Catalog[];
