export interface FiltersExpenses {
    concept?: string | '';
    startDate?: string | null | undefined;
    endDate?: string | null | undefined;
    suppliersIds?: number[]| null;
    projectIds?: number[] | null;
    status_id?: number | string | null;
    limit: number;
    page: number;
}

export interface ExpenseResponseDto {
    id: number;
    concept: string;
    date: string;
    amount: number;
    supplier: ExpenseSupplier;
    project: ExpenseProject;
}

export interface ExpenseSupplier {
    id: number;
    company_name: string;
}

export interface ExpenseProject {
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