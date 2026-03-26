export interface FiltersArea {
  name?: string | '';
  limit: number;
  page: number;
}

export interface AreaResponseDto {
  id: number;
  name: string;
}

export interface CreateArea {
  name: string;
}

export interface PatchArea {
  name?: string;
}

export interface AreaUiFilters {
  name: string;
  page: number;
  limit: number;
}