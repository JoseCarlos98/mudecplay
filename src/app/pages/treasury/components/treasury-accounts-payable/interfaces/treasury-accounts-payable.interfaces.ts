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

  minimum_available_amount?: number | null;

  date_from?: string | null;
  date_to?: string | null;

  amount?: number | null;

  search?: string;

  page: number;
  limit: number;
}

export interface TreasuryAvailableOutflowUiFilters {
  dateRange: TreasuryAccountsPayableDateRange | null;

  search: string;
    amount: number | null;

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
  description_display?: string;

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
 amount?: number | null;
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
  amount: number | null;

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


// =========================================================
// MODAL: CONFIRMAR APLICACIÓN DE PAGO
// =========================================================

export interface TreasuryApplyBankMovementModalApplication {
  item: TreasuryPendingExpenseItemTableRow;
  amount: number;
}

export interface TreasuryApplyBankMovementModalData {
  movement: TreasuryAvailableOutflowTableRow;
  applications: TreasuryApplyBankMovementModalApplication[];
}

// =========================================================
// RESPUESTA: APLICAR MOVIMIENTO BANCARIO
// =========================================================

export interface TreasuryApplyBankMovementResponse {
  success: boolean;
  message: string;

  payment: {
    id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    reference: string;
    notes: string | null;
  };

  bank_movement: {
    id: string;
    previous_available_amount: number;
    applied_amount: number;
    available_amount: number;
    status: TreasuryBankMovementStatus;

    company: {
      id: number;
      code: string;
      name: string;
    };
  };

  applications: Array<{
    id: string;
    expense_item_id: number;
    expense_id: number;
    applied_amount: number;
    previous_paid_amount: number;
    previous_pending_amount: number;
    new_pending_amount: number;
  }>;
}


// =========================================================
// HISTORIAL DE MOVIMIENTO BANCARIO
// =========================================================

export interface TreasuryBankMovementHistoryModalData {
  movement: TreasuryAvailableOutflowTableRow;
}

export interface TreasuryBankMovementHistoryUser {
  id: number;
  name: string;
}

export interface TreasuryBankMovementHistoryExpenseItem {
  id: number;
  concept: string | null;
  item_type: TreasuryPendingExpenseItemType;
  amount: number;
}

export interface TreasuryBankMovementHistoryExpense {
  id: number;
  internal_folio: string;
  date: string | null;
  total_amount: number;
}

export interface TreasuryBankMovementHistoryApplication {
  application_id: string;
  expense_item_id?: number;
  expense_id?: number;

  applied_amount: number;
  status?: string | null;

  previous_paid_amount?: number | null;
  previous_pending_amount?: number | null;
  new_pending_amount?: number | null;

  expense_item:
  | TreasuryBankMovementHistoryExpenseItem
  | null;

  expense:
  | TreasuryBankMovementHistoryExpense
  | null;

  supplier:
  | TreasuryAccountsPayableSupplierReference
  | null;

  project:
  | TreasuryAccountsPayableProjectReference
  | null;
}

export interface TreasuryBankMovementHistoryPayment {
  payment_id: string;

  amount: number;
  payment_date: string | null;
  payment_method: string;

  reference: string | null;
  notes: string | null;

  status: string;
  created_at: string | null;

  created_by_user:
  | TreasuryBankMovementHistoryUser
  | null;

  applications: TreasuryBankMovementHistoryApplication[];
}

export type TreasuryBankMovementActionType =
  | 'payment_applied'
  | 'payment_reversed'
  | 'manual_close'
  | 'manual_close_reopened'
  | 'reopen_manual_close'
  | string;

export interface TreasuryBankMovementHistoryAction {
  id: string;

  action_type: TreasuryBankMovementActionType;

  payment_id?: string | null;

  amount: number | null;

  previous_available_amount: number | null;
  new_available_amount: number | null;

  previous_manual_closed_amount?: number | null;
  new_manual_closed_amount?: number | null;

  previous_status:
  | TreasuryBankMovementStatus
  | null;

  new_status:
  | TreasuryBankMovementStatus
  | null;

  reason: string | null;
  notes?: string | null;

  metadata:
  | Record<string, unknown>
  | null;

  created_by_user:
  | TreasuryBankMovementHistoryUser
  | null;

  created_at: string;
}

export interface TreasuryBankMovementHistoryCurrentMovement {
  id: string;

  movement_date: string;
  movement_time: string | null;
  movement_type: string;

  amount: number;
  available_amount: number;
  applied_amount: number;
  manual_closed_amount: number;

  status: TreasuryBankMovementStatus;
  classification: string | null;

  description_original: string;
  bank_reference: string | null;
  receipt_number: string | null;
  tracking_key: string | null;

