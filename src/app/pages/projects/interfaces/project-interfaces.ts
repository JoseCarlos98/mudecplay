export interface FiltersProject {
  name?: string | '';
  email?: string | '';
  phone?: string | '';
  statusProject?: string | '';
  clientsIds?: number[] | null;
  responsibleIds?: number[] | null;
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
  statusProject: boolean;
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
  statusProject: boolean;
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
  charge_amount?: number;
  contact_name?: string;
  will_invoice: boolean;
  statusProject: boolean;
}

export interface ProjectUiFilters {
  clientsIds: number[];
  responsibleIds: number[];
  email: string;
  phone: string;
  statusProject: string;
  name: string;
  page: number;
  limit: number;
}
