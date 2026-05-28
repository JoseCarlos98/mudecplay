import { Catalog } from '../../../shared/interfaces/general-interfaces';

export type PurchaseOrderStatus =
  | 'in_review'
  | 'authorized'
  | 'not_authorized'
  | 'cancelled';

export type PurchaseOrderDestinationType = 'direct' | 'warehouse';

export interface PurchaseOrderUserDto {
  id: number;
  name: string;
}

export interface PurchaseOrderProjectDto {
  id: number;
  name: string;
}

export interface PurchaseOrderResponseDto {
  id: number;

  folio: string;

  project: PurchaseOrderProjectDto | null;

  requested_by_employee?: {
    id: number;
    name: string;
  } | null;

  destination_type: PurchaseOrderDestinationType;
  destination_type_label: string;

  will_have_invoice: boolean;
  will_have_invoice_label: string;

  concept: string;
  requested_amount: number;

  status: PurchaseOrderStatus;
  status_label: string;

  requested_by_user: PurchaseOrderUserDto | null;
  requested_by_name: string | null;

  created_by_user: PurchaseOrderUserDto | null;

  authorized_by_name: string | null;
  authorization_registered_by_user: PurchaseOrderUserDto | null;
  authorized_at: string | null;

  notes: string | null;

  created_at: string;
  updated_at: string;

  // Campos solo cuando venga detalle
  ticket_photos_count?: number;
  expense_links_count?: number;

  // Campos UI
  project_name?: string;
  requested_by_display?: string;
  destination_name?: string;
  invoice_name?: string;
  status_name?: string;
  created_at_date?: string;
  authorized_at_date?: string | null;
}

export interface PurchaseOrdersPaginatedResponse {
  data: PurchaseOrderResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PurchaseOrderFilters {
  page: number;
  limit: number;

  search?: string | null;
  status?: PurchaseOrderStatus | null;
  destination_type?: PurchaseOrderDestinationType | null;
  will_have_invoice?: boolean | null;
  project_id?: number | null;
}

export interface PurchaseOrderUiFilters {
  page: number;
  limit: number;

  search?: string | null;
  status?: PurchaseOrderStatus | '' | null;
  destination_type?: PurchaseOrderDestinationType | '' | null;
  will_have_invoice?: 'true' | 'false' | '' | null;

  // Para futuro si usamos autocomplete de proyecto
  projects?: Catalog[];
}

export interface CreatePurchaseOrderDto {
  project_id?: number | null;
  destination_type: PurchaseOrderDestinationType;
  will_have_invoice: boolean;
  concept: string;
  requested_amount: number;
  requested_by_user_id?: number | null;
  requested_by_name?: string | null;
  notes?: string | null;
}

export interface UpdatePurchaseOrderDto {
  project_id?: number | null;
  destination_type?: PurchaseOrderDestinationType;
  will_have_invoice?: boolean;
  concept?: string;
  requested_amount?: number;
  requested_by_user_id?: number | null;
  requested_by_name?: string | null;
  notes?: string | null;
}

export interface AuthorizePurchaseOrderDto {
  authorized_by_name: string;
  notes?: string | null;
}

export interface RejectPurchaseOrderDto {
  reason: string;
}

export interface CancelPurchaseOrderDto {
  reason: string;
}

export interface PurchaseOrderRequesterEmployeeDto {
  id: number;
  name: string;
  full_name?: string;
  position?: string | null;
  employee_area?: {
    id: number;
    name: string;
  } | null;
}

export interface PurchaseOrderRequesterDto {
  id: number;
  employee: PurchaseOrderRequesterEmployeeDto | null;
  employee_id: number | null;
  employee_name: string | null;
  is_active: boolean;
  created_by_user: {
    id: number;
    name: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseOrderRequesterDto {
  employee_id: number;
}

export interface PurchaseOrderRequesterSaveResponse {
  success: boolean;
  message: string;
  data: PurchaseOrderRequesterDto;
}