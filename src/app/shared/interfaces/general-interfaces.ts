export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ColumnsConfig {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'money' | 'relation';
  align?: 'left' | 'center' | 'right';
  path?: string;      
  fallback?: string; 
}

export interface Catalog {
  id: string;
  name: string;
}

export interface ApiSuccess {
  id: number;
  message: string
  success: true
}

export interface ConfirmModalAction {
  title?: string
  message: string
  confirmText: string
  cancelText: string
}
