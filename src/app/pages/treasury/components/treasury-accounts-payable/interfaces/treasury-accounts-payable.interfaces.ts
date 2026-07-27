import { Catalog } from '../../../../../shared/interfaces/general-interfaces';

import {
  TreasuryBankMovementStatus,
  TreasuryPaginationMeta,
} from '../../../interfaces/treasury.interfaces';

// =========================================================
// REFERENCIAS BÁSICAS
// =========================================================

export interface TreasuryAccountsPayableCompanyReference {
  id: number;
  code: string;
  name: string;
}

export interface TreasuryAccountsPayableBankReference {
  id: number;
  code: string;
  name: string;
}

export interface TreasuryAccountsPayableBankAccountReference {
  id: number;
  account_identifier: string;
  alias: string | null;
  currency?: string | null;
}

export interface TreasuryAccountsPayableSupplierReference {
  id: number | null;
  name: string | null;
  company_name: string | null;
  rfc: string | null;
  display_name: string;
}

export interface TreasuryAccountsPayableProjectReference {
  id: number;
  name: string | null;
}

export interface TreasuryAccountsPayableDateRange {
  startDate: string | null;
  endDate: string | null;
}

// =========================================================
// FILTROS: SALIDAS DISPONIBLES
// =========================================================

export interface TreasuryAvailableOutflowFilters {
  company_id?: number | null;
  bank_id?: number | null;
  bank_account_id?: number | null;

  date_from?: string | null;
  date_to?: string | null;

  search?: string;

  page: number;
  limit: number;
}

export interface TreasuryAvailableOutflowUiFilters {
  dateRange: TreasuryAccountsPayableDateRange | null;

  search: string;

  company_id: Catalog | number | string | null;
  bank_id: Catalog | number | string | null;
  bank_account_id: Catalog | number | string | null;

  page: number;
  limit: number;
}

// =========================================================
// SALIDAS BANCARIAS DISPONIBLES
// =========================================================

export interface TreasuryAvailableOutflow {
  id: string;

  movement_date: string;
  movement_time: string | null;
  movement_type: 'outflow';

  status: TreasuryBankMovementStatus;
  classification: string | null;

  description_original: string;

  bank_reference: string | null;
  receipt_number: string | null;
  tracking_key: string | null;

  counterparty_name: string | null;
  counterparty_account: string | null;

  amount: number;
  available_amount: number;
  applied_amount: number;
  manual_closed_amount?: number;

  notes: string | null;

  company: TreasuryAccountsPayableCompanyReference | null;
  bank: TreasuryAccountsPayableBankReference | null;
  bank_account: TreasuryAccountsPayableBankAccountReference | null;
}

export interface TreasuryAvailableOutflowTableRow
  extends TreasuryAvailableOutflow {
  company_name: string;
  bank_name: string;
  bank_account_display: string;

  reference_display: string;
  counterparty_display: string;

  status_label: string;
  classification_label: string;
}

export interface TreasuryAvailableOutflowsSummary {
  movements_count: number;
  available_amount: number;
}

export interface TreasuryAvailableOutflowsResponse {
  data: TreasuryAvailableOutflow[];

  summary: TreasuryAvailableOutflowsSummary;

  meta: TreasuryPaginationMeta;
}

// =========================================================
// FILTROS: CONCEPTOS PENDIENTES
// =========================================================

export type TreasuryPendingExpenseItemType =
  | 'direct'
  | 'warehouse';

export interface TreasuryPendingExpenseItemFilters {
  supplier_id?: number | null;
  project_id?: number | null;

  date_from?: string | null;
  date_to?: string | null;

  item_type?: TreasuryPendingExpenseItemType | null;
  origin_type?: string | null;

  search?: string;

  page: number;
  limit: number;
}

export interface TreasuryPendingExpenseItemUiFilters {
  dateRange: TreasuryAccountsPayableDateRange | null;

  search: string;

  supplier_id: Catalog | number | string | null;
  project_id: Catalog | number | string | null;

  item_type: TreasuryPendingExpenseItemType | '';

  page: number;
  limit: number;
}

// =========================================================
// CONCEPTOS PENDIENTES
// =========================================================

