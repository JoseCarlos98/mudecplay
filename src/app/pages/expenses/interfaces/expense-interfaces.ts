export interface FiltersExpenses {
    concept?: string | '';
    startDate?: string | null;
    endDate?: string | null;
    suppliersIds?: number[]| null;
    projectIds?: number[] | null;
    status_id?: number | null;
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
    concept: string
    date: string,
    amount: number,
    supplier_id?: number | null;
    project_id?: number | null;
}

export interface PatchExpense {
    concept?: string
    date?: string,
    amount?: number,
    supplier_id?: number | null;
    project_id?: number | null;
} 