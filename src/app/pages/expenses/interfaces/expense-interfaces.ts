import { Catalog } from "../../../shared/interfaces/general-interfaces";
import { DateRangeValue } from "../../../shared/ui/input-date/input-date";

/* =====================================================
 *  TIPOS BASE
 * ===================================================== */

export type ExpenseItemType = 'direct' | 'warehouse';

export type WarehouseLotStatus =
  | 'available'
  | 'partial'
  | 'depleted'
  | 'cancelled';

export type WarehouseMovementType =
  | 'in'
  | 'out'
  | 'return'
  | 'adjust';

/* =====================================================
 *  FILTROS (LISTADO DE GASTOS)
 * ===================================================== */

export interface FiltersExpenses {
  startDate?: string | null;
  endDate?: string | null;
  suppliersIds?: number[] | null;
  projectIds?: number[] | null;
  paymentStatus?: "paid" | "unpaid" | null;
  status_id?: number | string | null;
  limit: number;
  page: number;
}

/* =====================================================
 *  RESPUESTA LISTADO DE GASTOS (GET /expenses)
 * ===================================================== */

export interface Supplier {
  id: number;
  company_name: string;
}

export interface ExpenseStatus {
  id: number;
  name: string;
}

export interface Project {
  id: number;
  name: string;
}

export interface ProductMini {
  id: number;
  name: string;
}

export interface ExpenseItem {
  id: number;

  item_type: ExpenseItemType;
  quantity?: number | null;
  unit?: string | null;
  unit_price?: number | null;

  amount: number;

  // Desglose CFDI
  base_amount: number;
  discount_amount: number;
  tax_amount: number;
  withheld_amount: number;

  payment_amount: number | null;
  payment_date: string | null;
  remaining_amount: number;

  project: Project | null;
  product: ProductMini | null;

  concept?: string | null;

  // Display para Mano de Obra
  product_display_name?: string | null;
}

export interface ExpenseResponseDto {
  id: number;
  date: string;
  internal_folio: string;
  remaining_amount: number;
  total_amount: number;

  receipt_block_reasons: string[];
  can_generate_receipt: boolean;
  is_archived: boolean;

  origin_type?: string | null;
  provider_display_name?: string | null;

  supplier: Supplier | null;
  status: ExpenseStatus;
  cfdi_uuid?: string | null;
  items: ExpenseItem[];
}

/**
 * Mapper opcional para vistas que necesiten aplanar datos.
 */
export interface ExpenseResponseDtoMapper {
  id: number;
  date: string;
  amount: number;
  supplier: string;
  project: string;
  originData: ExpenseResponseDto;
}

/* =====================================================
 *  CREATE / UPDATE GASTO
 * ===================================================== */

export interface CreateExpenseItem {
  product_id?: number | null;

  item_type?: ExpenseItemType;

  // Almacén
  quantity?: number | null;
  unit?: string | null;
  unit_price?: number | null;

  amount: number;

  // Desglose CFDI
  base_amount?: number | null;
  discount_amount?: number | null;
  tax_amount?: number | null;
  withheld_amount?: number | null;

  project_id?: number | null;
  payment_amount?: number | null;
  payment_date?: string | null;
}

export interface CreateExpense {
  date: string;
  supplier_id: number | null;
  cfdi_uuid?: string | null;
  items: CreateExpenseItem[];
}

export type UpdateExpense = CreateExpense;

/* =====================================================
 *  UPDATE CONTROLADO PARA GASTOS CON ALMACÉN
 * ===================================================== */

export interface UpdateWarehouseExpenseSafeItem {
  id: number;
  payment_amount?: number | null;
  payment_date?: string | null;
}

export interface UpdateWarehouseExpenseSafe {
  date?: string;
  supplier_id?: number | null;
  items?: UpdateWarehouseExpenseSafeItem[];
}

/* =====================================================
 *  DETALLE DE GASTO (GET /expenses/:id)
 * ===================================================== */

export interface ExpenseItemDetail {
  id: number;

  item_type: ExpenseItemType;
  quantity?: number | null;
  unit?: string | null;
  unit_price?: number | null;

  amount: number;

  // Desglose CFDI
  base_amount: number;
  discount_amount: number;
  tax_amount: number;
  withheld_amount: number;

  payment_amount: number | null;
  payment_date: string | null;
  remaining_amount: number;

