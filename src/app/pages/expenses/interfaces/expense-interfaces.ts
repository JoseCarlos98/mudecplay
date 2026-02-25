import { Catalog } from "../../../shared/interfaces/general-interfaces";
import { DateRangeValue } from "../../../shared/ui/input-date/input-date";

/* =====================================================
 *  FILTROS (LISTADO DE GASTOS)
 * ===================================================== */

export interface FiltersExpenses {
  startDate?: string | null;
  endDate?: string | null;
  suppliersIds?: number[] | null;
  projectIds?: number[] | null;
  paymentStatus?: "paid" | "unpaid" | null;
  status_id?: number | string | null; // se sigue llamando status_id para el backend
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
  amount: number;

  // Desglose CFDI
  base_amount: number;
  discount_amount: number;
  tax_amount: number;
  withheld_amount: number; // NUEVO

  payment_amount: number | null;
  payment_date: string | null;
  remaining_amount: number;
  project: Project | null;
  product: ProductMini | null;
}

export interface ExpenseResponseDto {
  id: number;
  date: string;
  internal_folio: string; // ← ahora coincide con el backend
  remaining_amount: number;
  total_amount: number;
  supplier: Supplier | null;
  status: ExpenseStatus;
  cfdi_uuid?: string | null;
  items: ExpenseItem[];
}

/**
 * Mapper opcional para vistas que necesiten aplanar datos.
 * (Si no lo usas, puedes borrarlo).
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
 *  (coincide con CreateExpenseDto / UpdateExpenseDto)
 * ===================================================== */

export interface CreateExpenseItem {
  amount: number;

  // Desglose CFDI (para mandar al guardar cuando viene de XML)
  base_amount?: number | null;
  discount_amount?: number | null;
  tax_amount?: number | null;
  withheld_amount?: number | null; // NUEVO

  project_id?: number | null;
  product_id?: number | null;
  payment_amount?: number | null;
  payment_date?: string | null;
}

export interface CreateExpense {
  date: string;
  supplier_id: number | null;
  cfdi_uuid?: string | null; // se usa cuando viene de XML
  items: CreateExpenseItem[];
}

// Update en backend es PartialType(CreateExpenseDto)
// pero en tu frontend estás mandando el objeto completo, así que:
export type UpdateExpense = CreateExpense;

/* =====================================================
 *  DETALLE DE GASTO (GET /expenses/:id)
 * ===================================================== */

export interface ExpenseItemDetail {
  id: number;
  amount: number;

  // Desglose CFDI
  base_amount: number;
  discount_amount: number;
  tax_amount: number;
  withheld_amount: number; // NUEVO

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
}

export interface ExpenseDetail {
  id: number;
  date: string;
  internal_folio: string;
  total_amount: number;
  remaining_amount: number;
  cfdi_uuid?: string | null;
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

  // Desglose CFDI (para conservar y mandar al guardar desde XML)
  base_amount: number | null;
  discount_amount: number | null;
  tax_amount: number | null;
  withheld_amount: number | null; // NUEVO

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
  suppliersIds: number[];
  projectIds: number[];
  status_id: string | number | null;
  paymentStatus: "paid" | "unpaid" | null;
  page: number;
  limit: number;
}

/* =====================================================
 *  XML PREVIEW (nuevo diseño: drafts / duplicates / errors)
 * ===================================================== */

export interface XmlExpenseItemDraftDto {
  concept: string; // descripción original del CFDI (para mostrar al usuario)
  amount: number;

  // Desglose CFDI
  base_amount: number;
  discount_amount: number;
  tax_amount: number;
  withheld_amount: number; // NUEVO

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
  date: string; // 'YYYY-MM-DD'
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

/**
 * Respuesta de POST /expenses/xml/preview
 */
export interface XmlPreviewResponseDto {
  drafts: XmlExpenseDraftDto[];
  duplicates: XmlDuplicateDto[];
  errors: XmlErrorDto[];
}

export interface XmlQueueState {
  total: number;
  currentIndex: number;
}