  company:
  | TreasuryAccountsPayableCompanyReference
  | null;

  bank:
  | TreasuryAccountsPayableBankReference
  | null;

  bank_account:
  | TreasuryAccountsPayableBankAccountReference
  | null;
}

export interface TreasuryBankMovementHistoryResponse {
  movement?: TreasuryBankMovementHistoryCurrentMovement;

  payments?: TreasuryBankMovementHistoryPayment[];

  actions?: TreasuryBankMovementHistoryAction[];

  /**
   * Compatibilidad en caso de que el backend
   * devuelva la bitácora con el nombre history.
   */
  history?: TreasuryBankMovementHistoryAction[];

  summary?: {
    payments_count?: number;
    active_payments_count?: number;

    applications_count?: number;
    actions_count?: number;

    applied_amount?: number;
    reversed_amount?: number;
    manually_closed_amount?: number;
  };
}


// =========================================================
// CIERRE MANUAL DE MOVIMIENTO BANCARIO
// =========================================================

export interface TreasuryManualCloseBankMovementModalData {
  movement: TreasuryAvailableOutflowTableRow;
}

export interface TreasuryManualCloseBankMovementPayload {
  reason: string;
}

export interface TreasuryManualCloseBankMovementResponse {
  success: boolean;
  message: string;

  bank_movement: {
    id: string;

    amount: number;
    applied_amount: number;

    previous_available_amount: number;
    manual_closed_amount: number;
    available_amount: number;

    status: TreasuryBankMovementStatus;

    manually_closed_by_user_id: number | null;
    manually_closed_at: string | null;
    manual_close_reason: string | null;

    company: {
      id: number;
      code: string;
      name: string;
    } | null;

    bank: {
      id: number;
      code: string;
      name: string;
    } | null;

    bank_account: {
      id: number;
      account_identifier: string;
      alias: string | null;
      currency: string;
    } | null;
  };
}


// =========================================================
// REAPERTURA MANUAL DE MOVIMIENTO BANCARIO
// =========================================================

export interface TreasuryManualReopenBankMovementModalData {
  movement: TreasuryBankMovementHistoryCurrentMovement;
}

export interface TreasuryManualReopenBankMovementPayload {
  reason: string;
}

export interface TreasuryManualReopenBankMovementResponse {
  success: boolean;
  message: string;

  bank_movement: {
    id: string;

    amount: number;
    applied_amount: number;

    previous_available_amount: number;
    reopened_amount: number;

    manual_closed_amount: number;
    available_amount: number;

    previous_status: TreasuryBankMovementStatus;
    status: TreasuryBankMovementStatus;

    reopened_by_user_id: number;

    company: {
      id: number;
      code: string;
      name: string;
    } | null;

    bank: {
      id: number;
      code: string;
      name: string;
    } | null;

    bank_account: {
      id: number;
      account_identifier: string;
      alias: string | null;
      currency: string;
    } | null;
  };
}


// =========================================================
// REVERSIÓN DE PAGO BANCARIO
// =========================================================

export interface TreasuryReversePaymentModalApplication {
  application_id: string;
  expense_item_id: number;
  expense_id: number;
  applied_amount: number;
  status: string;

  expense_item: {
    id: number;
    concept: string | null;
    item_type: string;
    amount: number;
  } | null;

  expense: {
    id: number;
    internal_folio: string | null;
    date: string | null;
    total_amount: number;
  } | null;

  supplier: {
    id: number | null;
    display_name: string;
  } | null;

  project: {
    id: number;
    name: string;
  } | null;
}

export interface TreasuryReversePaymentModalPayment {
  payment_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  source_type: string;
  origin: string;
  reference: string | null;
  notes: string | null;
  status: string;

  applications: TreasuryReversePaymentModalApplication[];
}

export interface TreasuryReversePaymentModalMovement {
  id: string;

  movement_date: string;
  amount: number;
  available_amount: number;
  applied_amount: number;
  manual_closed_amount: number;

  status: TreasuryBankMovementStatus;

  bank_reference: string | null;
  receipt_number: string | null;
  tracking_key: string | null;

  company: {
    id: number;
    code: string;
    name: string;
  } | null;

  bank: {
    id: number;
    code: string;
    name: string;
  } | null;

  bank_account: {
    id: number;
    account_identifier: string;
    alias: string | null;
    currency: string;
  } | null;
}

export interface TreasuryReversePaymentModalData {
  payment: TreasuryBankMovementHistoryPayment;
  movement: TreasuryBankMovementHistoryCurrentMovement;
}

export interface TreasuryReversePaymentPayload {
  reason: string;
}

export interface TreasuryReversePaymentResponse {
  success: boolean;
  message: string;

