import { Catalog } from '../../../shared/interfaces/general-interfaces';
import { DateRangeValue } from '../../../shared/ui/input-date/input-date';

/* =====================================================
 *  FILTROS (LISTADO DE CUENTAS POR COBRAR)
 * ===================================================== */

export interface FiltersAccountsReceivable {
  startDate?: string | null;
  endDate?: string | null;
  folio?: string | null;
  companyCode?: string | null;
  clientQuery?: string | null;
  status?: 'pending' | 'collected' | null;
  limit: number;
  page: number;
}

/* =====================================================
 *  RELACIONES / AUXILIARES
 * ===================================================== */

export interface AccountReceivableProject {
  id: number;
  name: string;
}

export interface AccountReceivableAdvance {
  id: number;
  amount: number;
  advance_date: string;
  created_at: string;
}

/* =====================================================
 *  RESPUESTA LISTADO
 * ===================================================== */

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
  subtotal: number;
  total: number;
  currency: string;
  status: 'pending' | 'collected';
  collected_at: string | null;
  source_file_name: string | null;
  advance_amount: number;
  project: AccountReceivableProject | null;
}

/* =====================================================
 *  RESPUESTA DETALLE
 * ===================================================== */

export interface AccountReceivableDetail extends AccountReceivableResponseDto {
  advances: AccountReceivableAdvance[];
}

/**
 * Mapper para la tabla
 */
export interface AccountReceivableRow extends AccountReceivableResponseDto {
  invoice_display: string;
  company_label: string;
  status_label: string;
}

/* =====================================================
 *  CREATE / UPDATE
 * ===================================================== */

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
  subtotal: number;
  total: number;
  currency?: string;
  status?: 'pending' | 'collected';
  collected_at?: string | null;
  source_file_name?: string | null;
  project_id?: number | null;
}

export interface UpdateAccountReceivable {
  status?: 'pending' | 'collected';
  collected_at?: string | null;
  project_id?: number | null;
}

/* =====================================================
 *  ANTICIPOS
 * ===================================================== */

export interface CreateAccountReceivableAdvance {
  amount: number;
  advance_date: string;
}

/* =====================================================
 *  FILTROS DE UI
 * ===================================================== */

export interface AccountsReceivableUiFilters {
  dateRange: DateRangeValue | null;
  folio: string;
  companyCode: string | null;
  clientQuery: string;
  status: 'pending' | 'collected' | null;
  page: number;
  limit: number;
}

/* =====================================================
 *  XML PREVIEW
 * ===================================================== */

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
  drafts: XmlAccountReceivableDraftDto[];
  duplicates: XmlAccountReceivableDuplicateDto[];
  errors: XmlAccountReceivableErrorDto[];
}

/* =====================================================
 *  ESTADO DE COLA XML
 * ===================================================== */

export interface XmlQueueState {
  total: number;
  pending: number;
}

/* =====================================================
 *  OPCIONES DE UI
 * ===================================================== */

export const ACCOUNTS_RECEIVABLE_STATUS_OPTIONS: Catalog[] = [
  { id: 'pending', name: 'Pendiente' },
  { id: 'collected', name: 'Cobrada' },
];

export const ACCOUNTS_RECEIVABLE_COMPANY_OPTIONS: Catalog[] = [
  { id: 'MUDECPLAY', name: 'MUDECPLAY' },
  { id: 'CONSTRUCTORA_PELEN', name: 'CONSTRUCTORA PELEN' },
  { id: 'OTRA', name: 'OTRA' },
];