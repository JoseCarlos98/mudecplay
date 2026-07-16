import { Catalog } from '../../../shared/interfaces/general-interfaces';

// =========================================================
// TESORERÍA: CATÁLOGOS BASE
// =========================================================

export interface TreasuryCompany {
  id: number;
  code: string;
  name: string;
  rfc?: string | null;
  is_active: boolean;
}

export interface TreasuryBank {
  id: number;
  code: string;
  name: string;
  parser_code: string;
  is_active: boolean;
}

// =========================================================
// TESORERÍA: PAGINACIÓN BASE
// =========================================================

export interface TreasuryPaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface TreasuryPaginatedResponse<T> {
  data: T[];
  meta: TreasuryPaginationMeta;
}

// =========================================================
// TESORERÍA: CUENTAS BANCARIAS
// =========================================================

export interface TreasuryBankAccount {
  id: number;

  account_identifier: string;
  alias: string | null;
  currency: string;
  is_active: boolean;

  has_movements_or_files?: boolean;
  identity_locked?: boolean;

  company: TreasuryCompany | null;
  bank: TreasuryBank | null;

  created_at: string;
  updated_at: string;

  // Por si algún endpoint regresa camelCase accidentalmente
  accountIdentifier?: string;
  isActive?: boolean;
  hasMovementsOrFiles?: boolean;
  identityLocked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TreasuryBankAccountTableRow extends TreasuryBankAccount {
  company_name: string;
  bank_name: string;
  bank_parser_code: string;
  alias_display: string;
  is_active_label: string;
  created_at_date: string | null;
}

export interface TreasuryBankAccountFilters {
  company_id?: number | null;
  bank_id?: number | null;
  search?: string;
  is_active?: boolean | null;
}

export interface TreasuryBankAccountUiFilters {
  company_id: Catalog | number | string | null;
  bank_id: Catalog | number | string | null;
  search: string;
  is_active: 'true' | 'false' | '';
}

export interface CreateTreasuryBankAccountPayload {
  company_id: number;
  bank_id: number;
  account_identifier: string;
  alias?: string | null;
  currency?: string;
}

export interface UpdateTreasuryBankAccountPayload {
  company_id?: number;
  bank_id?: number;
  account_identifier?: string;
  alias?: string | null;
  currency?: string;
  is_active?: boolean;
}

export interface TreasuryBankAccountSaveResponse {
  id?: number;
  success: boolean;
  message: string;
}

// =========================================================
// TESORERÍA: FORMULARIO DE CUENTA BANCARIA
// =========================================================

export type TreasuryBankAccountFormMode = 'create' | 'edit';

export interface TreasuryBankAccountFormData {
  mode: TreasuryBankAccountFormMode;
  bankAccount?: TreasuryBankAccountTableRow | null;
}

// =========================================================
// TESORERÍA: MODAL ELIMINAR CUENTA BANCARIA
// =========================================================

export interface TreasuryDeleteBankAccountModalData {
  bankAccount: TreasuryBankAccountTableRow;
}

// =========================================================
// TESORERÍA: IMPORTACIÓN DE MOVIMIENTOS BANCARIOS
// =========================================================

export type TreasuryImportFileStatus =
  | 'processed'
  | 'processed_with_errors'
  | 'rejected';

export interface TreasuryImportBankMovementsResponse {
  success: boolean;
  import_file_id: number;
  status: TreasuryImportFileStatus | string;
  parser_code: string;

  total_rows: number;
  inserted_rows: number;
  duplicate_rows: number;
  skipped_rows: number;
  error_rows: number;

  message: string;
}

// =========================================================
// TESORERÍA: ARCHIVOS IMPORTADOS
// =========================================================

export interface TreasuryImportFileMetadataSummary {
  bank_format?: string | null;
  parsed_movements?: number | null;
  skipped_rows?: number | null;
  period_from_file?: string | null;
  account_from_file?: string | null;
  company_name_from_file?: string | null;
}

export interface TreasuryImportFile {
  id: number;

  original_file_name: string;
  file_hash?: string | null;
  parser_code: string;

