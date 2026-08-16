import {
  CommonModule,
  Location,
} from '@angular/common';
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
  DataTableActionPopover,
  DataTableExtraAction,
} from '../../../../shared/ui/data-table/interfaces/table-interfaces';

import { PurchaseOrdersService } from '../../services/purchase-orders.service';
import { DialogService } from '../../../../shared/services/dialog.service';
import { ModalSeePhoto } from '../photo-without-cost/components/modal-see-photo/modal-see-photo';
import { PendingTicketPhotoRow } from '../../interfaces/purchase-orders.interfaces';
import { PermissionsService } from '../../../../auth/services/permissions.service';

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
  reconciledAt: string | null;
  previewUrl: string | null;
  hasExpense: boolean;

  linkedExpenseId: number | null;
  linkedExpenseFolio: string | null;
  linkedExpenseTotal: number | null;
  linkedExpensePaid: number | null;
  linkedExpenseBalance: number | null;
  linkedExpenseStatusLabel: string | null;
  linkedExpenseStatusVariant: DetailStatusVariant | null;
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

  ticketPhotoId: number | null;
  ticketFileName: string | null;
  linkId: number;

  registrationType: string | null;
  cfdiUuid: string | null;
  originType: string | null;
  sourceModule: string | null;
  sourceRecordId: number | null;

  hasXml: boolean;
  hasWarehouseItems: boolean;
}

interface PurchaseOrderPaymentSummary {
  photosCount: number;
  reconciledPhotosCount: number;
  expensesCount: number;
  photosWithExpenseCount: number;
  pendingExpensePhotosCount: number;

  totalRegistered: number;
  totalPaid: number;
  totalBalance: number;

  requestedAmount: number;

  requestedDifference: number;

  requestedDifferenceDisplay: number;

  requestedDifferenceLabel: string;
  requestedDifferenceIcon: string;

  exceedsRequested: boolean;
  isUnderRequested: boolean;
  hasExpenses: boolean;
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
  private readonly location = inject(Location);
  private readonly dialogService = inject(DialogService);
  private readonly permissionsService = inject(PermissionsService);

  readonly pageTitle = 'Detalle de orden de compra';
  readonly headerConfig = HEADER_CONFIG;

  readonly tablePageSizeOptions: number[] = [5, 10, 25, 50];

  loadingDetail = false;
  cancellingOrder = false;

  unreconcilingPhotoId: number | null = null;
  unlinkingExpenseLinkId: number | null = null;

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

  paymentSummary: PurchaseOrderPaymentSummary = this.getEmptyPaymentSummary();

