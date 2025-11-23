import { Catalog } from "../../../shared/interfaces/general-interfaces";
import { DateRangeValue } from "../../../shared/ui/input-date/input-date";

export interface FiltersSupplier {
  phone?: string | '';
  email?: string | '';
  suppliersIds?: number[] | null;
  areasIds?: number[] | null;
  limit: number;
  page: number;
}

export interface SupplierResponseDto {
  id: number;
  company_name: string;
  email: string;
  phone: string;
  area: Area;
}

export interface Area {
  id: number;
  name: string;
}


export interface CreateSupplier {
  date: string;
  supplier_id: number | null;
  items: {
    concept: string;
    amount: number;
    project_id: number | null;
  }[];
}

export interface PatchSupplier {
  concept?: string
  date?: string,
  amount?: number,
  supplier_id?: number | null;
  project_id?: number | null;
}

export interface SupplierItemDetail {
  id: number;
  concept: string;
  amount: number;
  project: {
    id: number;
    name: string;
  } | null;
}

export interface SupplierDetail {
  id: number;
  date: string;
  folio: string;
  total_amount: number;
  supplier: {
    id: number;
    company_name: string;
  } | null;
  status: {
    id: number;
    name: string;
  };
}

export interface SupplierUiFilters {
  suppliersIds: number[];
  areasIds: number[];
  email: string;
  phone: string;
  page: number;
  limit: number;
}