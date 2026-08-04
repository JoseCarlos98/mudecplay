import { Catalog } from '../../../shared/interfaces/general-interfaces';

export type PurchaseOrderStatus =
  | 'in_review'
  | 'authorized'
  | 'not_authorized'
  | 'cancelled';

export type PurchaseOrderDestinationType = 'direct' | 'warehouse';

export type PurchaseOrderTrackingStatus =
  | 'created'
  | 'authorized'
  | 'ticket_uploaded'
  | 'ticket_reconciled'
  | 'expense_registered'
  | 'payment_completed'
  | 'not_authorized'
  | 'cancelled';

export type PurchaseOrderTrackingVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'primary';

export type PurchaseOrderHistoryEventType =
  | 'created'
  | 'updated'
  | 'authorized'
  | 'not_authorized'
  | 'cancelled'
  | 'ticket_uploaded'
  | 'ticket_reconciled'
  | 'expense_linked';

export type PurchaseOrderHistoryTagVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'primary';

export interface PurchaseOrderUserDto {
  id: number;
  name: string;
}

export interface PurchaseOrderProjectDto {
  id: number;
  name: string;
}

export interface PurchaseOrderEmployeeDto {
  id: number;
  name: string;
}

export interface PurchaseOrderHistoryEventDto {
  id: number;
  event_type: PurchaseOrderHistoryEventType | string;
  title: string;
  description: string | null;

  performed_by_user: PurchaseOrderUserDto | null;
  performed_by_name: string | null;

  tag: string;
  tag_variant: PurchaseOrderHistoryTagVariant;
  icon: string;

  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface PurchaseOrderTicketPhotoDto {
  id: number;
  file_name?: string | null;
  fileName?: string | null;
  filename?: string | null;

  status?: string | null;

  purchase_order?: TicketPhotoPurchaseOrderMiniDto | null;
  purchaseOrder?: TicketPhotoPurchaseOrderMiniDto | null;

  public_url?: string | null;
  publicUrl?: string | null;
  preview_url?: string | null;
  previewUrl?: string | null;
  url?: string | null;

  uploaded_by_user?: PurchaseOrderUserDto | null;
  uploadedByUser?: PurchaseOrderUserDto | null;
  user?: PurchaseOrderUserDto | null;

  uploaded_at?: string | null;
  created_at?: string | null;
  createdAt?: string | null;

  reconciled_by_user?: PurchaseOrderUserDto | null;
  reconciled_at?: string | null;

  project?: PurchaseOrderProjectDto | null;
  notes?: string | null;
}

export interface PurchaseOrderExpenseLinkDto {
  id: number;
  expense_id?: number | null;
  purchase_order_id?: number | null;
  ticket_photo_id?: number | null;

  registration_type?: 'manual' | 'xml' | string | null;
  registration_type_label?: string | null;

  amount_snapshot?: number | string | null;
  notes?: string | null;
  created_at?: string | null;

  expense?: {
    id: number;

    folio?: string | null;
    internal_folio?: string | null;

    date?: string | null;

    total?: number | string | null;
    amount?: number | string | null;
    total_amount?: number | string | null;

    paid_amount?: number | string | null;
    total_paid?: number | string | null;
    payment_amount?: number | string | null;

    cfdi_uuid?: string | null;

    origin_type?: string | null;
    source_module?: string | null;
    source_record_id?: number | string | null;

    supplier?: {
      id: number;
      company_name?: string | null;
      name?: string | null;
    } | null;

    status?: {
      id: number;
      name: string;
    } | null;

    items?: PurchaseOrderExpenseItemDetailDto[];
  } | null;

  linked_items?: PurchaseOrderExpenseLinkedItemDto[];
  linked_item_ids?: number[];

  ticketPhoto?: PurchaseOrderTicketPhotoDto | null;
  ticket_photo?: PurchaseOrderTicketPhotoDto | null;

  linkedByUser?: PurchaseOrderUserDto | null;
  linked_by_user?: PurchaseOrderUserDto | null;
}

export interface PurchaseOrderResponseDto {
  id: number;

  folio: string;

  project: PurchaseOrderProjectDto | null;

  tracking_status?: PurchaseOrderTrackingStatus | string | null;
  tracking_status_label?: string | null;
  tracking_status_detail?: string | null;
  tracking_status_icon?: string | null;
  tracking_status_variant?: PurchaseOrderTrackingVariant | string | null;
  tracking_step?: number | null;

  requested_by_employee?: PurchaseOrderEmployeeDto | null;

  destination_type: PurchaseOrderDestinationType;
  destination_type_label: string;

  will_have_invoice: boolean;
  will_have_invoice_label: string;

  concept: string;
  requested_amount: number;
  is_zero_amount_invoice: boolean;
  zero_amount_reason: string | null;

