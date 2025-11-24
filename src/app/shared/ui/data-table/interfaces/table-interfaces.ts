
export type DataTableActionType = 'edit' | 'delete' | 'showItems';

export interface DataTableActionEvent<T> {
    type: DataTableActionType;
    row: T;
}

export type ColumnType =
    | 'text'
    | 'relation'
    | 'money'
    | 'date'
    | 'showItems'
    | 'chip'
    | 'phone'           
    | 'booleanConfirm'; 

export type ColumnVariant =
    | 'chip-success'
    | 'chip-warning'
    | 'chip-neutral';

export interface ColumnsConfig {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';

  type?: ColumnType;

  // Para 'relation'
  path?: string;
  typeVariant?: 'chip-success' | 'chip-warning' | 'chip-neutral';
  fallbackVariant?: 'chip-success' | 'chip-warning' | 'chip-neutral';
  fallback?: string;

  // Para booleanConfirm (opcional)
  trueLabel?: string;   // ej: 'Sí'
  falseLabel?: string;  // ej: 'No'
}