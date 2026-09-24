export type EmployeeAreaSortDirection = 'asc' | 'desc';

export interface EmployeeAreaSortItem {
  key: string;
  direction: EmployeeAreaSortDirection;
}

export interface FiltersEmployeeArea {
  name?: string | '';

  page: number;
  limit: number;

  sorts?: EmployeeAreaSortItem[];
}

export interface EmployeeAreaResponseDto {
  id: number;
  name: string;
}

export interface CreateEmployeeArea {
  name: string;
}

export interface PatchEmployeeArea {
  name?: string;
}

export interface EmployeeAreaUiFilters {
  name: string;

  page: number;
  limit: number;

  sorts: EmployeeAreaSortItem[];
}