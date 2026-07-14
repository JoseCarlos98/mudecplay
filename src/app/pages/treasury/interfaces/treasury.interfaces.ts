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
// TESORERÍA: CUENTAS BANCARIAS
// =========================================================

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
  } | null;
}

export interface TreasuryImportFileTableRow extends TreasuryImportFile {
  company_name: string;
  bank_name: string;
  bank_account_display: string;
  status_label: string;
  created_at_date: string | null;
  rows_summary: string;
}

export interface TreasuryImportFileFilters {
  company_id?: number | null;
  bank_account_id?: number | null;
  bank_id?: number | null;
  status?: TreasuryImportFileStatus | string | null;
  page: number;
  limit: number;
}