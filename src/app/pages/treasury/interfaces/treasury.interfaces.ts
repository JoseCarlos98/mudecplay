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

export interface TreasuryBankAccount {
  id: number;

  account_identifier: string;
  alias: string | null;
  currency: string;
  is_active: boolean;

  company: TreasuryCompany | null;
  bank: TreasuryBank | null;

  created_at: string;
  updated_at: string;

  // Por si algún endpoint regresa camelCase accidentalmente
  accountIdentifier?: string;
  isActive?: boolean;
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