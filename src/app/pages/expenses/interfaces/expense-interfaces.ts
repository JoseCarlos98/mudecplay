import { Catalog } from "../../../shared/interfaces/general-interfaces";

export interface FiltersExpenses {
  concept?: string | '';
  startDate?: string | null | undefined;
  endDate?: string | null | undefined;
  suppliersIds?: number[] | null;
  projectIds?: number[] | null;
  status_id?: number | string | null;
  limit: number;
  page: number;
}

export interface ExpenseResponseDto {
  id: number;
  date: string; 
  folio: string;
  total_amount: number;
  supplier: Supplier;
  status: ExpenseStatus;
  items: ExpenseItem[];
}

export interface Supplier {
  id: number;
  company_name: string;
}

export interface ExpenseStatus {
  id: number;
  name: string;
}

export interface ExpenseItem {
  id: number;
  concept: string;
  amount: number;
  project: Project | null;
}

export interface Project {
  id: number;
  name: string;
}

export interface ExpenseResponseDtoMapper {
  id: number;
  concept: string;
  date: string;
  amount: number;
  supplier: string;
  project: string;
  originData: ExpenseResponseDto;
}

export interface CreateExpense {
  date: string;
  supplier_id: number | null;
  items: {
    concept: string;
    amount: number;
    project_id: number | null;
  }[];
}

export interface PatchExpense {
  concept?: string
  date?: string,
  amount?: number,
  supplier_id?: number | null;
  project_id?: number | null;
}

export interface ExpenseItemDetail {
  id: number;
  concept: string;
  amount: number;
  project: {
    id: number;
    name: string;
  } | null;
}

export interface ExpenseDetail {
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
  items: ExpenseItemDetail[];
}

export interface ExpenseItemForm {
  concept: string;
  amount: number | null;
  // project_id: number | { id: number; name: string } | null;
  project_id: Catalog | null; 
}