export type TreasuryPendingExpensePaymentStatus =
  | 'unpaid'
  | 'partial';

export interface TreasuryPendingExpenseItem {
  expense_item_id: number;
  expense_id: number;

  internal_folio: string;
  expense_date: string;
  expense_total_amount: number;

  cfdi_uuid: string | null;
  has_cfdi: boolean;

  origin_type: string | null;
  source_module: string | null;
  source_record_id: number | null;

  is_archived: boolean;

  concept: string;
  item_type: TreasuryPendingExpenseItemType;

  amount: number;
  paid_amount: number;
  pending_amount: number;

  payment_status: TreasuryPendingExpensePaymentStatus;
  payment_progress_percentage: number;

  supplier: TreasuryAccountsPayableSupplierReference;

  project: TreasuryAccountsPayableProjectReference | null;

  labor: {
    employee_name: string | null;
    area_name: string | null;
  } | null;
}

export interface TreasuryPendingExpenseItemTableRow
  extends TreasuryPendingExpenseItem {
  id: number;

  supplier_display_name: string;
  project_name: string;

  item_type_label: string;
  payment_status_label: string;
}

export interface TreasuryPendingExpenseItemsSummary {
  items_count: number;
  original_amount: number;
  paid_amount: number;
  pending_amount: number;
}

export interface TreasuryPendingExpenseItemsResponse {
  data: TreasuryPendingExpenseItem[];

  summary: TreasuryPendingExpenseItemsSummary;

  meta: TreasuryPaginationMeta;
}

// =========================================================
// APLICACIÓN DE PAGOS
// Se utilizará después en el componente de confirmación.
// =========================================================

export interface TreasuryApplyBankMovementApplication {
  expense_item_id: number;
  amount: number;
}

export interface TreasuryApplyBankMovementPayload {
  bank_movement_id: string;
  notes?: string | null;

  applications: TreasuryApplyBankMovementApplication[];
}

// =========================================================
// FILTROS: PAGOS HISTÓRICOS
// =========================================================

export type TreasuryHistoricalPaymentMethod =
  | 'unknown'
  | 'transfer'
  | 'cash';

export type TreasuryHistoricalRegularizationStatus =
  | 'pending'
  | 'regularized';

export type TreasuryHistoricalRegularizationType =
  | 'bank_transfer_matched'
  | 'historical_transfer_without_movement'
  | 'cash';

export interface TreasuryHistoricalPaymentFilters {
  search?: string;

  date_from?: string | null;
  date_to?: string | null;

  supplier_id?: number | null;
  project_id?: number | null;

  regularization_status?:
    | TreasuryHistoricalRegularizationStatus
    | null;

  regularization_type?:
    | TreasuryHistoricalRegularizationType
    | null;

  missing_payment_date?: boolean | null;

  page: number;
  limit: number;
}

export interface TreasuryHistoricalPaymentUiFilters {
  dateRange: TreasuryAccountsPayableDateRange | null;

  search: string;

  supplier_id: Catalog | number | string | null;
  project_id: Catalog | number | string | null;

  regularization_status:
    | TreasuryHistoricalRegularizationStatus
    | '';

  regularization_type:
    | TreasuryHistoricalRegularizationType
    | '';

  missing_payment_date:
    | 'true'
    | 'false'
    | '';

  page: number;
  limit: number;
}

// =========================================================
// PAGOS HISTÓRICOS
// =========================================================

export interface TreasuryHistoricalPaymentExpenseItem {
  id: number;

  concept: string;
  item_type: TreasuryPendingExpenseItemType;

  amount: number;

  legacy_payment_amount: number | null;
  legacy_payment_date: string | null;

  labor_area_name: string | null;
}

export interface TreasuryHistoricalPaymentExpense {
  id: number;

  internal_folio: string;
  date: string;

  total_amount: number;

  cfdi_uuid: string | null;
  origin_type: string | null;
  is_archived: boolean;

  labor_employee_name: string | null;
}

export interface TreasuryHistoricalPaymentBankMovement {
  id: string;

  movement_date: string;

  amount: number;
  available_amount: number;

  status: TreasuryBankMovementStatus;
  bank_reference: string | null;
}

