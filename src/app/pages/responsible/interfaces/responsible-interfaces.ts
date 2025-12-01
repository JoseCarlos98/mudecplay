export interface FiltersResponsible {
  name?: string | '';
  phone?: string | '';
  limit: number;
  page: number;
}

export interface ResponsibleResponseDto {
  id: number;
  name: string;
  company_name: string;
  contact_name: string;
  address: string;
  phone: string;
  email: string;
  days_credit: number;
  will_invoice: boolean;
  resposible_id: number;
}

export interface CreateResponsible {
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

export interface PatchResponsible {
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

export interface ResponsibleUiFilters {
  phone: string;
  name: string;
  page: number;
  limit: number;
}
