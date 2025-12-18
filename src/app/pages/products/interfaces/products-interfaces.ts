export interface FiltersProducts {
  name?: string | '';
  limit: number;
  page: number;
}

export interface ProductsUiFilters {
  name: string;
  page: number;
  limit: number;
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
