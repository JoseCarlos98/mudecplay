import { RoleCode } from "../../../../auth/interfaces/auth.interface";

export type DataTableActionType = 'edit' | 'delete' | 'showItems' | string;

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
}


export interface DataTableActionEvent<T> {
  type: DataTableActionType;
  row: T;
}

export interface TableActionPermissions {
  /** Roles requeridos para mostrar el botón de editar */
  editRoles?: RoleCode[];

  /** Roles requeridos para mostrar el botón de eliminar */
  deleteRoles?: RoleCode[];
}