  status: TreasuryImportFileStatus | string;

  total_rows: number;
  inserted_rows: number;
  duplicate_rows: number;
  error_rows: number;

  error_message: string | null;
  metadata_summary?: TreasuryImportFileMetadataSummary | null;

  created_at: string;

  company: TreasuryCompany | null;
  bank: TreasuryBank | null;

  bank_account: {
    id: number;
    account_identifier: string;
    alias: string | null;
  } | null;

  uploaded_by_user?: {
    id: number;
    name?: string | null;
    email?: string | null;
  } | null;
}

export interface TreasuryImportFileTableRow extends TreasuryImportFile {
  company_name: string | null;
  bank_name: string | null;
  bank_account_display: string | null;

  status_label: string;
  parser_label: string;

  created_at_date: string | null;
  rows_summary: string;

  uploaded_by_display: string | null;
  error_message_display: string | null;
}

export interface TreasuryImportFileFilters {
  company_id?: number | null;
  bank_account_id?: number | null;
  bank_id?: number | null;
  status?: TreasuryImportFileStatus | string | null;

  page: number;
  limit: number;
}

export interface TreasuryImportFileUiFilters {
  company_id: Catalog | number | string | null;
  bank_account_id: Catalog | number | string | null;
  bank_id: Catalog | number | string | null;
  status: TreasuryImportFileStatus | '';

  page: number;
  limit: number;
}

export type TreasuryImportFilesPaginatedResponse =
  TreasuryPaginatedResponse<TreasuryImportFile>;

// =========================================================
// TESORERÍA: MOVIMIENTOS BANCARIOS
// =========================================================

export type TreasuryBankMovementType = 'inflow' | 'outflow';

export type TreasuryBankMovementStatus =
  | 'unmatched'
  | 'partially_matched'
  | 'matched'
  | 'classified'
  | 'ignored'
  | 'internal_transfer'
  | 'manually_closed'
  | 'cancelled';

export interface TreasuryBankMovement {
  id: string;

  movement_date: string;
  movement_time: string | null;
  movement_type: TreasuryBankMovementType | string;
  classification: string | null;

  description_original: string;

  bank_reference: string | null;
  receipt_number: string | null;
  tracking_key: string | null;

  counterparty_name: string | null;
  counterparty_account: string | null;

  charge_amount: number;
  credit_amount: number;
  amount: number;
  available_amount: number;
  bank_balance: number | null;

  status: TreasuryBankMovementStatus | string;
  notes: string | null;

  created_at: string;
  updated_at: string;

  company: TreasuryCompany | null;
  bank: TreasuryBank | null;

  bank_account: {
    id: number;
    account_identifier: string;
    alias: string | null;
  } | null;

  import_file: {
    id: number;
    original_file_name: string;
  } | null;
}

export interface TreasuryBankMovementTableRow extends TreasuryBankMovement {
  company_name: string | null;
  bank_name: string | null;
  bank_account_display: string | null;

  movement_type_label: string;

  classification_label: string;
  status_label: string;

  reference_display: string | null;
  counterparty_display: string | null;
  import_file_name: string | null;
}

export interface TreasuryBankMovementFilters {
  company_id?: number | null;
  bank_account_id?: number | null;
  bank_id?: number | null;

  date_from?: string | null;
  date_to?: string | null;

  movement_type?: TreasuryBankMovementType | string | null;
  status?: TreasuryBankMovementStatus | string | null;

  search?: string;

  page: number;
  limit: number;
}

export interface TreasuryBankMovementDateRange {
  startDate: string | null;
  endDate: string | null;
}

export interface TreasuryBankMovementUiFilters {
  dateRange: TreasuryBankMovementDateRange | null;

  company_id: Catalog | number | string | null;
  bank_account_id: Catalog | number | string | null;
  bank_id: Catalog | number | string | null;

  movement_type: TreasuryBankMovementType | '';
  status: TreasuryBankMovementStatus | '';

  search: string;

  page: number;
  limit: number;
}

export type TreasuryBankMovementsPaginatedResponse =
  TreasuryPaginatedResponse<TreasuryBankMovement>;