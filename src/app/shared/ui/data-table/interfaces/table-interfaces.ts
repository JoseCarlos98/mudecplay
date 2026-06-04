import { RoleCode } from '../../../../auth/interfaces/auth.interface';

export type DataTableActionType = 'edit' | 'delete' | 'showItems' | string;
export type ActionPopoverKind = 'warning' | 'info' | 'success' | 'error';

export interface DataTableActionEvent<T> {
  type: DataTableActionType;
  row: T;
}

export interface DataTableActionPopover {
  title: string;
  message?: string | null;
  items?: string[];
  kind?: ActionPopoverKind;
}
export type ColumnType =
  | 'text'
  | 'relation'
  | 'money'
  | 'date'
  | 'showItems'
  | 'chip'
  | 'phone'
  | 'booleanConfirm'
  | 'select';

export type ColumnVariant =
  | 'chip-success'
  | 'chip-warning'
  | 'chip-neutral'
  | 'chip-danger';

export interface ColumnsConfig {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';

  type?: ColumnType;

  path?: string;
  typeVariant?: ColumnVariant;
  fallbackVariant?: ColumnVariant;
  fallback?: string;

  variantResolver?: (row: any) => ColumnVariant | null;
  popoverContent?: (row: any) => DataTableActionPopover | null;

  // Para type: 'select'
  selectActionType?: string;
  selectedResolver?: (row: any) => boolean;
  selectDisabledResolver?: (row: any) => boolean;
  selectTooltip?: string | ((row: any) => string | null);
}

export interface TableActionPermissions {
  /** Mostrar u ocultar botón editar */
  showEdit?: boolean;

  /** Mostrar u ocultar botón eliminar */
  showDelete?: boolean;

  /** Roles requeridos para mostrar el botón de editar */
  editRoles?: RoleCode[];

  /** Roles requeridos para mostrar el botón de eliminar */
  deleteRoles?: RoleCode[];
}

export interface DataTableExtraAction<T> {
  /** Nombre interno del evento que emitirá la tabla */
  type: string;

  /** Icono de Angular Material */
  icon: string;

  /** Tooltip fijo o dinámico por fila */
  tooltip?: string | ((row: T) => string | null);

  /** Popover enriquecido para acciones bloqueadas o informativas */
  popoverContent?: (row: T) => DataTableActionPopover | null;

  /** Define si el botón se muestra o no para esa fila */
  visible?: (row: T) => boolean;

  /** Define si el botón se muestra deshabilitado */
  disabled?: (row: T) => boolean;

  /** Roles requeridos para ver este botón */
  roles?: RoleCode[];

  /** Clase opcional para el botón */
  buttonClass?: string;

  /** Clase opcional para el ícono */
  iconClass?: string;
}