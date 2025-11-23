import { Catalog } from "../../../shared/interfaces/general-interfaces";
import { DateRangeValue } from "../../../shared/ui/input-date/input-date";

export interface FiltersProject {
  name?: string | '';
  email?: string | '';
  phone?: string | '';
  clientsIds?: number[] | null;
  limit: number;
  page: number;
}

export interface ProjectResponseDto {
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


export interface CreateProject {
  date: string;
  supplier_id: number | null;
  items: {
    concept: string;
    amount: number;
    project_id: number | null;
  }[];
}

export interface PatchProject {
  concept?: string
  date?: string,
  amount?: number,
  supplier_id?: number | null;
  project_id?: number | null;
}

export interface ProjectDetail {
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

export interface ProjectUiFilters {
  clientsIds: number[];
  email: string;
  name: string;
  phone: string;
  page: number;
  limit: number;
}