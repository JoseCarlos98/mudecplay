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
  name: string;
  contact_name: string;
  location: string;
  phone: string;
  email: string;
  days_credit: number;
  will_invoice: boolean;
}

export interface CreateProject {
  id?: number;
  responsible_id?: number;
  client_id?: number;
  name: string;
  location: string;
  phone: string;
  email: string;
  days_credit: number;
  contact_name: string;
  will_invoice: boolean;
}

export interface PatchProject {
  id?: number;
  responsible_id?: number;
  client_id?: number;
  name: string;
  location?: string;
  phone: string;
  email: string;
  days_credit?: number;
  contact_name?: string;
  will_invoice: boolean;
}

export interface ProjectUiFilters {
  clientsIds: number[];
  email: string;
  phone: string;
  name: string;
  page: number;
  limit: number;
}