  payment: {
    id: string;
    amount: number;

    payment_method: string;
    source_type: string;

    status: string;

    reversed_at: string;
    reversed_by_user_id: number;
    reversal_reason: string;
  };

  bank_movement: {
    id: string;
    amount: number;

    previous_available_amount: number;
    restored_amount: number;
    remaining_applied_amount: number;
    manual_closed_amount: number;
    available_amount: number;

    status:
    TreasuryBankMovementStatus;
  } | null;

  applications: Array<{
    id: string;
    expense_item_id: number;
    restored_amount: number;
    status: string;
  }>;
}
export interface TreasuryRegularizeHistoricalPaymentModalData {
  payment: TreasuryHistoricalPaymentTableRow;
}

export interface TreasuryRegularizeHistoricalPaymentPayload {
  regularization_type:
  TreasuryHistoricalRegularizationType;

  company_id?: number;
  bank_movement_id?: string;

  reference?: string;
  reason: string;
}

export interface TreasuryRegularizeHistoricalPaymentResponse {
  success: boolean;
  message: string;

  payment: {
    id: string;
    amount: number;

    payment_date: string | null;

    payment_method:
    TreasuryHistoricalPaymentMethod;

    regularization_status:
    TreasuryHistoricalRegularizationStatus;

    regularization_type:
    TreasuryHistoricalRegularizationType;

    company: {
      id: number | null;
      code: string | null;
      name: string;
    };

    bank_movement:
    | TreasuryHistoricalPaymentBankMovement
    | null;

    reference: string | null;

    regularized_by_user_id: number;
    regularized_at: string;
    regularization_notes: string;
  };
}


// =========================================================
// MODAL: REABRIR REGULARIZACIÓN HISTÓRICA
// =========================================================

export interface TreasuryReopenHistoricalRegularizationModalData {
  payment:
  TreasuryHistoricalPaymentTableRow;
}

export interface TreasuryReopenHistoricalRegularizationPayload {
  reason: string;
}

export interface TreasuryReopenedHistoricalPayment {
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

  company: null;
  bank_movement: null;

  reference: string | null;

  regularized_by_user_id:
  number | null;

  regularized_at:
  string | null;

  regularization_notes:
  string | null;

  reopened_by_user_id:
  number;

  reopened_at:
  string;
}

export interface TreasuryRestoredHistoricalBankMovement {
  id: string;

  amount: number;

  restored_amount: number;

  previous_available_amount:
  number;

  available_amount:
  number;

  manual_closed_amount:
  number;

  status:
  TreasuryBankMovementStatus;
}

export interface TreasuryReopenHistoricalRegularizationResponse {
  success: boolean;
  message: string;

  payment:
  TreasuryReopenedHistoricalPayment;

  restored_bank_movement:
  | TreasuryRestoredHistoricalBankMovement
  | null;
}


// =========================================================
// MODAL: HISTORIAL DE PAGO HISTÓRICO
// =========================================================

export interface TreasuryHistoricalPaymentHistoryModalData {
  payment: TreasuryHistoricalPaymentTableRow;
}


// =========================================================
// HISTORIAL DE PAGOS POR CONCEPTO
// =========================================================

export type TreasuryExpenseItemPaymentHistoryActionType =
  | 'payment_applied'
  | 'payment_reversed';

export interface TreasuryExpenseItemPaymentHistoryModalData {
  expenseItem: TreasuryPendingExpenseItemTableRow;
}

export interface TreasuryExpenseItemPaymentHistoryCompany {
  id: number;
  code: string;
  name: string;
}

export interface TreasuryExpenseItemPaymentHistoryBank {
  id: number;
  code: string;
  name: string;
}

export interface TreasuryExpenseItemPaymentHistoryBankAccount {
  id: number;
  alias: string | null;
  account_identifier: string | null;
}

export interface TreasuryExpenseItemPaymentHistoryMovement {
  id: string;

  movement_date: string | null;

  amount: number;
  available_amount: number;

  status: string;

  bank_reference: string | null;
  description: string | null;

  bank:
  | TreasuryExpenseItemPaymentHistoryBank
  | null;

  bank_account:
  | TreasuryExpenseItemPaymentHistoryBankAccount
  | null;
}

export interface TreasuryExpenseItemPaymentHistoryApplication {
  id: string;

  status: string;

  applied_amount: number;

  created_by_user_id: number | null;
  created_at: string;

  reversed_by_user_id: number | null;
  reversed_at: string | null;
  reversal_reason: string | null;
}

export interface TreasuryExpenseItemPaymentHistoryPayment {
  id: string;

  amount: number;
  payment_date: string | null;

