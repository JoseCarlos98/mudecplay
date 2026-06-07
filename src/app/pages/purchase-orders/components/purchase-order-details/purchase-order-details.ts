import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';

import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { DataTable } from '../../../../shared/ui/data-table/data-table';
import {
  ColumnsConfig,
  ColumnVariant,
  DataTableActionEvent,
  DataTableExtraAction,
} from '../../../../shared/ui/data-table/interfaces/table-interfaces';

import { PurchaseOrdersService } from '../../services/purchase-orders.service';

type DetailStatusVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'primary';

type FlowStepStatus = 'done' | 'current' | 'pending' | 'blocked';

interface BasicRef {
  id: number;
  name: string;
}

interface PurchaseOrderHistoryEventResponse {
  id: number;
  event_type: string;
  title: string;
  description: string | null;
  performed_by_user: {
    id: number;
    name: string;
  } | null;
  performed_by_name: string | null;
  tag: string;
  tag_variant: DetailStatusVariant;
  icon: string;
  metadata: Record<string, any> | null;
  created_at: string;
}


interface PurchaseOrderDetailInfoItem {
  label: string;
  value: string;
  chip?: boolean;
  variant?: DetailStatusVariant;
  icon?: string;
}

interface PurchaseOrderFlowStep {
  label: string;
  date: string;
  icon: string;
  status: FlowStepStatus;
}

interface PurchaseOrderPhoto {
  id: number;
  fileName: string;
  status: string;
  statusLabel: string;
  statusVariant: DetailStatusVariant;
  uploadedBy: string;
  uploadedAt: string;
  previewUrl: string | null;
  hasExpense: boolean;
}

interface PurchaseOrderExpense {
  id: number;
  folio: string;
  type: string;
  total: number;
  paid: number;
  balance: number;
  balanceDisplay: string;
  statusLabel: string;
  statusVariant: DetailStatusVariant;
}

type ExpenseTableAction = DataTableActionEvent<PurchaseOrderExpense>;

interface PurchaseOrderHistoryItem {
  id: number;
  title: string;
  user: string;
  tag: string;
  tagVariant: DetailStatusVariant;
  date: string;
  description: string;
  icon: string;
}

interface PurchaseOrderDetailViewModel {
  id: number | null;
  folio: string;
  project: string;
  status: string;
  statusLabel: string;
  flowLabel: string;
  paymentStatusLabel: string;
  destinationType: string;
  destinationLabel: string;
  willHaveInvoice: boolean;
  invoiceLabel: string;
  requestedAmount: number;
  concept: string;
  notes: string | null;
  requester: string;
  createdBy: string;
  authorizedBy: string;
  authorizationRegisteredBy: string;
  authorizedAt: string;
}

interface PurchaseOrderFlowDetailResponse {
  id: number;
  folio: string;
  project: BasicRef | null;
  destination_type: string;
  destination_type_label: string;
  will_have_invoice: boolean;
  will_have_invoice_label: string;
  history?: PurchaseOrderHistoryEventResponse[];
  concept: string;
  requested_amount: number;
  status: string;
  status_label: string;
  requested_by_employee: BasicRef | null;
  requested_by_name: string | null;
  created_by_user: BasicRef | null;
  authorized_by_employee: BasicRef | null;
  authorized_by_name: string | null;
  authorization_registered_by_user: BasicRef | null;
  authorized_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  ticket_photos_count: number;
  expense_links_count: number;
  ticket_photos: any[];
  expense_links: any[];
}

const HEADER_CONFIG: ModuleHeaderConfig = {
  formFull: true,
};

