export interface FiltersExpenses {
    proveedores: string[];
    proyectos: string[];
    fecha: string;
}

export interface ExpenseResponseDto  {
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

export interface ExpenseResponseDtoMapper  {
    id: number;
    concept: string;
    date: string;
    amount: string;
    supplier: string;
    project: string;
    originData: ExpenseResponseDto;
}

