export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ColumnsConfig {
  key: string;
  label: string;
}

export interface Catalog {
  id: string;
  name: string;
}