@Component({
  selector: 'app-purchase-order-details',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatPaginatorModule,
    ModuleHeader,
    DataTable,
  ],
  templateUrl: './purchase-order-details.html',
  styleUrl: './purchase-order-details.scss',
})
export class PurchaseOrderDetails implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly purchaseOrdersService = inject(PurchaseOrdersService);

  readonly pageTitle = 'Detalle de orden de compra';
  readonly headerConfig = HEADER_CONFIG;

  readonly tablePageSizeOptions: number[] = [5, 10, 25, 50];

  loadingDetail = false;

  expensesPageIndex = 0;
  expensesPageSize = 5;

  historyPageIndex = 0;
  historyPageSize = 5;

  order: PurchaseOrderDetailViewModel = this.getEmptyOrder();

  orderInfoItems: PurchaseOrderDetailInfoItem[] = [];
  authorizationInfoItems: PurchaseOrderDetailInfoItem[] = [];
  flowSteps: PurchaseOrderFlowStep[] = [];
  photos: PurchaseOrderPhoto[] = [];
  expenses: PurchaseOrderExpense[] = [];
  history: PurchaseOrderHistoryItem[] = [];

  readonly expenseColumnsConfig: ColumnsConfig[] = [
    {
      key: 'folio',
      label: 'Folio gasto',
    },
    {
      key: 'type',
      label: 'Tipo',
      type: 'chip', typeVariant: 'chip-neutral'
    },
    {
      key: 'total',
      label: 'Total',
      type: 'money',
      align: 'right',
    },
    {
      key: 'paid',
      label: 'Pagado',
      type: 'money',
      align: 'right',
    },
    {
      key: 'balanceDisplay',
      label: 'Saldo',
      type: 'chip',
      align: 'right',
      variantResolver: (row: PurchaseOrderExpense) =>
        Number(row.balance ?? 0) > 0 ? 'chip-danger' : 'chip-success',
    },
    {
      key: 'statusLabel',
      label: 'Estatus',
      type: 'chip',
      variantResolver: (row: PurchaseOrderExpense) =>
        this.getTableChipVariant(row.statusVariant),
    },
  ];

  readonly expenseDisplayedColumns: string[] = [
    ...this.expenseColumnsConfig.map((column) => column.key),
    'actions',
  ];

  readonly expenseExtraActions: DataTableExtraAction<PurchaseOrderExpense>[] = [
    {
      type: 'viewExpense',
      icon: 'open_in_new',
      tooltip: () => 'Ver / editar gasto',
      visible: () => true,
      disabled: (row) => !row?.id,
    },
  ];

  readonly historyColumnsConfig: ColumnsConfig[] = [
    {
      key: 'title',
      label: 'Evento',
    },
    {
      key: 'user',
      label: 'Usuario',
    },
    {
      key: 'tag',
      label: 'Tipo',
      type: 'chip',
      variantResolver: (row: PurchaseOrderHistoryItem) =>
        this.getTableChipVariant(row.tagVariant),
    },
    {
      key: 'date',
      label: 'Fecha',
    },
    {
      key: 'description',
      label: 'Descripción',
    },
  ];

  readonly historyDisplayedColumns: string[] = this.historyColumnsConfig.map(
    (column) => column.key,
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.goBack();
      return;
    }

    this.loadDetail(id);
  }

  get paginatedExpenses(): PurchaseOrderExpense[] {
    const start = this.expensesPageIndex * this.expensesPageSize;
    const end = start + this.expensesPageSize;

    return this.expenses.slice(start, end);
  }

  get paginatedHistory(): PurchaseOrderHistoryItem[] {
    const start = this.historyPageIndex * this.historyPageSize;
    const end = start + this.historyPageSize;

    return this.history.slice(start, end);
  }

  onExpensesPageChange(event: PageEvent): void {
    this.expensesPageIndex = event.pageIndex;
    this.expensesPageSize = event.pageSize;
  }

  onExpenseTableAction(event: ExpenseTableAction): void {
    switch (event.type) {
      case 'viewExpense':
        this.goToExpenseForm(event.row);
        break;

      default:
        break;
    }
  }

  canRegisterDirectXmlExpense(photo: PurchaseOrderPhoto): boolean {
  return (
    !!photo?.id &&
    photo.status === 'reconciled' &&
    !photo.hasExpense &&
    this.order.status === 'authorized' &&
    this.order.destinationType === 'direct' &&
    this.order.willHaveInvoice === true
  );
}

