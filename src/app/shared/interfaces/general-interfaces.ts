export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
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
