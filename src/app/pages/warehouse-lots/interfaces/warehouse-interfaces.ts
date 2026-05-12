import { Catalog } from '../../../shared/interfaces/general-interfaces';

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

export interface WarehouseLotFilters {
  productId?: number | null;
  status?: WarehouseLotStatus | string | null;
  search?: string;
  page: number;
  limit: number;
}

export interface WarehouseLotUiFilters {
  product: Catalog | null;
  status: WarehouseLotStatus | string | null;
  search: string;
  page: number;
  limit: number;
}

export interface WarehouseLotResponseDto {
  id: number | string;

  expense_id: number | null;
  expense_item_id: number | null;
  product_id: number | null;

  expense_folio_snapshot: string;
  product_name_snapshot: string | null;
  supplier_name_snapshot: string | null;
  purchase_date: string;

  original_quantity: number;
  available_quantity: number;
  used_quantity: number;

  unit_id: number | null;
  unit: string;

  unit_cost: number;
  total_cost: number;
  available_cost: number;

  status: WarehouseLotStatus;

  // Campos UI
  status_name?: string;
  original_quantity_text?: string;
  available_quantity_text?: string;
  used_quantity_text?: string;
}

export interface AssignWarehouseLotDto {
  project_id: number;
  quantity: number;
  notes?: string | null;
}

export interface WarehouseMovementResponseDto {
  id: number;
  warehouse_lot_id: number;

  movement_type: WarehouseMovementType;

  project_id: number | null;
  project_name: string | null;

  quantity: number;

  unit_id: number | null;
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

export interface WarehouseCancelExpenseInfoDto {
  id: number;
  internal_folio: string;
  date: string;
  supplier_name: string;
  total_amount: number;
}

export interface WarehouseCancelSummaryDto {
  lots_count: number;
  active_outputs_count: number;
  total_amount_to_remove_from_projects: number;
  has_project_impact: boolean;
}

export interface WarehouseCancelLotDto {
  lot_id: number | string;
  product_name: string;
  original_quantity: number;
  available_quantity: number;
  used_quantity: number;
  unit: string | null;
  unit_cost: number;
  total_cost: number;
  status: 'available' | 'partial' | 'depleted' | 'cancelled' | string;
}

export interface WarehouseCancelActiveOutputDto {
  movement_id: number;
  lot_id: number;
  product_name: string;
  project_id: number | null;
  project_name: string;
  quantity: number;
  unit: string | null;
  unit_cost: number;
  amount: number;
}

export interface WarehouseCancelPreviewDto {
  expense: WarehouseCancelExpenseInfoDto;
  summary: WarehouseCancelSummaryDto;
  lots: WarehouseCancelLotDto[];
  active_outputs: WarehouseCancelActiveOutputDto[];
  message: string;
}

export interface CancelWarehouseExpenseDto {
  reason: string;
}