goToRegisterDirectXmlExpense(photo: PurchaseOrderPhoto): void {
  if (!this.canRegisterDirectXmlExpense(photo)) return;

  this.router.navigateByUrl(`/ordenes-compra/registrar-gasto-xml/${photo.id}`);
}

  goToExpenseForm(expense: PurchaseOrderExpense): void {
    if (!expense?.id) return;

    this.router.navigate(['/gastos/editar', expense.id], {
      queryParams: {
        returnUrl: this.router.url,
      },
    });
  }

  goToExpensesList(): void {
    this.router.navigateByUrl('/gastos');
  }

  onHistoryPageChange(event: PageEvent): void {
    this.historyPageIndex = event.pageIndex;
    this.historyPageSize = event.pageSize;
  }

  onHeaderAction(action: string): void {
    if (action === 'back') {
      this.goBack();
    }
  }

  goBack(): void {
    this.router.navigateByUrl('/ordenes-compra');
  }

  private loadDetail(id: number | string): void {
    if (this.loadingDetail) return;

    this.loadingDetail = true;

    this.purchaseOrdersService
      .getFlowDetail(id)
      .pipe(
        finalize(() => {
          this.loadingDetail = false;
        }),
      )
      .subscribe({
        next: (response) => {
          const detail = (response?.data ?? response) as PurchaseOrderFlowDetailResponse;
          this.setDetailData(detail);
        },
        error: (err) => {
          console.error('Error al cargar detalle de orden de compra:', err);
          this.goBack();
        },
      });
  }

  private setDetailData(detail: PurchaseOrderFlowDetailResponse): void {
    const expenseLinks = detail.expense_links ?? [];

    this.photos = (detail.ticket_photos ?? [])
      .map((photo) => this.mapPhoto(photo, expenseLinks))
      .sort((a, b) => {
        // Primero las fotos conciliadas que aún NO tienen gasto registrado
        const aCanRegister = a.status === 'reconciled' && !a.hasExpense;
        const bCanRegister = b.status === 'reconciled' && !b.hasExpense;

        if (aCanRegister !== bCanRegister) {
          return aCanRegister ? -1 : 1;
        }

        // Después las fotos sin gasto, aunque no estén conciliadas
        if (a.hasExpense !== b.hasExpense) {
          return a.hasExpense ? 1 : -1;
        }

        // Mantiene el orden original dentro del mismo grupo
        return 0;
      });

    this.expenses = expenseLinks.map((link) =>
      this.mapExpenseLink(link),
    );

    this.order = this.mapOrder(detail);

    this.orderInfoItems = this.buildOrderInfoItems(detail);
    this.authorizationInfoItems = this.buildAuthorizationInfoItems(detail);
    this.flowSteps = this.buildFlowSteps(detail);
    this.history = this.buildHistory(detail);

    this.expensesPageIndex = 0;
    this.historyPageIndex = 0;

    this.loadPhotoPreviewUrls();
  }

  private mapOrder(
    detail: PurchaseOrderFlowDetailResponse,
  ): PurchaseOrderDetailViewModel {
    return {
      id: detail.id ?? null,
      folio: detail.folio || 'Sin folio',
      project: detail.project?.name ?? 'Sin proyecto',
      status: detail.status,
      statusLabel: detail.status_label || this.getStatusLabel(detail.status),
      flowLabel: this.getFlowLabel(detail),
      paymentStatusLabel: this.getPaymentStatusLabel(),
      destinationType: detail.destination_type,
      destinationLabel:
        detail.destination_type_label ||
        this.getDestinationTypeLabel(detail.destination_type),
      willHaveInvoice: !!detail.will_have_invoice,
      invoiceLabel:
        detail.will_have_invoice_label ||
        (detail.will_have_invoice ? 'Con factura' : 'Sin factura'),
      requestedAmount: Number(detail.requested_amount ?? 0),
      concept: detail.concept || 'Sin concepto',
      notes: detail.notes,
      requester:
        detail.requested_by_employee?.name ??
        detail.requested_by_name ??
        'Sin solicitante',
      createdBy: detail.created_by_user?.name ?? 'Sin dato',
      authorizedBy:
        detail.authorized_by_employee?.name ??
        detail.authorized_by_name ??
        'Sin autorizar',
      authorizationRegisteredBy:
        detail.authorization_registered_by_user?.name ?? 'Sin dato',
      authorizedAt: this.formatDateTime(detail.authorized_at),
    };
  }

  private buildOrderInfoItems(
    detail: PurchaseOrderFlowDetailResponse,
  ): PurchaseOrderDetailInfoItem[] {
    return [
      {
        label: 'Folio',
        value: this.order.folio,
      },
      {
        label: 'Estatus O.C.',
        value: this.order.statusLabel,
        chip: true,
        variant: this.getStatusVariant(detail.status),
      },
      {
        label: 'Avance del flujo',
        value: this.order.flowLabel,
        chip: true,
        variant: this.getFlowVariant(detail),
      },
      {
        label: 'Estado de pago',
        value: this.order.paymentStatusLabel,
        chip: true,
        variant: this.getPaymentStatusVariant(),
      },
      {
        label: 'Proyecto',
        value: this.order.project,
      },
      {
        label: 'Destino',
        value: this.order.destinationLabel,
        chip: true,
        variant: 'neutral',
      },
      {
        label: 'Factura',
        value: this.order.invoiceLabel,
        chip: true,
        variant: detail.will_have_invoice ? 'success' : 'neutral',
      },
      {
        label: 'Monto solicitado',
        value: this.formatMoney(this.order.requestedAmount),
      },
    ];
  }

  private buildAuthorizationInfoItems(
    detail: PurchaseOrderFlowDetailResponse,
  ): PurchaseOrderDetailInfoItem[] {
    return [
      {
        label: 'Solicitante',
        value: this.order.requester,
      },
      {
        label: 'Capturado por',
        value: this.order.createdBy,
      },
      {
        label: 'Autorizó',
        value: this.order.authorizedBy,
        chip: true,
        variant: detail.authorized_at ? 'success' : 'neutral',
      },
      {
        label: 'Registró autorización',
        value: this.order.authorizationRegisteredBy,
      },
      {
        label: 'Fecha autorización',
        value: this.order.authorizedAt,
        icon: 'event',
      },
    ];
  }

  private buildFlowSteps(
    detail: PurchaseOrderFlowDetailResponse,
  ): PurchaseOrderFlowStep[] {
    const isAuthorized = detail.status === 'authorized';
    const isInReview = detail.status === 'in_review';
    const isRejected = detail.status === 'not_authorized';
    const isCancelled = detail.status === 'cancelled';

    const hasPhotos =
      this.photos.length > 0 || Number(detail.ticket_photos_count ?? 0) > 0;

    const hasReconciledPhoto = this.photos.some(
      (photo) => photo.status === 'reconciled',
    );

    const hasExpenses =
      this.expenses.length > 0 || Number(detail.expense_links_count ?? 0) > 0;

    const totalPaid = this.expenses.reduce((total, expense) => {
      return total + Number(expense.paid ?? 0);
    }, 0);

    const totalBalance = this.expenses.reduce((total, expense) => {
      return total + Number(expense.balance ?? 0);
    }, 0);

    const hasAnyPayment = totalPaid > 0;
    const hasFullPayment = hasExpenses && totalBalance <= 0;

    const paymentStepLabel = hasFullPayment
      ? 'Pago completado'
      : hasExpenses && hasAnyPayment
        ? 'Pago parcial'
        : hasExpenses
          ? 'Pago pendiente'
          : 'Pago completado';

    const paymentStepDate = hasFullPayment
      ? 'Completado'
      : hasExpenses && hasAnyPayment
        ? 'Con saldo'
        : hasExpenses
          ? 'Sin pago'
          : 'Pendiente';

    const firstPhoto = this.photos[0];

    const reconciledPhoto = this.photos.find(
      (photo) => photo.status === 'reconciled',
    );

    return [
      {
        label: 'O.C. creada',
        date: this.formatDateTime(detail.created_at),
        icon: 'description',
        status: 'done',
      },
      {
        label:
          detail.status === 'in_review'
            ? 'Pendiente de autorización'
            : detail.status === 'not_authorized'
              ? 'O.C. no autorizada'
              : detail.status === 'cancelled'
                ? 'Autorización bloqueada'
                : 'O.C. autorizada',
        date: detail.authorized_at
          ? this.formatDateTime(detail.authorized_at)
          : 'Pendiente',
        icon:
          detail.status === 'not_authorized'
            ? 'block'
            : detail.status === 'cancelled'
              ? 'lock'
              : 'verified',
        status: isAuthorized
          ? 'done'
          : isInReview
            ? 'current'
            : isRejected || isCancelled
              ? 'blocked'
              : 'pending',
      },
      {
        label: 'Foto subida',
        date: firstPhoto?.uploadedAt ?? 'Pendiente',
        icon: 'photo_camera',
        status: hasPhotos
          ? 'done'
          : isAuthorized
            ? 'current'
            : isRejected || isCancelled
              ? 'blocked'
              : 'pending',
      },
      {
        label: 'Foto conciliada',
        date: hasReconciledPhoto
          ? reconciledPhoto?.uploadedAt ?? 'Conciliada'
          : 'Pendiente',
        icon: 'fact_check',
        status: hasReconciledPhoto
          ? 'done'
          : hasPhotos
            ? 'current'
            : isRejected || isCancelled
              ? 'blocked'
              : 'pending',
      },
      {
        label: 'Gasto registrado',
        date: hasExpenses ? 'Registrado' : 'Pendiente',
        icon: 'receipt_long',
        status: hasExpenses
          ? 'done'
          : hasReconciledPhoto
            ? 'current'
            : isRejected || isCancelled
              ? 'blocked'
              : 'pending',
      },
      {
        label: paymentStepLabel,
        date: paymentStepDate,
        icon: hasFullPayment ? 'paid' : 'payments',
        status: hasFullPayment
          ? 'done'
          : hasExpenses
            ? 'current'
            : isRejected || isCancelled
              ? 'blocked'
              : 'pending',
      },
    ];
  }

  private buildHistory(
    detail: PurchaseOrderFlowDetailResponse,
  ): PurchaseOrderHistoryItem[] {
    if (Array.isArray(detail.history) && detail.history.length > 0) {
      return detail.history.map((event) => this.mapHistoryEvent(event));
    }

    return this.buildFallbackHistory(detail);
  }

  private mapHistoryEvent(
    event: PurchaseOrderHistoryEventResponse,
  ): PurchaseOrderHistoryItem {
    return {
      id: event.id,
      title: event.title || this.getHistoryTitleByType(event.event_type),
      user:
        event.performed_by_user?.name ??
        event.performed_by_name ??
        'Sistema',
      tag: event.tag || this.getHistoryTagByType(event.event_type),
      tagVariant: event.tag_variant ?? this.getHistoryVariantByType(event.event_type),
      date: this.formatDateTime(event.created_at),
      description:
        event.description ||
        this.getHistoryDescriptionByType(event.event_type),
      icon: event.icon || this.getHistoryIconByType(event.event_type),
    };
  }

  private buildFallbackHistory(
    detail: PurchaseOrderFlowDetailResponse,
  ): PurchaseOrderHistoryItem[] {
    const rows: PurchaseOrderHistoryItem[] = [];

    rows.push({
      id: rows.length + 1,
      title: 'Orden creada',
      user: detail.created_by_user?.name ?? 'Sistema',
      tag: 'Sistema',
      tagVariant: 'info',
      date: this.formatDateTime(detail.created_at),
      description: `Se creó la orden de compra ${detail.folio}.`,
      icon: 'description',
    });

    if (detail.authorized_at) {
      rows.push({
        id: rows.length + 1,
        title: 'Orden autorizada',
        user:
          detail.authorized_by_employee?.name ??
          detail.authorized_by_name ??
          'Sin dato',
        tag: 'Autorización',
        tagVariant: 'success',
        date: this.formatDateTime(detail.authorized_at),
        description: 'La orden de compra fue autorizada correctamente.',
        icon: 'verified',
      });
    }

    if (detail.status === 'not_authorized') {
      rows.push({
        id: rows.length + 1,
        title: 'Orden no autorizada',
        user: detail.updated_at ? 'Sistema' : 'Sin dato',
        tag: 'Rechazo',
        tagVariant: 'warning',
        date: this.formatDateTime(detail.updated_at),
        description: detail.notes || 'La orden fue marcada como no autorizada.',
        icon: 'block',
      });
    }

    if (detail.status === 'cancelled') {
      rows.push({
        id: rows.length + 1,
        title: 'Orden cancelada',
        user: detail.updated_at ? 'Sistema' : 'Sin dato',
        tag: 'Cancelación',
        tagVariant: 'danger',
        date: this.formatDateTime(detail.updated_at),
        description: detail.notes || 'La orden fue cancelada.',
        icon: 'cancel',
      });
    }

    this.photos.forEach((photo) => {
      rows.push({
        id: rows.length + 1,
        title:
          photo.status === 'reconciled'
            ? 'Foto conciliada'
            : 'Foto subida',
        user: photo.uploadedBy,
        tag: 'Foto',
        tagVariant: photo.statusVariant,
        date: photo.uploadedAt,
        description: `Se registró la foto ${photo.fileName}.`,
        icon: photo.status === 'reconciled' ? 'fact_check' : 'photo_camera',
      });
    });

    this.expenses.forEach((expense) => {
      rows.push({
        id: rows.length + 1,
        title: 'Gasto registrado',
        user: 'Sistema',
        tag: 'Gasto',
        tagVariant: 'primary',
        date: 'Sin fecha',
        description: `Se registró el gasto relacionado ${expense.folio}.`,
        icon: 'receipt_long',
      });
    });

    return rows;
  }

  private getHistoryTitleByType(eventType: string): string {
    switch (eventType) {
      case 'created':
        return 'Orden creada';

      case 'updated':
        return 'Orden editada';

      case 'authorized':
        return 'Orden autorizada';

      case 'not_authorized':
        return 'Orden no autorizada';

      case 'cancelled':
        return 'Orden cancelada';

      case 'ticket_uploaded':
        return 'Foto subida';

      case 'ticket_reconciled':
        return 'Foto conciliada';

      case 'expense_linked':
        return 'Gasto registrado';

      default:
        return 'Movimiento registrado';
    }
  }

  private getHistoryTagByType(eventType: string): string {
    switch (eventType) {
      case 'created':
        return 'Sistema';

      case 'updated':
        return 'Edición';

      case 'authorized':
        return 'Autorización';

      case 'not_authorized':
        return 'Rechazo';

      case 'cancelled':
        return 'Cancelación';

      case 'ticket_uploaded':
        return 'Foto';

      case 'ticket_reconciled':
        return 'Conciliación';

      case 'expense_linked':
        return 'Gasto';

      default:
        return 'Evento';
    }
  }

  private getHistoryVariantByType(eventType: string): DetailStatusVariant {
    switch (eventType) {
      case 'authorized':
        return 'success';

      case 'not_authorized':
        return 'warning';

      case 'cancelled':
        return 'danger';

      case 'ticket_reconciled':
        return 'info';

      case 'expense_linked':
        return 'primary';

      case 'created':
      case 'updated':
      case 'ticket_uploaded':
      default:
        return 'info';
    }
  }

  private getHistoryIconByType(eventType: string): string {
    switch (eventType) {
      case 'created':
        return 'description';

      case 'updated':
        return 'edit';

      case 'authorized':
        return 'verified';

      case 'not_authorized':
        return 'block';

      case 'cancelled':
        return 'cancel';

      case 'ticket_uploaded':
        return 'photo_camera';

      case 'ticket_reconciled':
        return 'fact_check';

      case 'expense_linked':
        return 'receipt_long';

      default:
        return 'history';
    }
  }

  private getHistoryDescriptionByType(eventType: string): string {
    switch (eventType) {
      case 'created':
        return 'Se creó la orden de compra.';

      case 'updated':
        return 'Se editó la orden de compra.';

      case 'authorized':
        return 'La orden de compra fue autorizada.';

      case 'not_authorized':
        return 'La orden fue marcada como no autorizada.';

      case 'cancelled':
        return 'La orden fue cancelada.';

      case 'ticket_uploaded':
        return 'Se subió una foto o comprobante.';

      case 'ticket_reconciled':
        return 'La foto fue conciliada con la orden de compra.';

      case 'expense_linked':
        return 'Se registró un gasto relacionado.';

      default:
        return 'Se registró un movimiento en la orden de compra.';
    }
  }

  private mapPhoto(
    photo: any,
    expenseLinks: any[] = [],
  ): PurchaseOrderPhoto {
    const photoId = Number(photo.id ?? 0);
    const status = String(photo.status ?? '').trim() || 'pending';

    return {
      id: photoId,
      fileName:
        photo.file_name ??
        photo.fileName ??
        photo.filename ??
        'Foto sin nombre',
      status,
      statusLabel: this.getPhotoStatusLabel(status),
      statusVariant: this.getPhotoStatusVariant(status),
      uploadedBy:
        photo.uploaded_by_user?.name ??
        photo.uploadedByUser?.name ??
        photo.user?.name ??
        'Sin dato',
      uploadedAt: this.formatDateTime(
        photo.uploaded_at ?? photo.created_at ?? photo.createdAt,
      ),
      previewUrl: null,
      hasExpense: this.photoHasExpense(photoId, expenseLinks),
    };
  }

  private photoHasExpense(photoId: number, expenseLinks: any[]): boolean {
    if (!photoId || !Array.isArray(expenseLinks)) return false;

    return expenseLinks.some((link) => {
      const linkedPhotoId =
        link.ticket_photo_id ??
        link.ticketPhoto?.id ??
        link.ticket_photo?.id ??
        null;

      return Number(linkedPhotoId) === photoId;
    });
  }

  private loadPhotoPreviewUrls(): void {
    const photosWithId = this.photos.filter((photo) => photo.id > 0);

    if (photosWithId.length === 0) return;

    forkJoin(
      photosWithId.map((photo) =>
        this.purchaseOrdersService.getTicketPhotoViewUrl(photo.id).pipe(
          map((response) => ({
            id: photo.id,
            url: response.url,
          })),
          catchError((err) => {
            console.error('Error cargando URL temporal de foto:', err);

            return of({
              id: photo.id,
              url: null,
            });
          }),
        ),
      ),
    ).subscribe((results) => {
      const urlByPhotoId = new Map(
        results.map((item) => [item.id, item.url]),
      );

      this.photos = this.photos.map((photo) => ({
        ...photo,
        previewUrl: urlByPhotoId.get(photo.id) ?? null,
      }));
    });
  }

  openPhoto(photo: PurchaseOrderPhoto): void {
    if (!photo?.id) return;

    this.purchaseOrdersService.getTicketPhotoViewUrl(photo.id).subscribe({
      next: (response) => {
        window.open(response.url, '_blank', 'noopener,noreferrer');
      },
      error: (err) => {
        console.error('Error abriendo foto:', err);
      },
    });
  }

  canRegisterExpense(photo: PurchaseOrderPhoto): boolean {
    return (
      !!photo?.id &&
      photo.status === 'reconciled' &&
      !photo.hasExpense &&
      this.order.status === 'authorized' &&
      this.order.destinationType === 'direct' &&
      this.order.willHaveInvoice === false
    );
  }

  goToRegisterExpense(photo: PurchaseOrderPhoto): void {
    if (!this.canRegisterExpense(photo)) return;

    this.router.navigateByUrl(`/ordenes-compra/registrar-gasto/${photo.id}`);
  }

  private mapExpenseLink(link: any): PurchaseOrderExpense {
    const expense = link.expense ?? link;

    const total = Number(
      link.amount_snapshot ??
      expense.total_amount ??
      expense.total ??
      expense.amount ??
      0,
    );

    const paid = Number(
      expense.paid_amount ??
      expense.total_paid ??
      expense.payment_amount ??
      this.getPaidFromExpenseItems(expense.items) ??
      0,
    );

    const balance = Math.max(total - paid, 0);

    return {
      id: Number(expense.id ?? link.expense_id ?? link.id ?? 0),
      folio:
        expense.internal_folio ??
        expense.folio ??
        link.expense_folio ??
        `Gasto #${expense.id ?? link.expense_id ?? link.id ?? ''}`,
      type:
        link.registration_type_label ??
        this.getRegistrationTypeLabel(link.registration_type) ??
        'Gasto',
      total,
      paid,
      balance,
      balanceDisplay: this.formatMoney(balance),
      statusLabel:
        balance <= 0
          ? 'Pagado'
          : paid > 0
            ? 'Parcial'
            : 'No pagado',
      statusVariant:
        balance <= 0
          ? 'success'
          : paid > 0
            ? 'warning'
            : 'danger',
    };
  }

  private getPaidFromExpenseItems(items: any[] | undefined | null): number {
    if (!Array.isArray(items)) return 0;

    return items.reduce((total, item) => {
      return total + Number(item.payment_amount ?? item.paid_amount ?? 0);
    }, 0);
  }

  private getFlowLabel(detail: PurchaseOrderFlowDetailResponse): string {
    if (detail.status === 'cancelled') return 'Cancelada';
    if (detail.status === 'not_authorized') return 'No autorizada';
    if (detail.status === 'in_review') return 'En revisión';

    const hasPhotos =
      this.photos.length > 0 || Number(detail.ticket_photos_count ?? 0) > 0;

    const hasReconciledPhoto = this.photos.some(
      (photo) => photo.status === 'reconciled',
    );

    const hasExpenses =
      this.expenses.length > 0 || Number(detail.expense_links_count ?? 0) > 0;

    if (detail.status === 'authorized' && !hasPhotos) {
      return 'Autorizada sin foto';
    }

    if (hasPhotos && !hasReconciledPhoto) {
      return 'Foto pendiente de conciliar';
    }

    if (hasReconciledPhoto && !hasExpenses) {
      return 'Foto conciliada sin gasto';
    }

    if (hasExpenses) {
      return 'Gasto registrado';
    }

    return detail.status_label || 'Sin avance';
  }

  private getPaymentStatusLabel(): string {
    if (this.expenses.length === 0) return 'Sin gasto';

    const totalBalance = this.expenses.reduce((total, expense) => {
      return total + Number(expense.balance ?? 0);
    }, 0);

    const totalPaid = this.expenses.reduce((total, expense) => {
      return total + Number(expense.paid ?? 0);
    }, 0);

    if (totalBalance <= 0) return 'Pagado';
    if (totalPaid > 0) return 'Con saldo';

    return 'No pagado';
  }

  private getPaymentStatusVariant(): DetailStatusVariant {
    const label = this.getPaymentStatusLabel();

    switch (label) {
      case 'Pagado':
        return 'success';

      case 'Con saldo':
        return 'warning';

      case 'No pagado':
        return 'danger';

      case 'Sin gasto':
      default:
        return 'neutral';
    }
  }

  private getStatusVariant(status: string): DetailStatusVariant {
    switch (status) {
      case 'authorized':
        return 'success';

      case 'in_review':
      case 'not_authorized':
        return 'warning';

      case 'cancelled':
        return 'danger';

      default:
        return 'neutral';
    }
  }

  private getFlowVariant(
    detail: PurchaseOrderFlowDetailResponse,
  ): DetailStatusVariant {
    switch (detail.status) {
      case 'authorized':
        return 'info';

      case 'in_review':
      case 'not_authorized':
        return 'warning';

      case 'cancelled':
        return 'danger';

      default:
        return 'neutral';
    }
  }

  private getStatusLabel(status: string): string {
    switch (status) {
      case 'authorized':
        return 'Autorizada';

      case 'in_review':
        return 'En revisión';

      case 'not_authorized':
        return 'No autorizada';

      case 'cancelled':
        return 'Cancelada';

      default:
        return 'Sin estatus';
    }
  }

  private getDestinationTypeLabel(destinationType: string): string {
    switch (destinationType) {
      case 'direct':
        return 'Directo';

      case 'warehouse':
        return 'Almacén';

      default:
        return 'Sin destino';
    }
  }

  private getPhotoStatusLabel(status: string): string {
    switch (status) {
      case 'reconciled':
        return 'Foto conciliada';

      case 'discarded':
        return 'Descartada';

      case 'pending':
      default:
        return 'Pendiente';
    }
  }

  private getPhotoStatusVariant(status: string): DetailStatusVariant {
    switch (status) {
      case 'reconciled':
        return 'success';

      case 'discarded':
        return 'danger';

      case 'pending':
      default:
        return 'warning';
    }
  }

  private getRegistrationTypeLabel(type: string | null | undefined): string {
    switch (type) {
      case 'xml':
        return 'XML';

      case 'manual':
        return 'Manual';

      default:
        return 'Gasto';
    }
  }

  formatMoney(value: number | string | null | undefined): string {
    const amount = Number(value ?? 0);

    return amount.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
    });
  }

  private formatDateTime(value: string | Date | null | undefined): string {
    if (!value) return 'Sin dato';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return 'Sin dato';

    return date
      .toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      .replace(',', '');
  }

  getChipClass(variant?: DetailStatusVariant): string {
    return `purchase-order-detail-chip--${variant ?? 'neutral'}`;
  }

  getFlowStepClass(step: PurchaseOrderFlowStep): string {
    return `purchase-order-flow-step--${step.status}`;
  }

  getTableChipVariant(variant?: DetailStatusVariant): ColumnVariant {
    switch (variant) {
      case 'success':
        return 'chip-success';

      case 'warning':
        return 'chip-warning';

      case 'danger':
        return 'chip-danger';

      case 'info':
      case 'primary':
      case 'neutral':
      default:
        return 'chip-neutral';
    }
  }

  private getEmptyOrder(): PurchaseOrderDetailViewModel {
    return {
      id: null,
      folio: 'Sin folio',
      project: 'Sin proyecto',
      status: '',
      statusLabel: 'Sin estatus',
      flowLabel: 'Sin avance',
      paymentStatusLabel: 'Sin gasto',
      destinationType: '',
      destinationLabel: 'Sin destino',
      willHaveInvoice: false,
      invoiceLabel: 'Sin dato',
      requestedAmount: 0,
      concept: 'Sin concepto',
      notes: null,
      requester: 'Sin solicitante',
      createdBy: 'Sin dato',
      authorizedBy: 'Sin autorizar',
      authorizationRegisteredBy: 'Sin dato',
      authorizedAt: 'Sin dato',
    };
  }
}