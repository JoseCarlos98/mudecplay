import {
  Catalog,
} from '../../../shared/interfaces/general-interfaces';

import {
  DateRangeValue,
} from '../../../shared/ui/input-date/input-date';


// =========================================================
// TIPOS FINANCIEROS
// =========================================================

export type AccountReceivableFinancialStatus =
  | 'pending'
  | 'partial'
  | 'collected';

export type AccountReceivableFinancialSource =
  | 'legacy'
  | 'treasury';


// =========================================================
// FILTROS
// =========================================================

export interface FiltersAccountsReceivable {
  startDate?: string | null;
  endDate?: string | null;

  folio?: string | null;
  companyCode?: string | null;
  clientQuery?: string | null;

  status?:
    | AccountReceivableFinancialStatus
    | null;

  limit: number;
  page: number;
}


// =========================================================
// RELACIONES / AUXILIARES
// =========================================================

export interface AccountReceivableProject {
  id: number;
  name: string;
}


/**
 * Historial legacy de anticipos.
 *
 * Se conserva temporalmente porque backend todavía
 * expone advances para compatibilidad durante el cutover.
 */
export interface AccountReceivableAdvance {
  id: number;
  amount: number;
  advance_date: string;
  created_at: string;
}


// =========================================================
// RESPUESTA LISTADO
// =========================================================

export interface AccountReceivableResponseDto {
  id: number;

  cfdi_uuid: string;

  series: string | null;
  folio: string;

  company_code: string;

  emitter_rfc: string;
  emitter_name: string;

  receiver_rfc: string;
  receiver_name: string;

  issue_date: string;

  estimated_collection_date:
    string | null;

  subtotal: number;
  total: number;

  currency: string;


  // =====================================================
  // ESTADO FINANCIERO RESUELTO
  // =====================================================

  collected_amount: number;
  pending_amount: number;

  status:
    AccountReceivableFinancialStatus;

  financial_source:
    AccountReceivableFinancialSource;

  has_treasury_history: boolean;

  requires_legacy_migration: boolean;

  last_collection_date:
    string | null;

  fully_collected_date:
    string | null;


  // =====================================================
  // CAMPOS LEGACY
  // Compatibilidad temporal.
  // Ya no son autoridad financiera.
  // =====================================================

  collected_at: string | null;

  advance_amount: number;


  // =====================================================
  // OTROS DATOS
  // =====================================================

  source_file_name: string | null;

  project:
    AccountReceivableProject | null;
}


// =========================================================
// RESPUESTA DETALLE
// =========================================================

export interface AccountReceivableDetail
  extends AccountReceivableResponseDto {

  advances:
    AccountReceivableAdvance[];
}


// =========================================================
// FILA DE TABLA
// =========================================================

export interface AccountReceivableRow
  extends AccountReceivableResponseDto {

  invoice_display: string;

  company_label: string;

  status_label: string;
}


// =========================================================
// CREATE
// =========================================================

export interface CreateAccountReceivable {
  cfdi_uuid: string;

  series?: string | null;

  folio: string;

  company_code: string;

  emitter_rfc: string;
  emitter_name: string;

  receiver_rfc: string;
  receiver_name: string;

  issue_date: string;

  estimated_collection_date?:
    string | null;

  subtotal: number;
  total: number;

  currency?: string;

  source_file_name?: string | null;

  project_id?: number | null;
}


// =========================================================
// UPDATE
// =========================================================

export interface UpdateAccountReceivable {
  estimated_collection_date?:
    string | null;

  project_id?: number | null;
}


// =========================================================
// ANTICIPOS LEGACY
// =========================================================

/**
 * Contrato legacy.
 *
 * Se conserva mientras siga existiendo:
 *
 * POST /accounts-receivable/:id/advances
 *
 * No debe utilizarse para el nuevo flujo Treasury.
 */
export interface CreateAccountReceivableAdvance {
  amount: number;
  advance_date: string;
}


// =========================================================
// FILTROS DE UI
// =========================================================

export interface AccountsReceivableUiFilters {
  dateRange:
    DateRangeValue | null;

  folio: string;

  companyCode:
    string | null;

  clientQuery: string;

  status:
    | AccountReceivableFinancialStatus
    | null;

  page: number;
  limit: number;
}


// =========================================================
// XML PREVIEW
// =========================================================

export interface XmlAccountReceivableDraftDto {
  uuid: string;

  sourceFileName: string;

  series: string | null;
  folio: string;

  issueDate: string;

  subtotal: number;
  total: number;

  currency: string;

  companyCode: string;

  emitterRfc: string;
  emitterName: string;

  receiverRfc: string;
  receiverName: string;
}


export interface XmlAccountReceivableDuplicateDto {
  uuid: string;

  sourceFileName: string;

  existingAccountReceivableId: number;
}


export interface XmlAccountReceivableErrorDto {
  sourceFileName: string;
  reason: string;
}


export interface XmlImportAccountReceivableResponseDto {
  drafts:
    XmlAccountReceivableDraftDto[];

  duplicates:
    XmlAccountReceivableDuplicateDto[];

  errors:
    XmlAccountReceivableErrorDto[];
}


// =========================================================
// ESTADO DE COLA XML
// =========================================================

export interface XmlQueueState {
  total: number;
  pending: number;
}


// =========================================================
// OPCIONES DE UI
// =========================================================

export const ACCOUNTS_RECEIVABLE_STATUS_OPTIONS:
  Catalog[] = [
    {
      id: 'pending',
      name: 'Pendiente',
    },
    {
      id: 'partial',
      name: 'Parcial',
    },
    {
      id: 'collected',
      name: 'Cobrada',
    },
  ];


export const ACCOUNTS_RECEIVABLE_COMPANY_OPTIONS:
  Catalog[] = [
    {
      id: 'MUDECPLAY',
      name: 'MUDECPLAY',
    },
    {
      id: 'CONSTRUCTORA_PELEN',
      name: 'CONSTRUCTORA PELEN',
    },
  ];