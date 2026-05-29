import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';

type DetailStatusVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'primary';

type FlowStepStatus = 'done' | 'current' | 'pending' | 'blocked';

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
  statusLabel: string;
  statusVariant: DetailStatusVariant;
  uploadedBy: string;
  uploadedAt: string;
  previewUrl: string;
}

interface PurchaseOrderExpense {
  id: number;
  folio: string;
  type: string;
  total: number;
  paid: number;
  balance: number;
  statusLabel: string;
  statusVariant: DetailStatusVariant;
}

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

const HEADER_CONFIG: ModuleHeaderConfig = {
  formFull: true,
};

@Component({
  selector: 'app-purchase-order-details',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    ModuleHeader,
  ],
  templateUrl: './purchase-order-details.html',
  styleUrl: './purchase-order-details.scss',
})
export class PurchaseOrderDetails {
  private readonly router = inject(Router);

  readonly pageTitle = 'Detalle de orden de compra';
  readonly headerConfig = HEADER_CONFIG;

  readonly order = {
    id: 10,
    folio: 'OC-290526-1',
    project: 'Expansión isla',
    status: 'authorized',
    statusLabel: 'Autorizada',
    flowLabel: 'Gasto registrado',
    paymentStatusLabel: 'Con saldo',
    destinationLabel: 'Almacén',
    invoiceLabel: 'Con factura',
    requestedAmount: 1000,
    concept:
      'Compra de material eléctrico para instalación de luminarias en isla central, incluye cableado, conectores y accesorios menores.',
    notes:
      'La entrega se realizará el 30/05/2026 en almacén general. Factura a nombre de MUDECPLAY SA de CV.',
    requester: 'Goku',
    createdBy: 'Admin General',
    authorizedBy: 'Goku',
    authorizationRegisteredBy: 'Admin General',
    authorizedAt: '29/05/2026 10:45 a.m.',
  };

  readonly orderInfoItems: PurchaseOrderDetailInfoItem[] = [
    {
      label: 'Folio',
      value: this.order.folio,
    },
    {
      label: 'Estatus O.C.',
      value: this.order.statusLabel,
      chip: true,
      variant: 'success',
    },
    {
      label: 'Avance del flujo',
      value: this.order.flowLabel,
      chip: true,
      variant: 'info',
    },
    {
      label: 'Estado de pago',
      value: this.order.paymentStatusLabel,
      chip: true,
      variant: 'warning',
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
      variant: 'success',
    },
    {
      label: 'Monto solicitado',
      value: this.formatMoney(this.order.requestedAmount),
    },
  ];

  readonly authorizationInfoItems: PurchaseOrderDetailInfoItem[] = [
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
      variant: 'success',
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

  readonly flowSteps: PurchaseOrderFlowStep[] = [
    {
      label: 'O.C. creada',
      date: '29/05/2026 09:15',
      icon: 'description',
      status: 'done',
    },
    {
      label: 'O.C. autorizada',
      date: '29/05/2026 10:45',
      icon: 'verified',
      status: 'done',
    },
    {
      label: 'Foto subida',
      date: '29/05/2026 12:10',
      icon: 'photo_camera',
      status: 'done',
    },
    {
      label: 'Foto conciliada',
      date: '29/05/2026 13:20',
      icon: 'fact_check',
      status: 'done',
    },
    {
      label: 'Gasto registrado',
      date: '29/05/2026 14:05',
      icon: 'receipt_long',
      status: 'current',
    },
    {
      label: 'Pago completado',
      date: 'Pendiente',
      icon: 'paid',
      status: 'pending',
    },
  ];

  readonly photos: PurchaseOrderPhoto[] = [
    {
      id: 1,
      fileName: 'ticket_290526_1210.jpg',
      statusLabel: 'Foto conciliada',
      statusVariant: 'success',
      uploadedBy: 'Admin General',
      uploadedAt: '29/05/2026 12:10 p.m.',
      previewUrl:
        'https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=500&auto=format&fit=crop',
    },
  ];

  readonly expenses: PurchaseOrderExpense[] = [
    {
      id: 1,
      folio: 'G-290526-1',
      type: 'Directo',
      total: 1000,
      paid: 600,
      balance: 400,
      statusLabel: 'Parcial',
      statusVariant: 'warning',
    },
    {
      id: 2,
      folio: 'G-290526-2',
      type: 'Complementario',
      total: 120,
      paid: 120,
      balance: 0,
      statusLabel: 'Pagado',
      statusVariant: 'success',
    },
  ];

  readonly history: PurchaseOrderHistoryItem[] = [
    {
      id: 1,
      title: 'Orden creada',
      user: 'Admin General',
      tag: 'Sistema',
      tagVariant: 'info',
      date: '29/05/2026 09:15 a.m.',
      description: 'Se creó la orden de compra OC-290526-1.',
      icon: 'description',
    },
    {
      id: 2,
      title: 'Orden autorizada',
      user: 'Goku',
      tag: 'Autorización',
      tagVariant: 'success',
      date: '29/05/2026 10:45 a.m.',
      description: 'La orden de compra fue autorizada por teléfono.',
      icon: 'verified',
    },
    {
      id: 3,
      title: 'Foto conciliada',
      user: 'Admin General',
      tag: 'Conciliación',
      tagVariant: 'info',
      date: '29/05/2026 01:20 p.m.',
      description: 'La foto del ticket fue conciliada correctamente con la O.C.',
      icon: 'fact_check',
    },
    {
      id: 4,
      title: 'Gasto registrado',
      user: 'Admin General',
      tag: 'Gasto',
      tagVariant: 'primary',
      date: '29/05/2026 02:05 p.m.',
      description: 'Se registró el gasto relacionado G-290526-1.',
      icon: 'receipt_long',
    },
  ];

  onHeaderAction(action: string): void {
    if (action === 'back') {
      this.goBack();
    }
  }

  goBack(): void {
    this.router.navigateByUrl('/ordenes-compra');
  }

  formatMoney(value: number | string | null | undefined): string {
    const amount = Number(value ?? 0);

    return amount.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
    });
  }

  getChipClass(variant?: DetailStatusVariant): string {
    return `purchase-order-detail-chip--${variant ?? 'neutral'}`;
  }

  getFlowStepClass(step: PurchaseOrderFlowStep): string {
    return `purchase-order-flow-step--${step.status}`;
  }

  getHistoryIconClass(item: PurchaseOrderHistoryItem): string {
    return `purchase-order-history-item--${item.tagVariant}`;
  }
}