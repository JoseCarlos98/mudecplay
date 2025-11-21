
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
    | 'chip';

export type ColumnVariant =
    | 'chip-success'
    | 'chip-warning'
    | 'chip-neutral';

export interface ColumnsConfig {
    key: string;
    label: string;
    type?: ColumnType;
    typeVariant?: ColumnVariant;
    path?: string;
    fallback?: string;
    fallbackVariant?: ColumnVariant;
    align?: 'left' | 'center' | 'right';
}