export interface TreasuryHistoricalPaymentApplication {
  application_id: string;
  applied_amount: number;

  expense_item: TreasuryHistoricalPaymentExpenseItem | null;
  expense: TreasuryHistoricalPaymentExpense | null;

  supplier: TreasuryAccountsPayableSupplierReference | null;
  project: TreasuryAccountsPayableProjectReference | null;
}

export interface TreasuryHistoricalPayment {
  payment_id: string;

  payment_date: string | null;
  has_payment_date: boolean;

  amount: number;

  reference: string | null;
  notes: string | null;
  legacy_key: string | null;

  source_type: 'historical';
  origin: 'historical_migration';
  status: 'active';

  payment_method: TreasuryHistoricalPaymentMethod;

  regularization_status:
    TreasuryHistoricalRegularizationStatus;

  regularization_type:
    | TreasuryHistoricalRegularizationType
    | null;

  regularized_by_user_id: number | null;
  regularized_at: string | null;
  regularization_notes: string | null;

  company:
    | TreasuryAccountsPayableCompanyReference
    | null;

  bank_movement:
    | TreasuryHistoricalPaymentBankMovement
    | null;

  can_regularize: boolean;
  can_reopen_regularization: boolean;

  applications_count: number;

  expense_item:
    | TreasuryHistoricalPaymentExpenseItem
    | null;

  expense:
    | TreasuryHistoricalPaymentExpense
    | null;

  supplier:
    | TreasuryAccountsPayableSupplierReference
    | null;

  project:
    | TreasuryAccountsPayableProjectReference
    | null;

  applications:
    TreasuryHistoricalPaymentApplication[];
}

export interface TreasuryHistoricalPaymentTableRow
  extends TreasuryHistoricalPayment {
  id: string;

  payment_date_display: string;
  internal_folio: string;

  supplier_display_name: string;
  project_name: string;
  concept: string;

  payment_method_label: string;
  company_name: string;
  bank_movement_reference: string;

  regularization_status_label: string;
  regularization_type_label: string;
}

export interface TreasuryHistoricalPaymentsSummary {
  payments_count: number;
  total_amount: number;
  missing_payment_date_count: number;

  regularization_status:
    | TreasuryHistoricalRegularizationStatus
    | null;
}

export interface TreasuryHistoricalPaymentsResponse {
  data: TreasuryHistoricalPayment[];

  summary: TreasuryHistoricalPaymentsSummary;

  meta: TreasuryPaginationMeta;
}

// =========================================================
// HISTORIAL DE REGULARIZACIÓN
// Se usará después en su modal.
// =========================================================

export interface TreasuryHistoricalPaymentHistoryAction {
  id: string;

  action_type:
    | 'regularize'
    | 'reopen_regularization';

  regularization_type:
    TreasuryHistoricalRegularizationType;

  company_id: number | null;
  bank_movement_id: string | null;

  amount: number;

  previous_regularization_status:
    TreasuryHistoricalRegularizationStatus;

  new_regularization_status:
    TreasuryHistoricalRegularizationStatus;

  previous_payment_method:
    TreasuryHistoricalPaymentMethod;

  new_payment_method:
    TreasuryHistoricalPaymentMethod;

  reason: string;

  metadata:
    | Record<string, unknown>
    | null;

  created_by_user_id: number | null;
  created_at: string;
}

export interface TreasuryHistoricalPaymentHistoryResponse {
  payment: {
    id: string;
    amount: number;

    payment_date: string | null;
    payment_method:
      TreasuryHistoricalPaymentMethod;

    status: string;

    regularization_status:
      TreasuryHistoricalRegularizationStatus;

    regularization_type:
      | TreasuryHistoricalRegularizationType
      | null;

    company:
      | TreasuryAccountsPayableCompanyReference
      | null;

    bank_movement: {
      id: string;
      movement_date: string;
      amount: number;
      bank_reference: string | null;
    } | null;

    reference: string | null;

    regularized_by_user_id: number | null;
    regularized_at: string | null;
    regularization_notes: string | null;
  };

  history: TreasuryHistoricalPaymentHistoryAction[];

  summary: {
    actions_count: number;
  };
}