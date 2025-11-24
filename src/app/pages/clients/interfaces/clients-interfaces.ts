import { Catalog } from "../../../shared/interfaces/general-interfaces";

export interface FiltersClients {
  phone?: string | '';
  email?: string | '';
  suppliersIds?: number[] | null;
  areasIds?: number[] | null;
  limit: number;
  page: number;
}



export interface ClientsResponseDto {
  id: number;
  company_name: string;
  name: string;
  contact_name: string;
  phone: string;
  days_credit: number;
  will_invoice: boolean;
  email: string;
  address: string | null; 
  area: Area;             
}

export interface Area {
  id: number;
  name: string;
}

export interface Area {
  id: number;
  name: string;
}


export interface CreateClients {
  name: string;
  company_name?: string;
  area_id: number;
  phone: string;
  email: string;
  address?: string;
  days_credit?: number;
  contact_name?: string;
  will_invoice: boolean;
}

export interface PatchClients {
  concept?: string
  date?: string,
  amount?: number,
  supplier_id?: number | null;
  project_id?: number | null;
}

export interface ClientsUiFilters {
  clientsIds: number[];
  areasIds: number[];
  email: string;
  phone: string;
  page: number;
  limit: number;
}
