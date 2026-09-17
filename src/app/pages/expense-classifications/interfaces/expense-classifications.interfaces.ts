// =========================================================
// TIPOS BASE
// =========================================================

export type ExpenseClassificationSourceType =
  | 'concept'
  | 'product';

export type ExpenseClassificationStatusFilter =
  | 'active'
  | 'inactive'
  | 'all';

export type ExpenseClassificationsTab =
  | 'pending'
  | 'homologated';


// =========================================================
// REFERENCIA SIMPLE DE CLASIFICACIÓN
// =========================================================

export interface ExpenseClassificationReference {
  id: number;
  name: string;
}


// =========================================================
// CATÁLOGO DE CLASIFICACIONES
// =========================================================

export interface ExpenseReportClassification {
  id: number;

  name: string;

  normalizedName?: string;

  isActive: boolean;

  createdAt?: string;

  updatedAt?: string;
}


export interface ExpenseReportClassificationFilters {
  search?: string;

  status?:
    ExpenseClassificationStatusFilter;
}


export interface CreateExpenseReportClassificationPayload {
  name: string;
}


export interface UpdateExpenseReportClassificationPayload {
  name: string;
}


// =========================================================
// PENDIENTES
// =========================================================

export interface ExpenseClassificationPendingFilters {
  search?: string;

  sourceType?:
    ExpenseClassificationSourceType;

  page?: number;

  limit?: number;
}


interface ExpenseClassificationPendingBase {
  sourceType:
    ExpenseClassificationSourceType;

  displayName: string;

  itemCount: number;

  purchaseCount: number;
}


export interface ExpenseClassificationPendingConcept
  extends ExpenseClassificationPendingBase {

  sourceType: 'concept';

  normalizedConcept: string;

  productId: null;
}


export interface ExpenseClassificationPendingProduct
  extends ExpenseClassificationPendingBase {

  sourceType: 'product';

  normalizedConcept: null;

  productId: number;
}


export type ExpenseClassificationPendingItem =
  | ExpenseClassificationPendingConcept
  | ExpenseClassificationPendingProduct;

export interface ExpenseClassificationPendingResponse {
  data:
    ExpenseClassificationPendingItem[];

  meta:
    ExpenseClassificationPaginationMeta;
}
// =========================================================
// FILA UI: PENDIENTES
// =========================================================

export type ExpenseClassificationPendingTableRow =
  ExpenseClassificationPendingItem & {

    /*
     * Identificador únicamente para frontend.
     *
     * Ejemplos:
     * concept:gasolina magna
     * product:153
     */
    id: string;

    sourceTypeLabel: string;

    selected?: boolean;
  };


// =========================================================
// HOMOLOGAR PENDIENTES
// =========================================================

export interface ExpenseClassificationConceptSelection {
  sourceType: 'concept';

  conceptName: string;
}


export interface ExpenseClassificationProductSelection {
  sourceType: 'product';

  productId: number;
}


export type ExpenseClassificationSelection =
  | ExpenseClassificationConceptSelection
  | ExpenseClassificationProductSelection;


export interface BulkClassifyExpensePendingPayload {
  classificationId: number;

  items:
    ExpenseClassificationSelection[];
}


export interface BulkClassifyExpensePendingResponse {
  success: boolean;

  classification:
    ExpenseClassificationReference;

  total: number;

  created: number;

  reactivated: number;
}


// =========================================================
// HOMOLOGACIONES EXISTENTES
// =========================================================

export interface ExpenseClassificationMapping {
  sourceType:
    ExpenseClassificationSourceType;

  mappingId: number;

  /*
   * Identificador estable para frontend:
   *
   * concept:gasolina
   * product:120
   */
  key: string;

  displayName: string;

  normalizedConcept:
    string | null;

  productId:
    number | null;

  isActive: boolean;

  classification:
    ExpenseClassificationReference;

  createdAt: string;

  updatedAt: string;
}


// =========================================================
// FILA UI: HOMOLOGADOS
// =========================================================

export interface ExpenseClassificationMappingTableRow
  extends ExpenseClassificationMapping {

  /*
   * DataTable trabaja mejor teniendo
   * un identificador único por fila.
   *
   * mappingId solo NO alcanza porque
   * concept y product tienen tablas distintas
   * y pueden repetir el mismo mappingId.
   */
  id: string;

  sourceTypeLabel: string;

  classificationName: string;

  statusLabel: string;
}


// =========================================================
// FILTROS HOMOLOGADOS
// =========================================================

export interface ExpenseClassificationMappingFilters {
  search?: string;

  sourceType?:
    ExpenseClassificationSourceType;

  status?:
    ExpenseClassificationStatusFilter;

  classificationId?:
    number | null;

  page: number;

  limit: number;
}


// =========================================================
// PAGINACIÓN
// =========================================================

export interface ExpenseClassificationPaginationMeta {
  total: number;

  page: number;

  limit: number;

  totalPages: number;
}


export interface ExpenseClassificationMappingsResponse {
  data:
    ExpenseClassificationMapping[];

  meta:
    ExpenseClassificationPaginationMeta;
}


// =========================================================
// REASIGNAR HOMOLOGACIÓN
// =========================================================

export interface ReassignExpenseClassificationPayload {
  sourceType:
    ExpenseClassificationSourceType;

  mappingId: number;

  classificationId: number;
}


// =========================================================
// ACTIVAR / DESACTIVAR HOMOLOGACIÓN
// =========================================================

export interface ChangeExpenseClassificationMappingStatusPayload {
  sourceType:
    ExpenseClassificationSourceType;

  mappingId: number;
}


// =========================================================
// MODAL: CREAR / EDITAR CLASIFICACIÓN
// =========================================================

export type ExpenseReportClassificationModalMode =
  | 'create'
  | 'edit';


export type ExpenseReportClassificationModalData =
  | {
      mode: 'create';

      classification?: never;
    }
  | {
      mode: 'edit';

      classification:
        ExpenseReportClassification;
    };


// =========================================================
// MODAL: REASIGNAR HOMOLOGACIÓN
// =========================================================

export interface ReassignExpenseClassificationModalData {
  mapping:
    ExpenseClassificationMapping;

  /*
   * Solo pasaremos clasificaciones activas,
   * ya que backend no permite reasignar
   * hacia una clasificación inactiva.
   */
  classifications:
    ExpenseReportClassification[];
}