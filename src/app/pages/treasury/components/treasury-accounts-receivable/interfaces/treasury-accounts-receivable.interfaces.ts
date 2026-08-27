// =========================================================
// TESORERÍA CxC:
// TIPOS BASE
// =========================================================

export type TreasuryAccountsReceivableFinancialStatus =
  | 'pending'
  | 'partial'
  | 'collected';


export type TreasuryAccountsReceivableFinancialSource =
  | 'legacy'
  | 'treasury';


export type TreasuryAccountsReceivableCollectionStatus =
  | 'active'
  | 'reversed';


export type TreasuryAccountsReceivableCollectionOrigin =
  | 'new'
  | 'historical_migration';


export type TreasuryAccountsReceivableBankMovementStatus =
  | 'unmatched'
  | 'partially_matched'
  | 'matched'
  | 'manually_closed'
  | 'cancelled';


export type TreasuryAccountsReceivableMovementActionType =
  | 'manual_close'
  | 'manual_reopen'
  | 'classification_change';


// =========================================================
// PAGINACIÓN
// =========================================================

export interface TreasuryAccountsReceivablePaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}


// =========================================================
// RELACIONES BASE
// =========================================================

export interface TreasuryAccountsReceivableCompany {
  id: number;
  code: string;
  name: string;
}


export interface TreasuryAccountsReceivableBank {
  id: number;
  code: string;
  name: string;
}


export interface TreasuryAccountsReceivableBankAccount {
  id: number;

  account_identifier: string;

  alias:
    string | null;

  currency: string;
}


export interface TreasuryAccountsReceivableProject {
  id: number;
  name: string;
}


// =========================================================
// ENTRADAS BANCARIAS DISPONIBLES:
// FILTROS
// =========================================================

export interface TreasuryAvailableInflowFilters {
  company_id?:
    number | null;

  bank_id?:
    number | null;

  bank_account_id?:
    number | null;

  date_from?:
    string | null;

  date_to?:
    string | null;

  search?:
    string | null;

  page:
    number;

  limit:
    number;
}


// =========================================================
// ENTRADAS BANCARIAS DISPONIBLES:
// FILA
// =========================================================

export interface TreasuryAvailableInflow {
  id: string;

  movement_date: string;

  movement_time:
    string | null;

  movement_type:
    'inflow';

  status:
    TreasuryAccountsReceivableBankMovementStatus;

  classification:
    string | null;

  classification_reviewed:
    boolean;

  is_collectable:
    boolean;

  requires_classification_review:
    boolean;

  description_original:
    string | null;

  bank_reference:
    string | null;

  receipt_number:
    string | null;

  tracking_key:
    string | null;

  counterparty_name:
    string | null;

  counterparty_account:
    string | null;

  amount:
    number;

  available_amount:
    number;

  manual_closed_amount:
    number;

  applied_amount:
    number;

  notes:
    string | null;

  company:
    TreasuryAccountsReceivableCompany | null;

  bank:
    TreasuryAccountsReceivableBank | null;

  bank_account:
    TreasuryAccountsReceivableBankAccount | null;
}


// =========================================================
// ENTRADAS BANCARIAS DISPONIBLES:
// RESUMEN
// =========================================================

export interface TreasuryAvailableInflowsSummary {
  movements_count:
    number;

  available_amount:
    number;
}


// =========================================================
// ENTRADAS BANCARIAS DISPONIBLES:
// RESPUESTA
// =========================================================

export interface TreasuryAvailableInflowsResponse {
  data:
    TreasuryAvailableInflow[];

  summary:
    TreasuryAvailableInflowsSummary;

  meta:
    TreasuryAccountsReceivablePaginationMeta;
}


// =========================================================
// CxC PENDIENTES:
// FILTROS
// =========================================================

export interface TreasuryPendingReceivableFilters {
  date_from?:
    string | null;

  date_to?:
    string | null;

  project_id?:
    number | null;

  company_code?:
    string | null;

  search?:
    string | null;

  page:
    number;

  limit:
    number;
}


// =========================================================
// CxC PENDIENTES:
// FILA
// =========================================================

export interface TreasuryPendingReceivable {
  id: number;

  cfdi_uuid:
    string;

  series:
    string | null;

  folio:
    string;

  company_code:
    string;

  emitter_rfc:
    string;

  emitter_name:
    string;

  receiver_rfc:
    string;

  receiver_name:
    string;

  issue_date:
    string;

  estimated_collection_date:
    string | null;

