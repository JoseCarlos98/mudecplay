
export interface ColumnsConfig {
    key: string;
    label: string;
    type?: 'text' | 'number' | 'date' | 'money' | 'relation' | 'showItems';
    align?: 'left' | 'center' | 'right';
    path?: string;
    fallback?: string;
}

export type DataTableActionType = 'edit' | 'delete' | 'showItems';

export interface DataTableActionEvent<T> {
    type: DataTableActionType;
    row: T;
}