  project: {
    id: number;
    name: string;
  } | null;

  product: {
    id: number;
    name: string;
  } | null;

  concept?: string | null;

  // Display para Mano de Obra
  product_display_name?: string | null;
}

export interface ExpenseDetail {
  id: number;
  date: string;
  internal_folio: string;
  total_amount: number;
  remaining_amount: number;
  cfdi_uuid?: string | null;

  origin_type?: string | null;
  provider_display_name?: string | null;

  supplier: {
    id: number;
    company_name: string;
  } | null;

  status: {
    id: number;
    name: string;
  };

  items: ExpenseItemDetail[];
}

/* =====================================================
 *  ITEM PARA EL FORMULARIO (FormArray en ExpenseForm)
 * ===================================================== */

export interface ExpenseItemForm {
  amount: number | null;

  item_type: ExpenseItemType;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;

  // Desglose CFDI
  base_amount: number | null;
  discount_amount: number | null;
  tax_amount: number | null;
  withheld_amount: number | null;

  payment_amount: number | null;
  payment_date: string | null;
  project_id: Catalog | null;
  product_id: Catalog | null;
}

/* =====================================================
 *  FILTROS DE UI (estado del formulario de filtros)
 * ===================================================== */

export interface ExpensesUiFilters {
  dateRange: DateRangeValue | null;
  suppliersIds: any[];
  projectIds: any[];
  status_id: string | number | null;
  paymentStatus: "paid" | "unpaid" | null;
  page: number;
  limit: number;
}

/* =====================================================
 *  XML PREVIEW
 * ===================================================== */

export interface XmlExpenseItemDraftDto {
  concept: string;

  item_type: ExpenseItemType;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;

  amount: number;

  // Desglose CFDI
  base_amount: number;
  discount_amount: number;
  tax_amount: number;
  withheld_amount: number;

  payment_amount: number | null;
  payment_date: string | null;
  project_id: number | null;

  product: {
    id: number;
    name: string;
  } | null;
}

export interface XmlExpenseDraftDto {
  uuid: string;
  sourceFileName: string;
  date: string;
  subtotal: number;
  total: number;
  supplier: {
    id: number;
    name: string;
  };
  emitterRfc: string;
  emitterName: string;
  items: XmlExpenseItemDraftDto[];
}

export interface XmlDuplicateDto {
  uuid: string;
  sourceFileName: string;
  existingExpenseId: number;
}

export interface XmlErrorDto {
  sourceFileName: string;
  reason: string;
}

export interface XmlPreviewResponseDto {
  drafts: XmlExpenseDraftDto[];
  duplicates: XmlDuplicateDto[];
  errors: XmlErrorDto[];
}

export interface XmlQueueState {
  total: number;
  currentIndex: number;
}

/* =====================================================
 *  ALMACÉN - EXISTENCIAS
 * ===================================================== */

export interface WarehouseLotFilters {
  productId?: number | null;
  status?: WarehouseLotStatus | null;
  search?: string | null;
  page?: number;
  limit?: number;
}

export interface WarehouseLotResponseDto {
  id: number | string;

  expense_id: number;
  expense_item_id: number;
  product_id: number | null;

  expense_folio_snapshot: string;
  product_name_snapshot: string | null;
  supplier_name_snapshot: string | null;
  purchase_date: string;

  original_quantity: number;
  available_quantity: number;
  used_quantity: number;

  unit: string;
  unit_cost: number;
  total_cost: number;
  available_cost: number;

  status: WarehouseLotStatus;
}

/* =====================================================
 *  ALMACÉN - ASIGNACIÓN
 * ===================================================== */

export interface AssignWarehouseLotDto {
  project_id: number;
  quantity: number;
  notes?: string | null;
}

/* =====================================================
 *  ALMACÉN - MOVIMIENTOS
 * ===================================================== */

export interface WarehouseMovementResponseDto {
  id: number;
  warehouse_lot_id: number;

  movement_type: WarehouseMovementType;

  project_id: number | null;
  project_name: string | null;

  quantity: number;
  unit: string;
  unit_cost: number;
  amount: number;

  previous_available_quantity: number;
  new_available_quantity: number;

  related_movement_id: number | null;

  notes: string | null;
  is_cancelled: boolean;
  created_at: string;
}

export interface ReturnWarehouseMovementDto {
  notes?: string | null;
}