  subtotal:
    number;

  total:
    number;

  currency:
    string;

  collected_amount:
    number;

  pending_amount:
    number;

  status:
    TreasuryAccountsReceivableFinancialStatus;

  financial_source:
    TreasuryAccountsReceivableFinancialSource;

  has_treasury_history:
    boolean;

  requires_legacy_migration:
    boolean;

  last_collection_date:
    string | null;

  fully_collected_date:
    string | null;

  project:
    TreasuryAccountsReceivableProject | null;
}


// =========================================================
// CxC PENDIENTES:
// RESUMEN
// =========================================================

export interface TreasuryPendingReceivablesSummary {
  receivables_count:
    number;

  total_amount:
    number;

  collected_amount:
    number;

  pending_amount:
    number;
}


// =========================================================
// CxC PENDIENTES:
// RESPUESTA
// =========================================================

export interface TreasuryPendingReceivablesResponse {
  data:
    TreasuryPendingReceivable[];

  summary:
    TreasuryPendingReceivablesSummary;

  meta:
    TreasuryAccountsReceivablePaginationMeta;
}


// =========================================================
// APLICAR MOVIMIENTO:
// APPLICATION
// =========================================================

export interface TreasuryApplyBankMovementReceivableApplication {
  account_receivable_id:
    number;

  amount:
    number;
}


// =========================================================
// APLICAR MOVIMIENTO:
// PAYLOAD
// =========================================================

export interface TreasuryApplyBankMovementReceivablePayload {
  bank_movement_id:
    string;

  applications:
    TreasuryApplyBankMovementReceivableApplication[];

  notes?:
    string | null;
}


// =========================================================
// APLICAR MOVIMIENTO:
// RESPUESTA
// =========================================================

export interface TreasuryApplyBankMovementReceivableResponse {
  success:
    boolean;

  message:
    string;

  collection: {
    id:
      string;

    bank_movement_id:
      string;

    collection_date:
      string;

    amount:
      number;

    status:
      TreasuryAccountsReceivableCollectionStatus;

    applications:
      TreasuryApplyBankMovementReceivableApplication[];
  };

  bank_movement: {
    id:
      string;

    available_amount:
      number;

    status:
      TreasuryAccountsReceivableBankMovementStatus;
  };
}


// =========================================================
// REVERSA DE COLLECTION:
// PAYLOAD
// =========================================================

export interface TreasuryReverseCollectionPayload {
  reason:
    string;
}


// =========================================================
// REVERSA DE COLLECTION:
// RESPUESTA
// =========================================================

export interface TreasuryReverseCollectionResponse {
  success:
    boolean;

  message:
    string;

  collection: {
    id:
      string;

    status:
      TreasuryAccountsReceivableCollectionStatus;

    amount:
      number;

    applications_reversed:
      number;
  };

  bank_movement: {
    id:
      string;

    available_amount:
      number;

    manual_closed_amount:
      number;

    status:
      TreasuryAccountsReceivableBankMovementStatus;
  };
}


// =========================================================
// CIERRE MANUAL
// =========================================================

export interface TreasuryReceivableManualClosePayload {
  reason:
    string;
}


// =========================================================
// REAPERTURA MANUAL
// =========================================================

export interface TreasuryReceivableManualReopenPayload {
  reason:
    string;
}


/**
 * Para cierre/reapertura solo necesitamos por ahora
 * el contrato común garantizado de la mutación.
 *
 * Después de cualquiera de estas operaciones
 * refrescaremos la información desde backend.
 */
export interface TreasuryReceivableMovementMutationResponse {
  success:
    boolean;

  message:
    string;
}


// =========================================================
// HISTORIAL DE CxC:
// RECEIVABLE
// =========================================================

export interface TreasuryReceivableHistoryReceivable {
  id:
    number;

  cfdi_uuid:
    string;

  series:
    string | null;

  folio:
    string;

  company_code:
    string;

  receiver_rfc:
    string;

  receiver_name:
    string;

  issue_date:
    string;

  total:
    number;

  currency:
    string;

  project:
    TreasuryAccountsReceivableProject | null;
}


// =========================================================
// HISTORIAL DE CxC:
// SALDO
// =========================================================

export interface TreasuryReceivableHistoryBalance {
  collected_amount:
    number;

  pending_amount:
    number;

  status:
    TreasuryAccountsReceivableFinancialStatus;

  financial_source:
    TreasuryAccountsReceivableFinancialSource;