  status: PurchaseOrderStatus;
  status_label: string;

  requested_by_user?: PurchaseOrderUserDto | null;
  requested_by_name: string | null;

  created_by_user: PurchaseOrderUserDto | null;

  authorized_by_employee?: PurchaseOrderEmployeeDto | null;
  authorized_by_name: string | null;
  authorization_registered_by_user: PurchaseOrderUserDto | null;
  authorized_at: string | null;

  notes: string | null;

  created_at: string;
  updated_at: string;

  // Campos solo cuando venga detalle / flow-detail
  ticket_photos_count?: number;
  expense_links_count?: number;
  ticket_photos?: PurchaseOrderTicketPhotoDto[];
  expense_links?: PurchaseOrderExpenseLinkDto[];
  history?: PurchaseOrderHistoryEventDto[];

  // Campos UI
  project_name?: string;
  requested_by_display?: string;
  destination_name?: string;
  invoice_name?: string;
  status_name?: string;
  created_at_date?: string;
  authorized_at_date?: string | null;
}

export interface PurchaseOrderFlowDetailResponse extends PurchaseOrderResponseDto {
  ticket_photos_count: number;
  expense_links_count: number;
  ticket_photos: PurchaseOrderTicketPhotoDto[];
  expense_links: PurchaseOrderExpenseLinkDto[];
  history: PurchaseOrderHistoryEventDto[];
}

export interface PurchaseOrdersPaginationResponse {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

export interface PurchaseOrdersPaginatedResponse {
  data: PurchaseOrderResponseDto[];
  pagination: PurchaseOrdersPaginationResponse;
}

export interface AvailableForReconciliationResponse {
  data: PurchaseOrderResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PurchaseOrderFilters {
  page: number;
  limit: number;

  search?: string | null;
  requested_amount?: number | null;
  related_expense_amount?: number | null;
  status?: PurchaseOrderStatus | null;
  destination_type?: PurchaseOrderDestinationType | null;
  will_have_invoice?: boolean | null;
  project_id?: number | null;
  ticket_filter?: 'all' | 'with_photo' | 'without_photo';
  tracking_status?:
    | PurchaseOrderTrackingStatus
    | string
    | null;
}

export interface PurchaseOrderUiFilters {
  page: number;
  limit: number;

  search?: string | null;
  requested_amount: number | null;
  related_expense_amount: number | null;
  tracking_status:
    | PurchaseOrderTrackingStatus
    | string
    | '';
  destination_type?:
    | PurchaseOrderDestinationType
    | ''
    | null;
  will_have_invoice?: 'true' | 'false' | '' | null;
  projects?: Catalog[];
}

export interface CreatePurchaseOrderDto {
  project_id?: number | null;
  destination_type: PurchaseOrderDestinationType;
  will_have_invoice: boolean;
  concept: string;
  requested_amount: number;
  is_zero_amount_invoice?: boolean;
  zero_amount_reason?: string | null;
  requested_by_employee_id: number;
  notes?: string | null;
}

export interface UpdatePurchaseOrderDto {
  project_id?: number | null;
  destination_type?: PurchaseOrderDestinationType;
  will_have_invoice?: boolean;
  concept?: string;
  requested_amount?: number;
  is_zero_amount_invoice?: boolean;
  zero_amount_reason?: string | null;
  requested_by_employee_id?: number | null;
  notes?: string | null;
}

export interface AuthorizePurchaseOrderDto {
  authorized_by_employee_id: number;
  notes?: string | null;
}

export interface RejectPurchaseOrderDto {
  reason: string;
}

export interface CancelPurchaseOrderDto {
  reason: string;
}

export interface UnreconcileTicketPhotoDto {
  reason?: string | null;
}

export interface UnreconcileTicketPhotoResponse {
  success: boolean;
  message: string;
  data: PurchaseOrderTicketPhotoDto;
}

export interface UnlinkPurchaseOrderExpenseDto {
  reason?: string | null;
}

export type PurchaseOrderExpenseRelationAction =
  | 'expense_deleted'
  | 'link_removed';

export interface UnlinkPurchaseOrderExpenseResponseData {
  purchase_order_id: number;
  purchase_order_folio: string;

  expense_link_id: number;

  expense_id: number | null;
  expense_folio: string | null;

  ticket_photo_id: number | null;

  unlinked: boolean;

  /**
   * true:
   * - El gasto fue creado desde O.C. sin XML.
   * - Se eliminó/soft-deleteó del módulo Gastos.
   *
   * false:
   * - Era XML existente o gasto externo.
   * - Solo se quitó la relación con la O.C.
   */
  expense_deleted: boolean;