  readonly expenseColumnsConfig: ColumnsConfig[] = [
    {
      key: 'folio',
      label: 'Folio gasto',
    },
    {
      key: 'type',
      label: 'Tipo',
      type: 'chip',
      typeVariant: 'chip-neutral',
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
    {
      type: 'unlinkExpense',
      icon: 'delete_outline',
      tooltip: (row) => this.getUnlinkExpenseTooltip(row),
      popoverContent: (row) => this.getUnlinkExpensePopover(row),
      visible: () => true,
      disabled: (row) => !this.canUnlinkExpense(row),
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

      case 'unlinkExpense':
        this.unlinkExpense(event.row);
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

  canRegisterWarehouseExpense(photo: PurchaseOrderPhoto): boolean {
    return (
      !!photo?.id &&
      photo.status === 'reconciled' &&
      !photo.hasExpense &&
      this.order.status === 'authorized' &&
      this.order.destinationType === 'warehouse' &&
      this.order.willHaveInvoice === false
    );
  }

  goToRegisterDirectXmlExpense(photo: PurchaseOrderPhoto): void {
    if (!this.canRegisterDirectXmlExpense(photo)) return;

    this.router.navigateByUrl(`/ordenes-compra/registrar-gasto-xml/${photo.id}`);
  }

  goToRegisterWarehouseExpense(photo: PurchaseOrderPhoto): void {
    if (!this.canRegisterWarehouseExpense(photo)) return;

    this.router.navigateByUrl(`/ordenes-compra/registrar-almacen/${photo.id}`);
  }

  canRegisterWarehouseXmlExpense(photo: PurchaseOrderPhoto): boolean {
    return (
      !!photo?.id &&
      photo.status === 'reconciled' &&
      !photo.hasExpense &&
      this.order.status === 'authorized' &&
      this.order.destinationType === 'warehouse' &&
      this.order.willHaveInvoice === true
    );
  }

  goToRegisterWarehouseXmlExpense(photo: PurchaseOrderPhoto): void {
    if (!this.canRegisterWarehouseXmlExpense(photo)) return;

    this.router.navigateByUrl(
      `/ordenes-compra/registrar-almacen-xml/${photo.id}`,
    );
  }

  goToExpenseForm(expense: PurchaseOrderExpense): void {
    if (!expense?.id) return;

    this.router.navigate(['/gastos/editar', expense.id], {
      queryParams: {
        returnUrl: this.router.url,
      },
    });
  }

  canUnreconcilePhoto(photo: PurchaseOrderPhoto): boolean {
    return (
      !!photo?.id &&
      photo.status === 'reconciled' &&
      !photo.hasExpense &&
      this.order.status !== 'cancelled'
    );
  }

  unreconcilePhoto(photo: PurchaseOrderPhoto): void {
    if (!this.canUnreconcilePhoto(photo)) return;

    this.dialogService
      .confirm({
        size: 'mini',
        title: 'Desconciliar foto',
        message:
          `¿Quieres desconciliar la foto "${photo.fileName}" de la O.C. ${this.order.folio}?\n\n` +
          'La foto volverá a quedar pendiente y podrá conciliarse nuevamente.',
        confirmText: 'Desconciliar',
        cancelText: 'Cancelar',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.unreconcilingPhotoId = photo.id;

        this.purchaseOrdersService
          .unreconcileTicketPhoto(photo.id, {
            reason: 'Desconciliación realizada desde el detalle de Orden de Compra.',
          })
          .pipe(
            finalize(() => {
              this.unreconcilingPhotoId = null;
            }),
          )
          .subscribe({
            next: () => {
              this.reloadCurrentDetail();
            },
            error: (err) => {
              console.error('Error al desconciliar foto:', err);

              this.showErrorDialog(
                this.getHttpErrorMessage(
                  err,
                  'No se pudo desconciliar la foto.',
                ),
              );
            },
          });
      });
  }

  canUnlinkExpense(expense: PurchaseOrderExpense): boolean {
    if (!this.order.id) return false;

    if (!expense?.linkId) return false;

    if (this.order.status === 'cancelled') return false;

    if (this.unlinkingExpenseLinkId === expense.linkId) return false;

    if (
      this.shouldDeleteExpenseFromPurchaseOrder(expense) &&
      this.isExpensePaidOrCompleted(expense)
    ) {
      return false;
    }

    return true;
  }

  getUnlinkExpenseTooltip(expense: PurchaseOrderExpense): string {
    if (this.unlinkingExpenseLinkId === expense?.linkId) {
      return this.shouldDeleteExpenseFromPurchaseOrder(expense)
        ? 'Eliminando gasto relacionado...'
        : 'Quitando relación...';
    }

    if (this.canUnlinkExpense(expense)) {
      return this.getExpenseRemoveActionLabel(expense);
    }

    return this.getUnlinkExpenseBlockReasons(expense).join(' ');
  }

  getUnlinkExpensePopover(
    expense: PurchaseOrderExpense,
  ): DataTableActionPopover | null {
    if (this.canUnlinkExpense(expense)) {
      return null;
    }

    if (this.unlinkingExpenseLinkId === expense?.linkId) {
      return null;
    }

    return {
      title: 'No disponible',
      message: null,
      items: this.getUnlinkExpenseBlockReasons(expense),
      kind: 'warning',
    };
  }

  private getUnlinkExpenseBlockReasons(
    expense: PurchaseOrderExpense,
  ): string[] {
    if (!expense?.linkId) {
      return ['No se encontró la relación del gasto con la O.C.'];
    }

    if (this.order.status === 'cancelled') {
      return ['No se pueden quitar gastos de una O.C. cancelada.'];
    }

    if (
      this.shouldDeleteExpenseFromPurchaseOrder(expense) &&
      this.isExpensePaidOrCompleted(expense)
    ) {
      return [
        'Este gasto fue creado desde la O.C. y ya tiene pagos registrados. No se puede eliminar desde este flujo.',
      ];
    }

    return ['No se puede quitar este gasto de la O.C.'];
  }

  private shouldDeleteExpenseFromPurchaseOrder(
    expense: PurchaseOrderExpense,
  ): boolean {
    return (
      expense.originType === 'purchase_order' &&
      expense.sourceModule === 'purchase_orders' &&
      Number(expense.sourceRecordId) === Number(this.order.id) &&
      !expense.hasXml
    );
  }

  private getExpenseRemoveActionLabel(
    expense: PurchaseOrderExpense,
  ): string {
    return this.shouldDeleteExpenseFromPurchaseOrder(expense)
      ? 'Eliminar gasto relacionado'
      : 'Quitar relación con gasto/XML';
  }

  private getExpenseRemoveConfirmTitle(
    expense: PurchaseOrderExpense,
  ): string {
    return this.shouldDeleteExpenseFromPurchaseOrder(expense)
      ? 'Eliminar gasto relacionado'
      : 'Quitar relación';
  }

  private getExpenseRemoveConfirmText(
    expense: PurchaseOrderExpense,
  ): string {
    return this.shouldDeleteExpenseFromPurchaseOrder(expense)
      ? 'Eliminar gasto'
      : 'Quitar relación';
  }

  private getExpenseRemoveReason(
    expense: PurchaseOrderExpense,
  ): string {
    return this.shouldDeleteExpenseFromPurchaseOrder(expense)
      ? 'Gasto relacionado eliminado desde el detalle de Orden de Compra.'
      : 'Relación con gasto/XML quitada desde el detalle de Orden de Compra.';
  }

  private getExpenseRemoveConfirmMessage(
    expense: PurchaseOrderExpense,
  ): string {
    if (this.shouldDeleteExpenseFromPurchaseOrder(expense)) {
      const warehouseWarning = expense.hasWarehouseItems
        ? '\n\nSi este gasto de almacén ya tiene salidas o movimientos relacionados, el sistema bloqueará la eliminación.'
        : '';

      return (
        `¿Quieres eliminar el gasto "${expense.folio}" relacionado con la O.C. ${this.order.folio}?\n\n` +
        'El gasto se eliminará del módulo de Gastos y la foto seguirá conciliada con la O.C. para poder registrar nuevamente el gasto con el destino correcto.' +
        warehouseWarning
      );
    }

    return (
      `¿Quieres quitar la relación del gasto/XML "${expense.folio}" con la O.C. ${this.order.folio}?\n\n` +
      'El gasto seguirá existiendo en el módulo de Gastos. Esta acción solo quitará la relación con la Orden de Compra.'
    );
  }

  private isExpensePaidOrCompleted(expense: PurchaseOrderExpense): boolean {
    const paid = Number(expense?.paid ?? 0);
    const balance = Number(expense?.balance ?? 0);
    const statusLabel = String(expense?.statusLabel ?? '').trim().toLowerCase();
    const statusVariant = expense?.statusVariant ?? null;

    return (
      paid > 0 ||
      balance <= 0 ||
      statusLabel === 'pagado' ||
      statusVariant === 'success'
    );
  }

  private isPurchaseOrderPaymentCompleted(): boolean {
    return (
      this.expenses.length > 0 &&
      this.expenses.every((expense) => Number(expense.balance ?? 0) <= 0)
    );
  }

  shouldShowCancelPurchaseOrderButton(): boolean {
    if (!this.order.id) return false;

    if (this.order.status === 'cancelled') return false;

    if (this.isPurchaseOrderPaymentCompleted()) return false;

    return true;
  }

  unlinkExpense(expense: PurchaseOrderExpense): void {
    if (!this.canUnlinkExpense(expense) || !this.order.id) return;

    this.dialogService
      .confirm({
        size: 'mini',
        title: this.getExpenseRemoveConfirmTitle(expense),
        message: this.getExpenseRemoveConfirmMessage(expense),
        confirmText: this.getExpenseRemoveConfirmText(expense),
        cancelText: 'Cancelar',
      })
      .subscribe((confirmed) => {
        if (!confirmed || !this.order.id) return;

        this.unlinkingExpenseLinkId = expense.linkId;

        this.purchaseOrdersService
          .unlinkExpenseFromPurchaseOrder(this.order.id, expense.linkId, {
            reason: this.getExpenseRemoveReason(expense),
          })
          .pipe(
            finalize(() => {
              this.unlinkingExpenseLinkId = null;
            }),
          )
          .subscribe({
            next: () => {
              this.reloadCurrentDetail();
            },
            error: (err) => {
              console.error('Error al quitar/eliminar gasto relacionado:', err);

              this.showErrorDialog(
                this.getHttpErrorMessage(
                  err,
                  'No se pudo quitar o eliminar el gasto relacionado.',
                ),
              );
            },
          });
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
    this.location.back();
  }

  canCancelPurchaseOrder(): boolean {
    if (!this.order.id) return false;

    if (this.cancellingOrder) return false;

    if (this.order.status === 'cancelled') return false;

    const hasExpenses = this.expenses.length > 0;

    const hasReconciledPhotos = this.photos.some(
      (photo) => photo.status === 'reconciled',
    );

    if (hasExpenses || hasReconciledPhotos) return false;

    if (this.order.status === 'authorized') {
      return this.isAdminGeneral();
    }

    return (
      this.order.status === 'in_review' ||
      this.order.status === 'not_authorized'
    );
  }

  getCancelPurchaseOrderTooltip(): string {
    if (!this.order.id) {
      return 'Orden de compra no disponible.';
    }

    if (this.order.status === 'cancelled') {
      return 'La O.C. ya está cancelada.';
    }

    if (this.expenses.length > 0) {
      return 'Para cancelar esta O.C., primero quita o elimina los gastos relacionados.';
    }

    const hasReconciledPhotos = this.photos.some(
      (photo) => photo.status === 'reconciled',
    );

    if (hasReconciledPhotos) {
      return 'Para cancelar esta O.C., primero desconcilia las fotos relacionadas.';
    }

    if (this.order.status === 'authorized' && !this.isAdminGeneral()) {
      return 'Solo un administrador puede cancelar una O.C. autorizada.';
    }

    if (this.order.status === 'authorized' && this.isAdminGeneral()) {
      return 'Cancelar O.C. autorizada como corrección administrativa.';
    }

    return 'Cancelar orden de compra.';
  }

  cancelPurchaseOrder(): void {
    if (!this.canCancelPurchaseOrder() || !this.order.id) return;

    const isAdministrativeCancel = this.order.status === 'authorized';

    const message = isAdministrativeCancel
      ? `¿Quieres cancelar la O.C. ${this.order.folio}?\n\n` +
      'Esta O.C. ya está autorizada. La cancelación se registrará como una corrección administrativa.\n\n' +
      'Solo debe hacerse si la O.C. fue creada o autorizada por error.'
      : `¿Quieres cancelar la O.C. ${this.order.folio}?\n\n` +
      'La orden quedará cancelada y ya no podrá continuar el flujo de compra.';

    this.dialogService
      .confirm({
        size: 'mini',
        title: 'Cancelar O.C.',
        message,
        confirmText: 'Cancelar O.C.',
        cancelText: 'Volver',
      })
      .subscribe((confirmed) => {
        if (!confirmed || !this.order.id) return;

        this.cancellingOrder = true;

        this.purchaseOrdersService
          .cancelPurchaseOrder(this.order.id, {
            reason: isAdministrativeCancel
              ? 'Cancelación administrativa realizada desde el detalle de Orden de Compra.'
              : 'Cancelación realizada desde el detalle de Orden de Compra.',
          })
          .pipe(
            finalize(() => {
              this.cancellingOrder = false;
            }),
          )
          .subscribe({
            next: () => {
              this.reloadCurrentDetail();
            },
            error: (err) => {
              console.error('Error al cancelar O.C.:', err);

              this.showErrorDialog(
                this.getHttpErrorMessage(
                  err,
                  'No se pudo cancelar la orden de compra.',
                ),
              );
            },
          });
      });
  }

  private isAdminGeneral(): boolean {
    return this.permissionsService.hasAnyRole(['ADMIN_GENERAL']);
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

  private reloadCurrentDetail(): void {
    if (!this.order.id) return;

    this.loadDetail(this.order.id);
  }

  private showErrorDialog(message: string): void {
    this.dialogService
      .confirm({
        title: 'Error',
        message,
        confirmText: 'OK',
        cancelText: '',
      })
      .subscribe();
  }

  private getHttpErrorMessage(err: any, fallback: string): string {
    const rawMessage = err?.error?.message ?? err?.message ?? fallback;

    if (Array.isArray(rawMessage)) {
      return rawMessage.join('\n');
    }

    return String(rawMessage || fallback);
  }

  private setDetailData(detail: PurchaseOrderFlowDetailResponse): void {
    const expenseLinks = detail.expense_links ?? [];

    this.photos = (detail.ticket_photos ?? [])
      .map((photo) => this.mapPhoto(photo, expenseLinks))
      .sort((a, b) => {
        const aCanRegister = a.status === 'reconciled' && !a.hasExpense;
        const bCanRegister = b.status === 'reconciled' && !b.hasExpense;

        if (aCanRegister !== bCanRegister) {
          return aCanRegister ? -1 : 1;
        }

        if (a.hasExpense !== b.hasExpense) {
          return a.hasExpense ? 1 : -1;
        }

        return 0;
      });

    this.expenses = expenseLinks.map((link) =>
      this.mapExpenseLink(link),
    );

    this.order = this.mapOrder(detail);
    this.paymentSummary = this.buildPaymentSummary(detail);

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

    const reconciledPhotos = this.photos.filter(
      (photo) => photo.status === 'reconciled',
    );

    const reconciledPhotosCount = reconciledPhotos.length;

    const photosWithExpenseCount = this.photos.filter(
      (photo) => photo.hasExpense,
    ).length;

    const hasReconciledPhoto = reconciledPhotosCount > 0;

    const hasExpenses =
      this.expenses.length > 0 || Number(detail.expense_links_count ?? 0) > 0;

    const allReconciledPhotosHaveExpense =
      hasReconciledPhoto &&
      photosWithExpenseCount >= reconciledPhotosCount;

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
    const reconciledPhoto = reconciledPhotos[0];

    const photoStepLabel =
      this.photos.length > 1 ? 'Fotos subidas' : 'Foto subida';

    const reconciledStepLabel =
      reconciledPhotosCount > 1 ? 'Fotos conciliadas' : 'Foto conciliada';

    const reconciledStepDate =
      reconciledPhotosCount > 1
        ? `${reconciledPhotosCount} fotos`
        : hasReconciledPhoto
          ? reconciledPhoto?.reconciledAt ?? 'Conciliada'
          : 'Pendiente';

    const expenseStepLabel =
      reconciledPhotosCount > 1 ? 'Gastos registrados' : 'Gasto registrado';

    const expenseStepDate =
      hasExpenses && reconciledPhotosCount > 1
        ? `${photosWithExpenseCount} de ${reconciledPhotosCount}`
        : hasExpenses
          ? 'Registrado'
          : 'Pendiente';

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
        label: photoStepLabel,
        date:
          this.photos.length > 1
            ? `${this.photos.length} fotos`
            : firstPhoto?.uploadedAt ?? 'Pendiente',
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
        label: reconciledStepLabel,
        date: reconciledStepDate,
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
        label: expenseStepLabel,
        date: expenseStepDate,
        icon: 'receipt_long',
        status: allReconciledPhotosHaveExpense
          ? 'done'
          : hasExpenses || hasReconciledPhoto
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

    const reconciledAtRaw =
      photo.reconciled_at ??
      photo.reconciledAt ??
      null;

    const linkedExpense = this.getLinkedExpenseForPhoto(photoId, expenseLinks);

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
      reconciledAt: reconciledAtRaw
        ? this.formatDateTime(reconciledAtRaw)
        : null,
      previewUrl: null,
      hasExpense: !!linkedExpense,

      linkedExpenseId: linkedExpense?.id ?? null,
      linkedExpenseFolio: linkedExpense?.folio ?? null,
      linkedExpenseTotal: linkedExpense?.total ?? null,
      linkedExpensePaid: linkedExpense?.paid ?? null,
      linkedExpenseBalance: linkedExpense?.balance ?? null,
      linkedExpenseStatusLabel: linkedExpense?.statusLabel ?? null,
      linkedExpenseStatusVariant: linkedExpense?.statusVariant ?? null,
    };
  }

  private getLinkedExpenseForPhoto(
    photoId: number,
    expenseLinks: any[],
  ): PurchaseOrderExpense | null {
    if (!photoId || !Array.isArray(expenseLinks)) return null;

    const link = expenseLinks.find((item) => {
      const linkedPhotoId =
        item.ticket_photo_id ??
        item.ticketPhoto?.id ??
        item.ticket_photo?.id ??
        null;

      return Number(linkedPhotoId) === Number(photoId);
    });

    return link ? this.mapExpenseLink(link) : null;
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

    this.dialogService.open(
      ModalSeePhoto,
      this.mapPhotoToModalRow(photo),
      'medium',
    );
  }

  private mapPhotoToModalRow(photo: PurchaseOrderPhoto): PendingTicketPhotoRow {
    return {
      id: photo.id,
      file_name: photo.fileName,
      project_id: this.order.id ?? null,
      project_name: this.order.project || 'Sin proyecto',
      uploaded_by_name: photo.uploadedBy,
      status: photo.status,
      status_label: photo.statusLabel,
      created_at: photo.uploadedAt,
      created_at_date: photo.uploadedAt,
      preview_url: photo.previewUrl,
      public_url: photo.previewUrl,
    } as PendingTicketPhotoRow;
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

    const linkId = Number(
      link.id ??
      link.expense_link_id ??
      0,
    );

    const expenseId = Number(
      expense.id ??
      link.expense_id ??
      0,
    );

    const total = Number(
      link.amount_snapshot ??
      expense.total_amount ??
      expense.total ??
      expense.amount ??
      0,
    );

    const items = Array.isArray(expense.items) ? expense.items : [];

    const paid = Number(
      expense.paid_amount ??
      expense.total_paid ??
      expense.payment_amount ??
      this.getPaidFromExpenseItems(items) ??
      0,
    );

    const balance = Math.max(total - paid, 0);

    const ticketPhoto =
      link.ticket_photo ??
      link.ticketPhoto ??
      null;

    const ticketPhotoId = Number(
      link.ticket_photo_id ??
      ticketPhoto?.id ??
      0,
    );

    const registrationType =
      link.registration_type ??
      link.registrationType ??
      null;

    const cfdiUuid =
      expense.cfdi_uuid ??
      expense.cfdiUuid ??
      null;

    const originType =
      expense.origin_type ??
      expense.originType ??
      null;

    const sourceModule =
      expense.source_module ??
      expense.sourceModule ??
      null;

    const rawSourceRecordId =
      expense.source_record_id ??
      expense.sourceRecordId ??
      null;

    const parsedSourceRecordId =
      rawSourceRecordId !== null && rawSourceRecordId !== undefined
        ? Number(rawSourceRecordId)
        : null;

    const sourceRecordId =
      parsedSourceRecordId !== null && Number.isFinite(parsedSourceRecordId)
        ? parsedSourceRecordId
        : null;

    const hasWarehouseItems = items.some((item: any) => {
      const itemType = String(
        item.item_type ??
        item.itemType ??
        '',
      ).trim();

      return itemType === 'warehouse';
    });

    const hasXml = !!String(cfdiUuid ?? '').trim();

    return {
      id: expenseId,
      linkId,
      folio:
        expense.internal_folio ??
        expense.folio ??
        link.expense_folio ??
        `Gasto #${expenseId || ''}`,
      type:
        link.registration_type_label ??
        this.getRegistrationTypeLabel(registrationType) ??
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

      ticketPhotoId: ticketPhotoId > 0 ? ticketPhotoId : null,
      ticketFileName:
        ticketPhoto?.file_name ??
        ticketPhoto?.fileName ??
        null,

      registrationType,
      cfdiUuid,
      originType,
      sourceModule,
      sourceRecordId,

      hasXml,
      hasWarehouseItems,
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

    const reconciledPhotosCount = this.photos.filter(
      (photo) => photo.status === 'reconciled',
    ).length;

    const photosWithExpenseCount = this.photos.filter(
      (photo) => photo.hasExpense,
    ).length;

    const hasReconciledPhoto = reconciledPhotosCount > 0;

    const hasExpenses =
      this.expenses.length > 0 || Number(detail.expense_links_count ?? 0) > 0;

    if (detail.status === 'authorized' && !hasPhotos) {
      return 'Autorizada sin foto';
    }

    if (hasPhotos && !hasReconciledPhoto) {
      return 'Foto pendiente de conciliar';
    }

    if (hasReconciledPhoto && !hasExpenses) {
      return reconciledPhotosCount > 1
        ? 'Fotos conciliadas sin gasto'
        : 'Foto conciliada sin gasto';
    }

    if (hasExpenses) {
      if (reconciledPhotosCount > 1) {
        return photosWithExpenseCount >= reconciledPhotosCount
          ? 'Gastos registrados'
          : `Gastos ${photosWithExpenseCount} de ${reconciledPhotosCount}`;
      }

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

  private buildPaymentSummary(
    detail: PurchaseOrderFlowDetailResponse,
  ): PurchaseOrderPaymentSummary {
    const photosCount = this.photos.length;

    const reconciledPhotos = this.photos.filter(
      (photo) => photo.status === 'reconciled',
    );

    const photosWithExpense = this.photos.filter((photo) => photo.hasExpense);

    const totalRegistered = this.expenses.reduce((total, expense) => {
      return total + Number(expense.total ?? 0);
    }, 0);

    const totalPaid = this.expenses.reduce((total, expense) => {
      return total + Number(expense.paid ?? 0);
    }, 0);

    const totalBalance = this.expenses.reduce((total, expense) => {
      return total + Number(expense.balance ?? 0);
    }, 0);

    const requestedAmount = Number(detail.requested_amount ?? 0);

    const hasExpenses = this.expenses.length > 0;
    const hasRequestedAmount = requestedAmount > 0;

    const requestedDifference =
      hasExpenses && hasRequestedAmount
        ? Number((totalRegistered - requestedAmount).toFixed(2))
        : 0;

    const exceedsRequested = requestedDifference > 0.01;
    const isUnderRequested = requestedDifference < -0.01;

    const requestedDifferenceDisplay = Number(
      Math.abs(requestedDifference).toFixed(2),
    );

    const requestedDifferenceLabel = exceedsRequested
      ? 'Excedente vs solicitado'
      : isUnderRequested
        ? 'Sobrante vs solicitado'
        : 'Diferencia vs solicitado';

    const requestedDifferenceIcon = exceedsRequested
      ? 'warning'
      : isUnderRequested
        ? 'savings'
        : 'compare_arrows';

    return {
      photosCount,
      reconciledPhotosCount: reconciledPhotos.length,
      expensesCount: this.expenses.length,
      photosWithExpenseCount: photosWithExpense.length,
      pendingExpensePhotosCount: Math.max(
        reconciledPhotos.length - photosWithExpense.length,
        0,
      ),

      totalRegistered: Number(totalRegistered.toFixed(2)),
      totalPaid: Number(totalPaid.toFixed(2)),
      totalBalance: Number(totalBalance.toFixed(2)),

      requestedAmount,
      requestedDifference,
      requestedDifferenceDisplay,
      requestedDifferenceLabel,
      requestedDifferenceIcon,

      exceedsRequested,
      isUnderRequested,
      hasExpenses,
    };
  }

  private getEmptyPaymentSummary(): PurchaseOrderPaymentSummary {
    return {
      photosCount: 0,
      reconciledPhotosCount: 0,
      expensesCount: 0,
      photosWithExpenseCount: 0,
      pendingExpensePhotosCount: 0,

      totalRegistered: 0,
      totalPaid: 0,
      totalBalance: 0,

      requestedAmount: 0,
      requestedDifference: 0,
      requestedDifferenceDisplay: 0,
      requestedDifferenceLabel: 'Diferencia vs solicitado',
      requestedDifferenceIcon: 'compare_arrows',

      exceedsRequested: false,
      isUnderRequested: false,
      hasExpenses: false,
    };
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