  has_treasury_history:
    boolean;

  requires_legacy_migration:
    boolean;

  last_collection_date:
    string | null;

  fully_collected_date:
    string | null;
}


// =========================================================
// HISTORIAL DE CxC:
// COLLECTION
// =========================================================

export interface TreasuryReceivableHistoryCollection {
  id:
    string;

  collection_date:
    string;

  amount:
    number;

  status:
    TreasuryAccountsReceivableCollectionStatus;

  origin:
    TreasuryAccountsReceivableCollectionOrigin;

  notes:
    string | null;

  created_at:
    string;

  reversed_at:
    string | null;

  reversal_reason:
    string | null;
}


// =========================================================
// HISTORIAL DE CxC:
// MOVIMIENTO
// =========================================================

export interface TreasuryReceivableHistoryBankMovement {
  id:
    string;

  movement_date:
    string;

  amount:
    number;

  status:
    TreasuryAccountsReceivableBankMovementStatus;

  classification:
    string | null;

  description_original:
    string | null;

  bank_reference:
    string | null;

  company:
    TreasuryAccountsReceivableCompany | null;

  bank:
    TreasuryAccountsReceivableBank | null;

  bank_account:
    TreasuryAccountsReceivableBankAccount | null;
}


// =========================================================
// HISTORIAL DE CxC:
// APPLICATION
// =========================================================

export interface TreasuryReceivableHistoryApplication {
  application_id:
    string;

  application_status:
    TreasuryAccountsReceivableCollectionStatus;

  applied_amount:
    number;

  legacy_advance_id:
    number | null;

  application_created_at:
    string;

  application_reversed_at:
    string | null;

  application_reversal_reason:
    string | null;

  collection:
    TreasuryReceivableHistoryCollection;

  bank_movement:
    TreasuryReceivableHistoryBankMovement;
}


// =========================================================
// HISTORIAL DE CxC:
// RESPUESTA
// =========================================================

export interface TreasuryReceivableCollectionHistoryResponse {
  receivable:
    TreasuryReceivableHistoryReceivable;

  balance:
    TreasuryReceivableHistoryBalance;

  history:
    TreasuryReceivableHistoryApplication[];
}


// =========================================================
// HISTORIAL DEL MOVIMIENTO:
// MOVIMIENTO
// =========================================================

export interface TreasuryReceivableBankMovementHistoryMovement {
  id:
    string;

  movement_date:
    string;

  movement_time:
    string | null;

  movement_type:
    'inflow';

  amount:
    number;

  available_amount:
    number;

  manual_closed_amount:
    number;

  applied_amount:
    number;

  status:
    TreasuryAccountsReceivableBankMovementStatus;

  classification:
    string | null;

  classification_reviewed:
    boolean;

  description_original:
    string | null;

  bank_reference:
    string | null;

  receipt_number:
    string | null;

  tracking_key:
    string | null;

  counterparty_name:
    string | null;

  counterparty_account:
    string | null;

  company:
    TreasuryAccountsReceivableCompany | null;

  bank:
    TreasuryAccountsReceivableBank | null;

  bank_account:
    TreasuryAccountsReceivableBankAccount | null;
}


// =========================================================
// HISTORIAL DEL MOVIMIENTO:
// APPLICATION
// =========================================================

export interface TreasuryReceivableBankMovementHistoryApplication {
  id:
    string;

  account_receivable_id:
    number;

  folio:
    string;

  receiver_name:
    string;

  applied_amount:
    number;

  status:
    TreasuryAccountsReceivableCollectionStatus;

  legacy_advance_id:
    number | null;

  created_by_user_id:
    number | null;

  created_at:
    string;

  reversed_by_user_id:
    number | null;

  reversed_at:
    string | null;

  reversal_reason:
    string | null;
}


// =========================================================
// HISTORIAL DEL MOVIMIENTO:
// COLLECTION
// =========================================================

export interface TreasuryReceivableBankMovementHistoryCollection {
  id:
    string;

  collection_date:
    string;

  amount:
    number;

  status:
    TreasuryAccountsReceivableCollectionStatus;

  origin:
    TreasuryAccountsReceivableCollectionOrigin;

  legacy_key:
    string | null;

  notes:
    string | null;

  created_by_user_id:
    number | null;

  created_at:
    string;

  reversed_by_user_id:
    number | null;

  reversed_at:
    string | null;

  reversal_reason:
    string | null;