  action: PurchaseOrderExpenseRelationAction;
}

export interface UnlinkPurchaseOrderExpenseResponse {
  success: boolean;
  message: string;
  data: UnlinkPurchaseOrderExpenseResponseData;
}

export interface PurchaseOrderRequesterEmployeeDto {
  id: number;
  name: string;
  full_name?: string;
  position?: string | null;
  employee_area?: {
    id: number;
    name: string;
  } | null;
}

export interface PurchaseOrderRequesterDto {
  id: number;
  employee: PurchaseOrderRequesterEmployeeDto | null;
  employee_id: number | null;
  employee_name: string | null;
  is_active: boolean;
  created_by_user: PurchaseOrderUserDto | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseOrderRequesterDto {
  employee_id: number;
}

export interface PurchaseOrderRequesterSaveResponse {
  success: boolean;
  message: string;
  data: PurchaseOrderRequesterDto;
}

export interface PurchaseOrderAuthorizerEmployeeDto {
  id: number;
  name: string;
  full_name?: string;
  position?: string | null;
  employee_area?: {
    id: number;
    name: string;
  } | null;
}

export interface PurchaseOrderAuthorizerDto {
  id: number;
  employee: PurchaseOrderAuthorizerEmployeeDto | null;
  employee_id: number | null;
  employee_name: string | null;
  is_active: boolean;
  created_by_user: PurchaseOrderUserDto | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseOrderAuthorizerDto {
  employee_id: number;
}

export interface PurchaseOrderAuthorizerSaveResponse {
  success: boolean;
  message: string;
  data: PurchaseOrderAuthorizerDto;
}



export interface GetTicketPhotoUploadUrlDto {
  fileName: string;
  fileType: string;
}

export interface TicketPhotoUploadUrlResponse {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

export interface CreateTicketPhotoDto {
  purchase_order_id?: number | null;
  project_id?: number | null;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  s3_key: string;
  public_url: string;
  notes?: string | null;
}

export interface CreateTicketPhotoResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    purchase_order_id: number | null;
    project_id: number | null;
    file_name: string | null;
    mime_type: string | null;
    size_bytes: number | null;
    s3_key: string;
    public_url: string;
    status: string;
    notes: string | null;
    created_at: string;
  };
}

export interface FiltersTicketPhotos {
  page: number;
  limit: number;
  project_id?: number | null;
}

export interface PendingTicketPhotosPaginatedResponse {
  data: PurchaseOrderTicketPhotoDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PendingTicketPhotoRow {
  id: number;
  project_id: number | null;
  preview_url: string | null;
  file_name: string;
  project_name: string;
  uploaded_by_name: string;
  status: string;
  status_label: string;
  created_at: string;
  created_at_date: string;
  public_url: string | null;
  purchase_order?: TicketPhotoPurchaseOrderMiniDto | null;
  uploaded_by_user_id?: number | null;
}

export interface TicketPhotoViewUrlResponse {
  id: number;
  file_name: string | null;
  url: string;
  expiresIn: number;
}

export interface ReconcileTicketPhotoDto {
  purchase_order_id: number;
  notes?: string | null;
}

export interface ReconcileTicketPhotoResponse {
  success: boolean;
  message: string;
  data: PurchaseOrderTicketPhotoDto;
}

export interface TicketPhotoPurchaseOrderMiniDto {
  id: number;
  folio: string;
  concept: string;
  requested_amount: number;
  status: PurchaseOrderStatus | string;
}

export interface CreateDirectExpenseFromTicketItemDto {
  product_id: number;
  concept?: string | null;
  amount: number;
  payment_amount?: number | null;
  payment_date?: string | null;
}

export interface CreateDirectExpenseFromTicketDto {
  date: string;
  supplier_id?: number | null;
  items: CreateDirectExpenseFromTicketItemDto[];
  notes?: string | null;
}

export interface CreateDirectExpenseFromTicketResponse {
  success: boolean;
  message: string;
  data: {
    purchase_order_id: number;
    purchase_order_folio: string;
    ticket_photo_id: number;
    expense_id: number;
    total_amount: number;
  };
}


export interface CreateDirectXmlExpenseFromTicketItemDto {
  product_id: number;
  concept?: string | null;

  quantity?: number | null;
  unit?: string | null;
  unit_price?: number | null;

  base_amount?: number | null;
  discount_amount?: number | null;
  tax_amount?: number | null;
  withheld_amount?: number | null;

  amount: number;

