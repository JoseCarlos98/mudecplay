import { DateRangeValue } from "../../../shared/ui/input-date/input-date";


/* =====================================================
 *  FILTROS (LISTADO DE GASTOS)
 * ===================================================== */

export interface FiltersAccountsReceivable {
  startDate?: string | null;
  endDate?: string | null;
  clientsIds?: number[] | null;
  status?: string | null;
  limit: number;
  page: number;
}



export interface AccountsReceivableUiFilters {
  dateRange: DateRangeValue | null;
  folio: string;
  clientsIds: number[];
  status: 'pending' | 'collected' | null;
  page: number;
  limit: number;
}