  payment_method: string;
  source_type: string;
  origin: string;
  status: string;

  reference: string | null;
  notes: string | null;

  created_by_user_id: number | null;
  created_at: string;

  reversed_by_user_id: number | null;
  reversed_at: string | null;
  reversal_reason: string | null;

  company:
  | TreasuryExpenseItemPaymentHistoryCompany
  | null;

  bank_movement:
  | TreasuryExpenseItemPaymentHistoryMovement
  | null;
}

export interface TreasuryExpenseItemPaymentHistoryEvent {
  event_id: string;

  action_type:
  TreasuryExpenseItemPaymentHistoryActionType;

  event_at: string;

  amount: number;

  previous_pending_amount: number;
  new_pending_amount: number;

  application:
  TreasuryExpenseItemPaymentHistoryApplication;

  payment:
  TreasuryExpenseItemPaymentHistoryPayment;
}

export interface TreasuryExpenseItemPaymentHistoryExpenseItem {
  id: number;
  expense_id: number;

  internal_folio: string;
  expense_date: string | null;

  cfdi_uuid: string | null;
  has_cfdi: boolean;

  concept: string;
  item_type: TreasuryPendingExpenseItemType;

  amount: number;
  paid_amount: number;
  pending_amount: number;

  payment_status:
  | 'unpaid'
  | 'partial'
  | 'paid';

  supplier:
  TreasuryAccountsPayableSupplierReference;

  project:
  | TreasuryAccountsPayableProjectReference
  | null;
}

export interface TreasuryExpenseItemPaymentHistorySummary {
  applications_count: number;
  events_count: number;

  active_applications_count: number;
  reversed_applications_count: number;

  original_amount: number;
  paid_amount: number;
  pending_amount: number;
}

export interface TreasuryExpenseItemPaymentHistoryResponse {
  expense_item:
  TreasuryExpenseItemPaymentHistoryExpenseItem;

  history:
  TreasuryExpenseItemPaymentHistoryEvent[];

  summary:
  TreasuryExpenseItemPaymentHistorySummary;
}


// =========================================================
// PAGO ACTUAL EN EFECTIVO
// =========================================================

export interface TreasuryApplyCashPaymentModalData {
  item: TreasuryPendingExpenseItemTableRow;
}

export interface TreasuryApplyCashPaymentPayload {
  expense_item_id: number;
  amount: number;
  payment_date: string;

  company_id?: number | null;
  reference?: string | null;
  notes?: string | null;
}

export interface TreasuryApplyCashPaymentResponse {
  success: boolean;
  message: string;

  payment: {
    id: string;
    amount: number;

    payment_date: string;
    payment_method: 'cash';
    source_type: 'manual';

    status: string;

    reference: string | null;
    notes: string | null;

    created_by_user_id: number;

    company: {
      id: number | null;
      code: string | null;
      name: string;
    };

    bank_movement: null;
  };

  application: {
    id: string;

    expense_item_id: number;
    expense_id: number;

    applied_amount: number;

    previous_paid_amount: number;
    previous_pending_amount: number;

    new_paid_amount: number;
    new_pending_amount: number;

    payment_status:
    | 'partial'
    | 'paid';
  };
}


// =========================================================
// MODAL: REVERTIR PAGO ACTUAL DESDE HISTORIAL DEL CONCEPTO
// =========================================================

export interface TreasuryCurrentPaymentReverseModalPayment {
  id: string;

  amount: number;

  payment_date: string | null;
  payment_method: string;
  source_type: string;
  origin: string;
  status: string;

  reference: string | null;
  notes: string | null;

  company: {
    id: number | null;
    code: string | null;
    name: string;
  } | null;

  bank_movement: {
    id: string;

    movement_date: string | null;

    amount: number;
    available_amount: number;

    status: string;

    bank_reference: string | null;
    description: string | null;

    bank: {
      id: number;
      code: string;
      name: string;
    } | null;

    bank_account: {
      id: number;
      alias: string | null;
      account_identifier: string | null;
    } | null;
  } | null;
}

export interface TreasuryCurrentPaymentReverseModalApplication {
  id: string;

  applied_amount: number;
  status: string;
}

export interface TreasuryCurrentPaymentReverseModalExpenseItem {
  id: number;

  internal_folio: string;
  concept: string;

  amount: number;
  paid_amount: number;
  pending_amount: number;
}

export interface TreasuryCurrentPaymentReverseModalData {
  payment:
  TreasuryCurrentPaymentReverseModalPayment;

  application:
  TreasuryCurrentPaymentReverseModalApplication;

  expense_item:
  TreasuryCurrentPaymentReverseModalExpenseItem;
}