  payment_amount?: number | null;
  payment_date?: string | null;
}

export interface CreateDirectXmlExpenseFromTicketDto {
  date: string;
  supplier_id: number;
  cfdi_uuid: string;
  notes?: string | null;
  items: CreateDirectXmlExpenseFromTicketItemDto[];
}

export interface CreateDirectXmlExpenseFromTicketResponse {
  success: boolean;
  message: string;
  data: {
    purchase_order_id: number;
    purchase_order_folio: string;
    ticket_photo_id: number;
    expense_id: number;
    cfdi_uuid: string;
    total_amount: number;
  };
}

export interface PurchaseOrderExpenseItemDetailDto {
  id: number;
  item_type?: string | null;
  product?: {
    id: number;
    name: string;
  } | null;
  project?: PurchaseOrderProjectDto | null;
  concept?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  unit_id?: number | null;
  unit_name?: string | null;
  unit_price?: number | string | null;
  amount?: number | string | null;
  payment_amount?: number | string | null;
  payment_date?: string | null;
}

export interface PurchaseOrderExpenseLinkedItemDto
  extends PurchaseOrderExpenseItemDetailDto {
  link_item_id?: number | null;
  expense_item_id: number;
  amount_snapshot?: number | string | null;
  linked_at?: string | null;
}

export interface AvailableXmlExpenseItemDto extends PurchaseOrderExpenseItemDetailDto {
  id: number;
}

export interface AvailableXmlExpenseDto {
  id: number;
  date: string;
  internal_folio: string;
  total_amount: number | string;
  cfdi_uuid: string | null;
  supplier: {
    id: number;
    company_name: string;
  } | null;
  status: {
    id: number;
    name: string;
  } | null;
  available_items: AvailableXmlExpenseItemDto[];
  available_item_ids: number[];
  available_items_count: number;
  available_amount: number;
  available_paid_amount: number;
  available_balance: number;
  can_select: boolean;
}

export interface AvailableXmlExpensesResponse {
  data: AvailableXmlExpenseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FiltersAvailableXmlExpenses {
  search?: string | null;
  supplierIds?: number[] | null;
  date_from?: string | null;
  date_to?: string | null;
  amount?: number | string | null;
}

export interface LinkExistingXmlExpenseDto {
  expense_id: number;
  expense_item_ids: number[];
  notes?: string | null;
}

export interface LinkExistingXmlExpenseResponse {
  success: boolean;
  message: string;
  data: {
    purchase_order_id: number;
    purchase_order_folio: string;
    ticket_photo_id: number;
    expense_id: number;
    expense_folio: string;
    cfdi_uuid: string;
    selected_item_ids: number[];
    amount_snapshot: number;
  };
}

export interface CreateWarehouseExpenseFromTicketItemDto {
  product_id: number;
  concept?: string | null;

  quantity: number;
  unit_id: number | null;
  unit_price: number;

  payment_amount?: number | null;
  payment_date?: string | null;
}

export interface CreateWarehouseExpenseFromTicketDto {
  date: string;
  supplier_id?: number | null;
  notes?: string | null;
  items: CreateWarehouseExpenseFromTicketItemDto[];
}

export interface CreateWarehouseExpenseFromTicketResponse {
  success: boolean;
  message: string;
  data: {
    purchase_order_id: number;
    purchase_order_folio: string;
    ticket_photo_id: number;
    expense_id: number;
    total_amount: number;
  };
}

export interface AvailableWarehouseXmlExpenseItemDto extends PurchaseOrderExpenseItemDetailDto {
  id: number;
}

export interface AvailableWarehouseXmlExpenseDto {
  id: number;
  date: string;
  internal_folio: string;
  total_amount: number | string;
  cfdi_uuid: string | null;

  supplier: {
    id: number;
    company_name: string;
  } | null;

  status: {
    id: number;
    name: string;
  } | null;

  available_items: AvailableWarehouseXmlExpenseItemDto[];
  available_item_ids: number[];
  available_items_count: number;

  available_amount: number;
  available_paid_amount: number;
  available_balance: number;

  can_select: boolean;
}

export interface AvailableWarehouseXmlExpensesResponse {
  data: AvailableWarehouseXmlExpenseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FiltersAvailableWarehouseXmlExpenses {
  search?: string | null;
  supplierIds?: number[] | null;
  date_from?: string | null;
  date_to?: string | null;
  amount?: number | string | null;
}

export interface LinkExistingWarehouseXmlExpenseDto {
  expense_id: number;
  expense_item_ids: number[];
  notes?: string | null;
}

export interface LinkExistingWarehouseXmlExpenseResponse {
  success: boolean;
  message: string;
  data: {
    purchase_order_id: number;
    purchase_order_folio: string;
    ticket_photo_id: number;
    expense_id: number;
    expense_folio: string;
    cfdi_uuid: string;
    selected_item_ids: number[];
    amount_snapshot: number;
  };
}


export interface UpdateTicketPhotoProjectDto {
  project_id: number;
}

export interface UpdateTicketPhotoProjectResponse {
  success: boolean;
  message: string;
  data: PurchaseOrderTicketPhotoDto;
}

export interface DeleteTicketPhotoResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    file_name: string | null;
    deleted: boolean;
  };
}
