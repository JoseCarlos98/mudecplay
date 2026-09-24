export type AreaSortDirection = 'asc' | 'desc';

export interface AreaSortItem {
  key: string;
  direction: AreaSortDirection;
}
export interface FiltersArea {
  name?: string | '';

  page: number;
  limit: number;

  sorts?: AreaSortItem[];
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

  sorts: AreaSortItem[];
}