  applications:
    TreasuryReceivableBankMovementHistoryApplication[];
}


// =========================================================
// HISTORIAL DEL MOVIMIENTO:
// ACCIONES
// =========================================================

export interface TreasuryReceivableBankMovementActionMetadata {
  source?:
    string;

  movement_type?:
    string;

  applied_amount?:
    string;

  classification?:
    string | null;

  [key: string]:
    unknown;
}


export interface TreasuryReceivableBankMovementHistoryAction {
  id:
    string;

  action_type:
    TreasuryAccountsReceivableMovementActionType;

  affected_amount:
    number;

  previous_status:
    TreasuryAccountsReceivableBankMovementStatus | null;

  new_status:
    TreasuryAccountsReceivableBankMovementStatus | null;

  previous_available_amount:
    number;

  new_available_amount:
    number;

  previous_manual_closed_amount:
    number;

  new_manual_closed_amount:
    number;

  reason:
    string | null;

  metadata:
    TreasuryReceivableBankMovementActionMetadata | null;

  created_by_user_id:
    number | null;

  created_at:
    string;
}


// =========================================================
// HISTORIAL DEL MOVIMIENTO:
// RESPUESTA
// =========================================================

export interface TreasuryReceivableBankMovementHistoryResponse {
  bank_movement:
    TreasuryReceivableBankMovementHistoryMovement;

  collections:
    TreasuryReceivableBankMovementHistoryCollection[];

  movement_actions:
    TreasuryReceivableBankMovementHistoryAction[];
}


// =========================================================
// DATOS PARA MODAL DE APLICACIÓN
// =========================================================

export interface TreasuryApplyReceivableModalData {
  movement:
    TreasuryAvailableInflow;

  receivables:
    TreasuryPendingReceivable[];
}


// =========================================================
// DATOS PARA MODAL DE HISTORIAL DE CxC
// =========================================================

export interface TreasuryReceivableHistoryModalData {
  receivable:
    TreasuryPendingReceivable;
}


// =========================================================
// DATOS PARA MODAL DE HISTORIAL DE MOVIMIENTO
// =========================================================

export interface TreasuryReceivableBankMovementHistoryModalData {
  movement:
    TreasuryAvailableInflow;
}


// =========================================================
// DATOS PARA MODAL DE REVERSA
// =========================================================

export interface TreasuryReverseCollectionModalData {
  collection:
    TreasuryReceivableBankMovementHistoryCollection;

  movement:
    TreasuryReceivableBankMovementHistoryMovement;
}


// =========================================================
// DATOS PARA MODAL DE CIERRE MANUAL
// =========================================================

export interface TreasuryReceivableManualCloseModalData {
  movement:
    TreasuryAvailableInflow;
}


// =========================================================
// DATOS PARA MODAL DE REAPERTURA
// =========================================================

export interface TreasuryReceivableManualReopenModalData {
  movement:
    TreasuryReceivableBankMovementHistoryMovement;
}


// =========================================================
// CLASIFICACIÓN DE ENTRADAS BANCARIAS
// =========================================================

export type TreasuryBankMovementInflowReviewClassification =
  | 'transferencia_entrada'
  | 'traspaso_interno_entrada'
  | 'pago_tercero'
  | 'prestamo';


export interface TreasuryUpdateBankMovementClassificationPayload {
  classification:
    TreasuryBankMovementInflowReviewClassification;

  reason: string;
}


export interface TreasuryUpdateBankMovementClassificationResponse {
  success: boolean;
  message: string;

  bank_movement: {
    id: string;

    movement_type:
      | 'inflow'
      | 'outflow';

    previous_classification:
      string | null;

    classification:
      TreasuryBankMovementInflowReviewClassification;

    classification_label:
      string;

    amount: number;
    available_amount: number;
    manual_closed_amount: number;

    previous_status:
      TreasuryAccountsReceivableBankMovementStatus;

    status:
      TreasuryAccountsReceivableBankMovementStatus;

    bank_reference:
      string | null;

    description_original:
      string;

    company:
      TreasuryAccountsReceivableCompany
      | null;

    bank:
      TreasuryAccountsReceivableBank
      | null;

    bank_account:
      TreasuryAccountsReceivableBankAccount
      | null;
  };

  audit: {
    action_id: string;
    action_type: string;
    reason: string;
    created_by_user_id: number;
    created_at: string;
  };
}


export interface TreasuryBankMovementClassificationModalData {
  movement:
    TreasuryAvailableInflow;
}