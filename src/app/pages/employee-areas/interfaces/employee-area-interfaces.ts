export interface FiltersEmployeeArea {
  name?: string | '';
  limit: number;
  page: number;
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
}