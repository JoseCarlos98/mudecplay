export type ProductSortDirection = 'asc' | 'desc';

export interface ProductSortItem {
  key: string;
  direction: ProductSortDirection;
}

export interface FiltersProducts {
  name?: string | '';

  page: number;
  limit: number;

  sorts?: ProductSortItem[];
}

export interface ProductsUiFilters {
  name: string;

  page: number;
  limit: number;

  sorts: ProductSortItem[];
}
export interface ProductResponseDto {
  id: number;
  name: string;
  clave_prod_serv: string | null;
  no_identificacion: string | null;
}

export interface CreateProduct {
  id?: number; 
  name: string;
  clave_prod_serv?: string | null;
  no_identificacion?: string | null;
}

export interface PatchProduct {
  id?: number;
  name?: string;
  clave_prod_serv?: string | null;
  no_identificacion?: string | null;
}
