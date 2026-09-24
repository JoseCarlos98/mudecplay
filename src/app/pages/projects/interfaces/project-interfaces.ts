import { Area } from "../../suppliers/interfaces/supplier-interfaces";
import { Catalog } from "../../../shared/interfaces/general-interfaces";

export type ProjectSortDirection = 'asc' | 'desc';

export interface ProjectSortItem {
  key: string;
  direction: ProjectSortDirection;
}

export interface FiltersProject {
  name?: string | '';
  email?: string | '';
  phone?: string | '';
  statusProject?: string | '';
  clientsIds?: number[] | null;
  responsibleIds?: number[] | null;

  page: number;
  limit: number;

  sorts?: ProjectSortItem[];
}

export interface ProjectResponseDto {
  id: number;
  name: string;
  contact_name: string | null;
  location: string | null;
  phone: string;
  email: string;
  days_credit: number;

  charge_amount: number;

  will_invoice: boolean;
  statusProject: boolean;

  area: Area | null;

  client?: Catalog | null;
  responsible?: Catalog | null;
}

export interface CreateProject {
  responsible_id?: number | null;
  client_id?: number | null;
  area_id?: number | null;

  name: string;
  location?: string | null;
  phone: string;
  email: string;
  days_credit?: number | null;

  charge_amount: number;

  contact_name?: string | null;
  will_invoice: boolean;
  statusProject: boolean;
}

export interface PatchProject {
  responsible_id?: number | null;
  client_id?: number | null;
  area_id?: number | null;

  name: string;
  location?: string | null;
  phone: string;
  email: string;
  days_credit?: number | null;

  charge_amount?: number;

  contact_name?: string | null;
  will_invoice: boolean;
  statusProject: boolean;
}

export interface ProjectUiFilters {
  clientsIds: number[];
  responsibleIds: number[];
  email: string;
  phone: string;

  statusProject: 'open' | 'close' | null;

  name: string;

  page: number;
  limit: number;

  sorts: ProjectSortItem[];
}


// ======================================================
// COBROS EN EFECTIVO
// ======================================================

export interface ProjectCashCollection {
  id: number;
  project_id: number;

  amount: number;

  received_date: string;

  notes: string | null;

  created_at: string;
}

export interface ProjectCashCollectionsResponse {
  data: ProjectCashCollection[];
  total_amount: number;
}

export interface CreateProjectCashCollection {
  amount: number;
  received_date: string;
  notes?: string | null;
}


// ======================================================
// RESPUESTA CREACIÓN PROYECTO
// ======================================================

export interface CreateProjectResponse {
  id: number;
  message: string;
  success: boolean;
}